'use client';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UserMinus,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Check,
  User,
  Calendar,
  Users,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import SimpleTable from '@/components/common/SimpleTable';
import Input from '@/components/ui/Input';
import RadioGroup from '@/components/ui/RadioGroup';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';
import {
  getStaff,
  getStaffMembers,
  reassignMembers,
  confirmResignation,
  scheduleResignation,
  type Staff,
} from '@/api/endpoints/staff';

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface MemberRow {
  id: number;
  name: string;
  phone: string;
  hasPtRemaining: boolean;
  ownerStaffId: number;   // 원 담당 직원 ID (다중 퇴사 대상 구분용)
  assignedStaffId: number | null;
}

interface FutureSchedule {
  id: number;
  title: string;
  date: string;
  type: 'PT' | 'GX';
}

type ScheduleAction = 'transfer' | 'cancel';

// 퇴사 대상 직원별 입력값 (공통값 + 개별 override)
interface TargetEntry {
  staffId: number;
  staff: Staff;
  resignDate: string;   // 비어 있으면 공통값 사용
  resignReason: string; // 비어 있으면 공통값 사용
}

// ── 스텝 인디케이터 ──────────────────────────────────────────────────────────

const STEPS = ['직원·퇴사 정보', '담당 회원 재배정', '스케줄 확인', '최종 확인'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-xl">
      {STEPS.map((label, idx) => {
        const step = idx + 1;
        const isDone = step < current;
        const isActive = step === current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-xs min-w-[80px]">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all', isDone && 'bg-primary text-white', isActive && 'bg-primary text-white ring-4 ring-primary/20', !isDone && !isActive && 'bg-surface-secondary border border-line text-content-secondary')}>
                {isDone ? <Check size={14} /> : step}
              </div>
              <span className={cn('text-[11px] text-center whitespace-nowrap', isActive ? 'text-primary font-semibold' : 'text-content-secondary')}>{label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn('h-[2px] w-12 mb-5 transition-all', step < current ? 'bg-primary' : 'bg-line')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

function StaffResignation() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams?.get('staffId') ?? null;

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: 다중 선택 직원
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(preselectedId ? [Number(preselectedId)] : []);
  const [targets, setTargets] = useState<TargetEntry[]>([]);
  const [commonResignDate, setCommonResignDate] = useState('');
  const [commonResignReason, setCommonResignReason] = useState('');
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // Step 2: 담당 회원 재배정 (다중 FC 대상의 회원 통합)
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [activeFcList, setActiveFcList] = useState<Staff[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [bulkStaffId, setBulkStaffId] = useState<number | null>(null);

  // Step 3
  const [futureSchedules] = useState<FutureSchedule[]>([]);
  const [scheduleAction, setScheduleAction] = useState<ScheduleAction>('transfer');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 초기 데이터 로드 ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStaffList = async () => {
      const res = await getStaff({ size: 100 });
      if (res.success) setStaffList(res.data.data);
    };
    fetchStaffList();
  }, []);

  // 선택 직원 변경 시 targets 동기화 (기존 override 유지)
  useEffect(() => {
    setTargets(prev => selectedIds.map(id => {
      const existing = prev.find(t => t.staffId === id);
      if (existing) return existing;
      const staff = staffList.find(s => s.id === id);
      return staff ? { staffId: id, staff, resignDate: '', resignReason: '' } : null;
    }).filter(Boolean) as TargetEntry[]);
  }, [selectedIds, staffList]);

  // 선택된 FC 대상 직원 목록
  const fcTargets = targets.filter(t => t.staff.role === 'FC');
  const hasFcTarget = fcTargets.length > 0;

  // ── Step 2: 담당 회원 + 활성 FC 로드 (다중 FC 통합) ─────────────────────────
  const loadStep2Data = async () => {
    if (fcTargets.length === 0) return;
    setMembersLoading(true);
    const [membersResults, fcRes] = await Promise.all([
      Promise.all(fcTargets.map(t => getStaffMembers(t.staffId).then(r => ({ staffId: t.staffId, r })))),
      getStaff({ size: 100, role: 'FC' }),
    ]);
    const allMembers: MemberRow[] = [];
    membersResults.forEach(({ staffId, r }) => {
      if (r.success) r.data.forEach(m => allMembers.push({ ...m, ownerStaffId: staffId, assignedStaffId: null }));
    });
    setMembers(allMembers);
    if (fcRes.success) {
      // 퇴사 대상 직원 전체 제외
      setActiveFcList(fcRes.data.data.filter(s => !selectedIds.includes(s.id)));
    }
    setMembersLoading(false);
  };

  // ── 헬퍼 ────────────────────────────────────────────────────────────────────
  const unassignedPtCount = members.filter(m => m.hasPtRemaining && m.assignedStaffId === null).length;

  const applyBulkAssign = () => {
    if (!bulkStaffId) return;
    setMembers(prev => prev.map(m => m.assignedStaffId === null ? { ...m, assignedStaffId: bulkStaffId } : m));
  };

  const handleMemberAssign = (memberId: number, staffId: number | null) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, assignedStaffId: staffId } : m));
  };

  const toggleStaff = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    if (step1Errors.staff) setStep1Errors(p => ({ ...p, staff: '' }));
  };

  const updateTargetOverride = (staffId: number, field: 'resignDate' | 'resignReason', value: string) => {
    setTargets(prev => prev.map(t => t.staffId === staffId ? { ...t, [field]: value } : t));
  };

  const resolveDate = (t: TargetEntry) => t.resignDate || commonResignDate;
  const resolveReason = (t: TargetEntry) => t.resignReason || commonResignReason;

  // ── 스텝 이동 ────────────────────────────────────────────────────────────────
  const handleStep1Next = () => {
    const errors: Record<string, string> = {};
    if (selectedIds.length === 0) errors.staff = '퇴사 처리할 직원을 1명 이상 선택하세요.';
    if (!commonResignDate && targets.some(t => !t.resignDate)) errors.resignDate = '공통 퇴사 예정일 또는 직원별 퇴사일을 입력하세요.';
    if (Object.keys(errors).length > 0) { setStep1Errors(errors); return; }
    setStep1Errors({});

    if (hasFcTarget) {
      loadStep2Data();
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };

  const handleStep2Next = () => {
    if (unassignedPtCount > 0) {
      toast.warning(`PT 잔여 회원 ${unassignedPtCount}명의 재배정 담당자를 지정해주세요.`);
      return;
    }
    setCurrentStep(3);
  };

  const handleStep3Next = () => setCurrentStep(4);

  const handleBack = () => {
    if (currentStep === 3 && !hasFcTarget) setCurrentStep(1);
    else setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // ── 최종 제출 (직원별 순차 처리) ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const succeeded: string[] = [];
    const failed: string[] = [];

    try {
      // 1. 담당 회원 재배정 (FC 통합 배정 내역)
      if (hasFcTarget && members.length > 0) {
        const assignments = members
          .filter(m => m.assignedStaffId !== null)
          .map(m => ({ memberId: m.id, newStaffId: m.assignedStaffId! }));
        if (assignments.length > 0) {
          const reassignRes = await reassignMembers({ assignments });
          if (!reassignRes.success) {
            toast.error('담당 회원 재배정 실패: ' + reassignRes.message);
            setIsSubmitting(false);
            return;
          }
        }
      }

      // 2. 직원별 퇴사 처리
      for (const t of targets) {
        const date = resolveDate(t);
        const reason = resolveReason(t);
        const isImmediate = date <= today;
        const res = isImmediate
          ? await confirmResignation(t.staffId)
          : await scheduleResignation(t.staffId, {
              resignScheduledAt: new Date(date).toISOString(),
              resignReason: reason || undefined,
            });
        if (res.success) succeeded.push(t.staff.name);
        else failed.push(`${t.staff.name}(${res.message})`);
      }

      if (succeeded.length > 0) toast.success(`${succeeded.length}명 퇴사 처리 완료: ${succeeded.join(', ')}`);
      if (failed.length > 0) {
        toast.error(`${failed.length}명 처리 실패: ${failed.join(', ')}`);
      } else {
        moveToPage(974);
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 렌더 ─────────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <PageHeader title="직원 퇴사 처리" description="1명 이상의 직원을 선택해 단계별로 퇴사 정보를 입력하고 처리합니다." />

      <div className="max-w-[900px] pb-xxl">
        <StepIndicator current={currentStep} />

        {/* ── Step 1: 대상 직원(다중) + 퇴사 정보 ── */}
        {currentStep === 1 && (
          <div className="space-y-lg">
            <div className="bg-surface border border-line rounded-card p-xl space-y-lg">
              <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                <User size={18} className="text-primary" /> 퇴사 대상 직원 선택
                <span className="text-Label text-content-secondary font-normal ml-xs">({selectedIds.length}명 선택)</span>
              </h3>

              {step1Errors.staff && <p className="text-Label text-error">{step1Errors.staff}</p>}

              {/* 직원 체크박스 목록 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-xs max-h-[260px] overflow-y-auto">
                {staffList.map(s => {
                  const checked = selectedIds.includes(s.id);
                  return (
                    <label key={s.id} className={cn('flex items-center gap-sm px-md py-sm rounded-input border cursor-pointer transition-all', checked ? 'border-primary bg-primary-light' : 'border-line bg-surface hover:bg-surface-secondary')}>
                      <input type="checkbox" checked={checked} onChange={() => toggleStaff(s.id)} className="w-4 h-4 accent-primary" />
                      <span className="text-Body-2 font-medium text-content">{s.name}</span>
                      <span className="text-[11px] bg-primary/10 text-primary px-xs py-[2px] rounded-full font-medium ml-auto">{s.role}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 퇴사 정보 (공통값) */}
            <div className="bg-surface border border-line rounded-card p-xl space-y-lg">
              <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                <Calendar size={18} className="text-primary" /> 공통 퇴사 정보
              </h3>
              <div className="space-y-xs">
                <label className="text-Label font-semibold text-content-secondary">공통 퇴사 예정일</label>
                <Input
                  type="date"
                  value={commonResignDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => { setCommonResignDate(e.target.value); if (step1Errors.resignDate) setStep1Errors(p => ({ ...p, resignDate: '' })); }}
                  error={step1Errors.resignDate}
                />
              </div>
              <div className="space-y-xs">
                <label className="text-Label font-semibold text-content-secondary">공통 퇴사 사유 <span className="text-content-secondary font-normal">(선택)</span></label>
                <Textarea value={commonResignReason} onChange={(e) => setCommonResignReason(e.target.value)} placeholder="퇴사 사유를 입력하세요 (개인 사정, 계약 만료 등)" rows={2} />
                <p className="text-[11px] text-content-secondary">오늘 날짜로 처리하면 해당 직원의 상태와 로그인 계정이 즉시 비활성화됩니다.</p>
              </div>
            </div>

            {/* 직원별 override */}
            {targets.length > 0 && (
              <div className="bg-surface border border-line rounded-card p-xl space-y-md">
                <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                  <Users size={18} className="text-primary" /> 직원별 개별 설정
                  <span className="text-Label text-content-secondary font-normal ml-xs">(미입력 시 공통값 적용)</span>
                </h3>
                {targets.map(t => (
                  <div key={t.staffId} className="grid grid-cols-1 md:grid-cols-[140px_1fr_1.5fr] gap-md items-center border-b border-dashed border-line pb-md last:border-0">
                    <div className="flex items-center gap-xs">
                      <span className="text-Body-2 font-semibold text-content">{t.staff.name}</span>
                      <span className="text-[11px] bg-surface-secondary text-content-secondary px-xs py-[2px] rounded-full">{t.staff.role}</span>
                    </div>
                    <Input type="date" value={t.resignDate} min={new Date().toISOString().split('T')[0]} onChange={e => updateTargetOverride(t.staffId, 'resignDate', e.target.value)} placeholder="공통값" />
                    <Input value={t.resignReason} onChange={e => updateTargetOverride(t.staffId, 'resignReason', e.target.value)} placeholder="개별 사유 (선택)" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={handleStep1Next} className="flex items-center gap-xs px-xl py-md rounded-button bg-primary text-white hover:opacity-90 transition-all text-Label font-semibold shadow-sm">
                다음 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: 담당 회원 재배정 (FC 대상 통합) ── */}
        {currentStep === 2 && (
          <div className="space-y-lg">
            <div className="bg-surface border border-line rounded-card p-xl space-y-lg">
              <div className="flex items-center justify-between flex-wrap gap-sm">
                <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                  <Users size={18} className="text-primary" /> 담당 회원 재배정
                  <span className="text-Label text-content-secondary font-normal ml-xs">(FC {fcTargets.length}명 · 회원 {members.length}명)</span>
                </h3>
                {unassignedPtCount > 0 && (
                  <div className="flex items-center gap-xs text-Label text-warning bg-warning/10 border border-warning/20 px-sm py-xs rounded-input">
                    <AlertTriangle size={13} /> PT 잔여 {unassignedPtCount}명 미배정
                  </div>
                )}
              </div>

              <div className="bg-surface-secondary rounded-input p-md flex items-center gap-md flex-wrap">
                <span className="text-Label font-semibold text-content-secondary whitespace-nowrap">일괄 배정:</span>
                <div className="flex-1 min-w-[160px]">
                  <Select options={activeFcList.map(fc => ({ value: String(fc.id), label: fc.name }))} value={bulkStaffId !== null ? String(bulkStaffId) : ''} onChange={v => setBulkStaffId(v ? Number(v) : null)} placeholder="담당 FC 선택" />
                </div>
                <button onClick={applyBulkAssign} disabled={!bulkStaffId} className="px-md py-xs rounded-button bg-primary text-white text-Label font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">미배정 회원에 적용</button>
              </div>

              {membersLoading ? (
                <div className="py-xl text-center text-content-secondary text-Body-2">불러오는 중...</div>
              ) : members.length === 0 ? (
                <div className="py-xl text-center text-content-secondary text-Body-2">담당 회원이 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <SimpleTable
                    columns={[
                      { key: 'name', header: '회원명', render: (v: string) => <span className="text-content font-medium">{v}</span> },
                      { key: 'ownerStaffId', header: '기존 담당', render: (v: number) => <span className="text-content-secondary text-Label">{targets.find(t => t.staffId === v)?.staff.name ?? '-'}</span> },
                      { key: 'hasPtRemaining', header: 'PT 잔여', render: (v: boolean) => v ? <span className="text-[11px] bg-error/10 text-error border border-error/20 px-xs py-[2px] rounded-full font-semibold">PT잔여</span> : <span className="text-Label text-content-secondary">-</span> },
                      { key: 'assignedStaffId', header: '재배정 담당자', render: (_: unknown, m: MemberRow) => (
                        <Select options={activeFcList.map(fc => ({ value: String(fc.id), label: fc.name }))} value={m.assignedStaffId !== null ? String(m.assignedStaffId) : ''} onChange={v => handleMemberAssign(m.id, v ? Number(v) : null)} placeholder="담당자 선택" error={m.hasPtRemaining && m.assignedStaffId === null ? ' ' : undefined} />
                      )},
                    ]}
                    data={members}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={handleBack} className="flex items-center gap-xs px-xl py-md rounded-button border border-line bg-surface text-content-secondary hover:bg-surface-secondary transition-all text-Label font-medium">
                <ArrowLeft size={16} /> 이전
              </button>
              <button onClick={handleStep2Next} className="flex items-center gap-xs px-xl py-md rounded-button bg-primary text-white hover:opacity-90 transition-all text-Label font-semibold shadow-sm">
                다음 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: 미래 스케줄 확인 ── */}
        {currentStep === 3 && (
          <div className="space-y-lg">
            <div className="bg-surface border border-line rounded-card p-xl space-y-lg">
              <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                <ClipboardList size={18} className="text-primary" /> 미래 스케줄 확인
              </h3>
              {futureSchedules.length === 0 ? (
                <div className="py-xl flex flex-col items-center gap-sm text-content-secondary">
                  <Check size={32} className="text-success" />
                  <p className="text-Body-2">퇴사 예정일 이후 예정된 스케줄이 없습니다.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <SimpleTable
                      columns={[
                        { key: 'title', header: '스케줄명', render: (v: string) => <span className="text-content font-medium">{v}</span> },
                        { key: 'type', header: '유형', render: (v: 'PT' | 'GX') => <span className={cn('text-[11px] px-xs py-[2px] rounded-full font-semibold', v === 'PT' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success')}>{v}</span> },
                        { key: 'date', header: '날짜', render: (v: string) => <span className="text-content-secondary">{v}</span> },
                      ]}
                      data={futureSchedules}
                    />
                  </div>
                  <div className="space-y-sm">
                    <p className="text-Label font-semibold text-content-secondary">처리 방법</p>
                    <RadioGroup
                      options={[
                        { value: 'transfer', label: '후임에게 일괄 이관', description: '재배정된 담당자에게 스케줄을 이관합니다.' },
                        { value: 'cancel', label: '일괄 취소', description: '모든 스케줄을 취소합니다.' },
                      ]}
                      value={scheduleAction}
                      onChange={(v) => setScheduleAction(v as ScheduleAction)}
                      direction="vertical"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={handleBack} className="flex items-center gap-xs px-xl py-md rounded-button border border-line bg-surface text-content-secondary hover:bg-surface-secondary transition-all text-Label font-medium">
                <ArrowLeft size={16} /> 이전
              </button>
              <button onClick={handleStep3Next} className="flex items-center gap-xs px-xl py-md rounded-button bg-primary text-white hover:opacity-90 transition-all text-Label font-semibold shadow-sm">
                다음 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: 최종 확인 ── */}
        {currentStep === 4 && (
          <div className="space-y-lg">
            <div className="bg-surface border border-line rounded-card p-xl space-y-lg">
              <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                <UserMinus size={18} className="text-error" /> 최종 확인
              </h3>
              <div className="flex items-start gap-sm p-md bg-error/5 border border-error/20 rounded-input">
                <AlertTriangle size={16} className="text-error mt-[1px] flex-shrink-0" />
                <p className="text-Label text-error">퇴사 처리 후에는 수정이 어려울 수 있습니다. 아래 내용을 확인 후 진행하세요. 계정 비활성화·기존 로그인 종료·재로그인 차단이 적용됩니다.</p>
              </div>

              {/* 직원별 요약 */}
              <div className="bg-surface-secondary rounded-input p-lg space-y-sm">
                {targets.map(t => {
                  const date = resolveDate(t);
                  const today = new Date().toISOString().split('T')[0];
                  const immediate = date && date <= today;
                  return (
                    <div key={t.staffId} className="flex items-start gap-md flex-wrap border-b border-dashed border-line pb-sm last:border-0">
                      <span className="text-Body-2 font-semibold text-content w-[120px]">{t.staff.name} ({t.staff.role})</span>
                      <span className="text-Label text-content-secondary">퇴사일 {date ? new Date(date).toLocaleDateString('ko-KR') : '-'}</span>
                      <span className={cn('text-[11px] px-xs py-[2px] rounded-full font-semibold', immediate ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary')}>{immediate ? '즉시 퇴사' : '예약 퇴사'}</span>
                      <span className="text-Label text-content-secondary">{resolveReason(t) || '사유 미입력'}</span>
                    </div>
                  );
                })}
                {hasFcTarget && (
                  <div className="flex items-start gap-md pt-xs">
                    <span className="text-Label font-semibold text-content-secondary w-[120px]">담당 회원 재배정</span>
                    <span className="text-Body-2 text-content">{members.length}명 ({members.filter(m => m.assignedStaffId !== null).length}명 배정 완료)</span>
                  </div>
                )}
                <div className="flex items-start gap-md">
                  <span className="text-Label font-semibold text-content-secondary w-[120px]">미래 스케줄</span>
                  <span className="text-Body-2 text-content">{futureSchedules.length === 0 ? '예정된 스케줄 없음' : scheduleAction === 'transfer' ? `${futureSchedules.length}건 후임 이관` : `${futureSchedules.length}건 일괄 취소`}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={handleBack} className="flex items-center gap-xs px-xl py-md rounded-button border border-line bg-surface text-content-secondary hover:bg-surface-secondary transition-all text-Label font-medium">
                <ArrowLeft size={16} /> 이전
              </button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-xs px-xl py-md rounded-button bg-error text-white hover:opacity-90 transition-all text-Label font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <UserMinus size={16} /> {isSubmitting ? '처리 중...' : `${targets.length}명 퇴사 처리`}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function StaffResignationPage() {
  return (
    <Suspense>
      <StaffResignation />
    </Suspense>
  );
}
