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
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';
import {
  getStaff,
  getStaffById,
  getStaffMembers,
  reassignMembers,
  scheduleResignation,
  type Staff,
} from '@/api/endpoints/staff';

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface MemberRow {
  id: number;
  name: string;
  phone: string;
  hasPtRemaining: boolean;
  assignedStaffId: number | null; // null = 자동 균등배분
}

interface FutureSchedule {
  id: number;
  title: string;
  date: string;
  type: 'PT' | 'GX';
}

type ScheduleAction = 'transfer' | 'cancel';

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
            {/* 원 */}
            <div className="flex flex-col items-center gap-xs min-w-[80px]">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                  isDone && 'bg-primary text-white',
                  isActive && 'bg-primary text-white ring-4 ring-primary/20',
                  !isDone && !isActive && 'bg-surface-secondary border border-line text-content-secondary'
                )}
              >
                {isDone ? <Check size={14} /> : step}
              </div>
              <span
                className={cn(
                  'text-[11px] text-center whitespace-nowrap',
                  isActive ? 'text-primary font-semibold' : 'text-content-secondary'
                )}
              >
                {label}
              </span>
            </div>
            {/* 연결선 */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-[2px] w-12 mb-5 transition-all',
                  step < current ? 'bg-primary' : 'bg-line'
                )}
              />
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

  // Step 1 상태
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(
    preselectedId ? Number(preselectedId) : null
  );
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [resignDate, setResignDate] = useState('');
  const [resignReason, setResignReason] = useState('');
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // Step 2 상태
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [activeFcList, setActiveFcList] = useState<Staff[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [bulkStaffId, setBulkStaffId] = useState<number | null>(null); // 일괄 지정용

  // Step 3 상태
  const [futureSchedules] = useState<FutureSchedule[]>([]); // 실제 연동 시 API로 교체
  const [scheduleAction, setScheduleAction] = useState<ScheduleAction>('transfer');

  // 제출 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 초기 데이터 로드 ────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchStaffList = async () => {
      const res = await getStaff({ size: 100 });
      if (res.success) setStaffList(res.data.data);
    };
    fetchStaffList();
  }, []);

  // 직원 선택 시 상세 로드
  useEffect(() => {
    if (!selectedStaffId) { setSelectedStaff(null); return; }
    const fetchDetail = async () => {
      const res = await getStaffById(selectedStaffId);
      if (res.success) setSelectedStaff(res.data);
    };
    fetchDetail();
  }, [selectedStaffId]);

  // ── Step 2: 담당 회원 + 활성 FC 로드 ───────────────────────────────────────

  const loadStep2Data = async () => {
    if (!selectedStaff) return;
    setMembersLoading(true);
    const [membersRes, fcRes] = await Promise.all([
      getStaffMembers(selectedStaff.id),
      getStaff({ size: 100, role: 'FC' }),
    ]);
    if (membersRes.success) {
      setMembers(
        membersRes.data.map((m) => ({ ...m, assignedStaffId: null }))
      );
    }
    if (fcRes.success) {
      // 퇴사 대상 제외
      setActiveFcList(fcRes.data.data.filter((s) => s.id !== selectedStaff.id));
    }
    setMembersLoading(false);
  };

  // ── 헬퍼 ────────────────────────────────────────────────────────────────────

  const isFC = selectedStaff?.role === 'FC';

  // PT 잔여 회원 중 미배정 건수
  const unassignedPtCount = members.filter(
    (m) => m.hasPtRemaining && m.assignedStaffId === null
  ).length;

  const totalAssignedCount = members.length;

  // 일괄 배분 적용
  const applyBulkAssign = () => {
    if (!bulkStaffId) return;
    setMembers((prev) =>
      prev.map((m) =>
        m.assignedStaffId === null ? { ...m, assignedStaffId: bulkStaffId } : m
      )
    );
  };

  // 개별 배정 변경
  const handleMemberAssign = (memberId: number, staffId: number | null) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, assignedStaffId: staffId } : m))
    );
  };

  // ── 스텝 이동 ────────────────────────────────────────────────────────────────

  const handleStep1Next = () => {
    const errors: Record<string, string> = {};
    if (!selectedStaffId) errors.staff = '퇴사 처리할 직원을 선택하세요.';
    if (!resignDate) errors.resignDate = '퇴사 예정일을 입력하세요.';
    if (Object.keys(errors).length > 0) { setStep1Errors(errors); return; }
    setStep1Errors({});

    if (isFC) {
      loadStep2Data();
      setCurrentStep(2);
    } else {
      // FC가 아니면 Step 2 스킵
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

  const handleStep3Next = () => {
    setCurrentStep(4);
  };

  const handleBack = () => {
    if (currentStep === 3 && !isFC) {
      setCurrentStep(1);
    } else {
      setCurrentStep((prev) => Math.max(1, prev - 1));
    }
  };

  // ── 최종 제출 ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedStaffId || !resignDate) return;
    setIsSubmitting(true);

    try {
      // 1. 담당 회원 재배정 (FC이고 배정 내역이 있을 때)
      if (isFC && members.length > 0) {
        const assignments = members
          .filter((m) => m.assignedStaffId !== null)
          .map((m) => ({ memberId: m.id, newStaffId: m.assignedStaffId! }));

        if (assignments.length > 0) {
          const reassignRes = await reassignMembers({ assignments });
          if (!reassignRes.success) {
            toast.error('담당 회원 재배정 실패: ' + reassignRes.message);
            setIsSubmitting(false);
            return;
          }
        }
      }

      // 2. 퇴사 예정 등록
      const resignRes = await scheduleResignation(selectedStaffId, {
        resignScheduledAt: new Date(resignDate).toISOString(),
        resignReason: resignReason || undefined,
      });

      if (!resignRes.success) {
        toast.error('퇴사 예정 등록 실패: ' + resignRes.message);
        setIsSubmitting(false);
        return;
      }

      toast.success('퇴사 예정이 등록되었습니다.');
      moveToPage(974);
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 렌더 ─────────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <PageHeader
        title="직원 퇴사 처리"
        description="단계별로 퇴사 정보를 입력하고 처리합니다."
      />

      <div className="max-w-[860px] pb-xxl">
        <StepIndicator current={currentStep} />

        {/* ── Step 1: 대상 직원 + 퇴사 정보 ── */}
        {currentStep === 1 && (
          <div className="space-y-lg">
            <div className="bg-surface border border-line rounded-card p-xl space-y-lg">
              <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                <User size={18} className="text-primary" />
                퇴사 대상 직원 선택
              </h3>

              <div className="space-y-xs">
                <label className="text-Label font-semibold text-content-secondary">
                  직원 <span className="text-error">*</span>
                </label>
                <select
                  value={selectedStaffId ?? ''}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value ? Number(e.target.value) : null);
                    if (step1Errors.staff) setStep1Errors((p) => ({ ...p, staff: '' }));
                  }}
                  className={cn(
                    'w-full px-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all',
                    step1Errors.staff ? 'border-error' : 'border-line'
                  )}
                >
                  <option value="">직원을 선택하세요</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
                {step1Errors.staff && (
                  <p className="text-Label text-error">{step1Errors.staff}</p>
                )}
              </div>

              {/* 선택된 직원 카드 */}
              {selectedStaff && (
                <div className="bg-primary-light border border-primary/20 rounded-input p-md flex items-start gap-md">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-primary" />
                  </div>
                  <div className="space-y-xs flex-1">
                    <div className="flex items-center gap-sm flex-wrap">
                      <span className="text-Body-2 font-semibold text-content">
                        {selectedStaff.name}
                      </span>
                      <span className="text-[11px] bg-primary/10 text-primary px-xs py-[2px] rounded-full font-medium">
                        {selectedStaff.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-md text-Label text-content-secondary flex-wrap">
                      <span className="flex items-center gap-xs">
                        <Calendar size={12} />
                        입사일:{' '}
                        {selectedStaff.hireDate
                          ? new Date(selectedStaff.hireDate).toLocaleDateString('ko-KR')
                          : '정보 없음'}
                      </span>
                      {isFC && (
                        <span className="flex items-center gap-xs">
                          <Users size={12} />
                          담당 회원: {members.length > 0 ? `${members.length}명` : '조회 전'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 퇴사 정보 */}
            <div className="bg-surface border border-line rounded-card p-xl space-y-lg">
              <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                <Calendar size={18} className="text-primary" />
                퇴사 정보
              </h3>

              <div className="space-y-xs">
                <label className="text-Label font-semibold text-content-secondary">
                  퇴사 예정일 <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  value={resignDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setResignDate(e.target.value);
                    if (step1Errors.resignDate) setStep1Errors((p) => ({ ...p, resignDate: '' }));
                  }}
                  className={cn(
                    'w-full px-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all',
                    step1Errors.resignDate ? 'border-error' : 'border-line'
                  )}
                />
                {step1Errors.resignDate && (
                  <p className="text-Label text-error">{step1Errors.resignDate}</p>
                )}
              </div>

              <div className="space-y-xs">
                <label className="text-Label font-semibold text-content-secondary">
                  퇴사 사유 <span className="text-content-secondary font-normal">(선택)</span>
                </label>
                <textarea
                  value={resignReason}
                  onChange={(e) => setResignReason(e.target.value)}
                  placeholder="퇴사 사유를 입력하세요 (개인 사정, 계약 만료 등)"
                  rows={3}
                  className="w-full px-md py-md bg-surface-secondary border border-line rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleStep1Next}
                className="flex items-center gap-xs px-xl py-md rounded-button bg-primary text-white hover:opacity-90 transition-all text-Label font-semibold shadow-sm"
              >
                다음
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: 담당 회원 재배정 (FC만) ── */}
        {currentStep === 2 && (
          <div className="space-y-lg">
            <div className="bg-surface border border-line rounded-card p-xl space-y-lg">
              <div className="flex items-center justify-between flex-wrap gap-sm">
                <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                  <Users size={18} className="text-primary" />
                  담당 회원 재배정
                  <span className="text-Label text-content-secondary font-normal ml-xs">
                    (총 {members.length}명)
                  </span>
                </h3>
                {unassignedPtCount > 0 && (
                  <div className="flex items-center gap-xs text-Label text-warning bg-warning/10 border border-warning/20 px-sm py-xs rounded-input">
                    <AlertTriangle size={13} />
                    PT 잔여 {unassignedPtCount}명 미배정
                  </div>
                )}
              </div>

              {/* 일괄 배분 */}
              <div className="bg-surface-secondary rounded-input p-md flex items-center gap-md flex-wrap">
                <span className="text-Label font-semibold text-content-secondary whitespace-nowrap">
                  일괄 배정:
                </span>
                <select
                  value={bulkStaffId ?? ''}
                  onChange={(e) => setBulkStaffId(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 min-w-[160px] px-sm py-xs bg-surface border border-line rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="">담당 FC 선택</option>
                  {activeFcList.map((fc) => (
                    <option key={fc.id} value={fc.id}>
                      {fc.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={applyBulkAssign}
                  disabled={!bulkStaffId}
                  className="px-md py-xs rounded-button bg-primary text-white text-Label font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  미배정 회원에 적용
                </button>
              </div>

              {membersLoading ? (
                <div className="py-xl text-center text-content-secondary text-Body-2">
                  불러오는 중...
                </div>
              ) : members.length === 0 ? (
                <div className="py-xl text-center text-content-secondary text-Body-2">
                  담당 회원이 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-Body-2">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left py-sm px-md text-Label font-semibold text-content-secondary">
                          회원명
                        </th>
                        <th className="text-left py-sm px-md text-Label font-semibold text-content-secondary">
                          연락처
                        </th>
                        <th className="text-left py-sm px-md text-Label font-semibold text-content-secondary">
                          PT 잔여
                        </th>
                        <th className="text-left py-sm px-md text-Label font-semibold text-content-secondary">
                          재배정 담당자
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-line/50 hover:bg-surface-secondary transition-colors"
                        >
                          <td className="py-sm px-md text-content font-medium">{m.name}</td>
                          <td className="py-sm px-md text-content-secondary">{m.phone}</td>
                          <td className="py-sm px-md">
                            {m.hasPtRemaining ? (
                              <span className="text-[11px] bg-error/10 text-error border border-error/20 px-xs py-[2px] rounded-full font-semibold">
                                PT잔여
                              </span>
                            ) : (
                              <span className="text-Label text-content-secondary">-</span>
                            )}
                          </td>
                          <td className="py-sm px-md">
                            <select
                              value={m.assignedStaffId ?? ''}
                              onChange={(e) =>
                                handleMemberAssign(
                                  m.id,
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              className={cn(
                                'w-full px-sm py-xs border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all bg-surface',
                                m.hasPtRemaining && m.assignedStaffId === null
                                  ? 'border-error'
                                  : 'border-line'
                              )}
                            >
                              <option value="">담당자 선택</option>
                              {activeFcList.map((fc) => (
                                <option key={fc.id} value={fc.id}>
                                  {fc.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-xs px-xl py-md rounded-button border border-line bg-surface text-content-secondary hover:bg-surface-secondary transition-all text-Label font-medium"
              >
                <ArrowLeft size={16} />
                이전
              </button>
              <button
                onClick={handleStep2Next}
                className="flex items-center gap-xs px-xl py-md rounded-button bg-primary text-white hover:opacity-90 transition-all text-Label font-semibold shadow-sm"
              >
                다음
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: 미래 스케줄 확인 ── */}
        {currentStep === 3 && (
          <div className="space-y-lg">
            <div className="bg-surface border border-line rounded-card p-xl space-y-lg">
              <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                <ClipboardList size={18} className="text-primary" />
                미래 스케줄 확인
              </h3>

              {futureSchedules.length === 0 ? (
                <div className="py-xl flex flex-col items-center gap-sm text-content-secondary">
                  <Check size={32} className="text-success" />
                  <p className="text-Body-2">퇴사 예정일 이후 예정된 스케줄이 없습니다.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-Body-2">
                      <thead>
                        <tr className="border-b border-line">
                          <th className="text-left py-sm px-md text-Label font-semibold text-content-secondary">
                            스케줄명
                          </th>
                          <th className="text-left py-sm px-md text-Label font-semibold text-content-secondary">
                            유형
                          </th>
                          <th className="text-left py-sm px-md text-Label font-semibold text-content-secondary">
                            날짜
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {futureSchedules.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b border-line/50 hover:bg-surface-secondary transition-colors"
                          >
                            <td className="py-sm px-md text-content font-medium">{s.title}</td>
                            <td className="py-sm px-md">
                              <span
                                className={cn(
                                  'text-[11px] px-xs py-[2px] rounded-full font-semibold',
                                  s.type === 'PT'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-success/10 text-success'
                                )}
                              >
                                {s.type}
                              </span>
                            </td>
                            <td className="py-sm px-md text-content-secondary">{s.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 처리 옵션 */}
                  <div className="space-y-sm">
                    <p className="text-Label font-semibold text-content-secondary">처리 방법</p>
                    <div className="flex flex-col gap-sm">
                      {(
                        [
                          { value: 'transfer', label: '후임에게 일괄 이관', desc: '재배정된 담당자에게 스케줄을 이관합니다.' },
                          { value: 'cancel', label: '일괄 취소', desc: '모든 스케줄을 취소합니다.' },
                        ] as { value: ScheduleAction; label: string; desc: string }[]
                      ).map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            'flex items-start gap-md p-md border rounded-input cursor-pointer transition-all',
                            scheduleAction === opt.value
                              ? 'border-primary bg-primary-light'
                              : 'border-line bg-surface-secondary hover:border-primary/40'
                          )}
                        >
                          <input
                            type="radio"
                            value={opt.value}
                            checked={scheduleAction === opt.value}
                            onChange={() => setScheduleAction(opt.value)}
                            className="mt-[2px] accent-primary"
                          />
                          <div>
                            <p className="text-Body-2 font-semibold text-content">{opt.label}</p>
                            <p className="text-Label text-content-secondary">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-xs px-xl py-md rounded-button border border-line bg-surface text-content-secondary hover:bg-surface-secondary transition-all text-Label font-medium"
              >
                <ArrowLeft size={16} />
                이전
              </button>
              <button
                onClick={handleStep3Next}
                className="flex items-center gap-xs px-xl py-md rounded-button bg-primary text-white hover:opacity-90 transition-all text-Label font-semibold shadow-sm"
              >
                다음
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: 최종 확인 ── */}
        {currentStep === 4 && (
          <div className="space-y-lg">
            <div className="bg-surface border border-line rounded-card p-xl space-y-lg">
              <h3 className="text-Body-1 font-semibold text-content flex items-center gap-xs">
                <UserMinus size={18} className="text-error" />
                최종 확인
              </h3>

              {/* 경고 배너 */}
              <div className="flex items-start gap-sm p-md bg-error/5 border border-error/20 rounded-input">
                <AlertTriangle size={16} className="text-error mt-[1px] flex-shrink-0" />
                <p className="text-Label text-error">
                  퇴사 예정 등록 후에는 수정이 어려울 수 있습니다. 아래 내용을 확인 후 진행하세요.
                </p>
              </div>

              {/* 요약 카드 */}
              <div className="bg-surface-secondary rounded-input p-lg space-y-sm">
                {[
                  {
                    label: '퇴사 대상',
                    value: selectedStaff
                      ? `${selectedStaff.name} (${selectedStaff.role})`
                      : '-',
                  },
                  {
                    label: '퇴사 예정일',
                    value: resignDate
                      ? new Date(resignDate).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '-',
                  },
                  {
                    label: '퇴사 사유',
                    value: resignReason || '(미입력)',
                  },
                  ...(isFC
                    ? [
                        {
                          label: '담당 회원 재배정',
                          value: `${totalAssignedCount}명 완료`,
                        },
                      ]
                    : []),
                  {
                    label: '미래 스케줄',
                    value:
                      futureSchedules.length === 0
                        ? '예정된 스케줄 없음'
                        : scheduleAction === 'transfer'
                        ? `${futureSchedules.length}건 후임 이관`
                        : `${futureSchedules.length}건 일괄 취소`,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-start gap-md">
                    <span className="text-Label font-semibold text-content-secondary w-[130px] flex-shrink-0">
                      {row.label}
                    </span>
                    <span className="text-Body-2 text-content">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-xs px-xl py-md rounded-button border border-line bg-surface text-content-secondary hover:bg-surface-secondary transition-all text-Label font-medium"
              >
                <ArrowLeft size={16} />
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-xs px-xl py-md rounded-button bg-error text-white hover:opacity-90 transition-all text-Label font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserMinus size={16} />
                {isSubmitting ? '처리 중...' : '퇴사 예정 등록'}
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
