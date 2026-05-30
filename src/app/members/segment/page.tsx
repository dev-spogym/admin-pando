'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Filter, Plus, Zap, ChevronRight, Tag, RefreshCw, Send } from 'lucide-react';
import { getCurrentBranchId, loadBranchSetting, saveBranchSetting } from '@/lib/branchSettings';
import { supabase } from '@/lib/supabase';

// ─── SCR-M010 세그먼트 관리 (MBR-EXT-04) ──────────────────────────────────────
// docs4/V1/D02-회원관리/회원관리.md ## SCR-M010
// 자동 세그먼트는 수정·삭제 버튼을 제공하지 않는다(시스템 정의).

// ── 조건 빌더 정의 (docs4 MBR-EXT-04-03) ──
interface SegmentCondition {
  field: string;
  operator: string;
  value: string;
}

interface SegmentItem {
  id: number;
  name: string;
  desc: string;
  count: number;
  color: string;
  auto: boolean;
  conditions?: SegmentCondition[];
  joinOp?: 'AND' | 'OR';
}

interface SegmentMemberSnapshot {
  id: number;
  name: string;
  status: string;
  gender: string | null;
  memberType: string | null;
  referralSource: string | null;
  registeredAt: string | null;
  membershipExpiry: string | null;
  lastVisitAt: string | null;
  firstPaymentAt: string | null;
  totalPayment: number;
  attendance30: number;
  attendance90: number;
  lastCareAt: string | null;
}

/** 조건 빌더에서 선택 가능한 필드 (docs4 SCR-M010 조건 항목) */
const CONDITION_FIELDS: { value: string; label: string; options?: string[] }[] = [
  { value: 'status', label: '회원 상태', options: ['활성', '만료', '예정', '임박', '홀딩', '미등록', '탈퇴'] },
  { value: 'suspended', label: '정지 플래그', options: ['정지 포함', '정지 제외'] },
  { value: 'lastVisit', label: '최근 방문일(일)' },
  { value: 'expiry', label: '이용권 만료일(D-)' },
  { value: 'firstPayment', label: '첫 결제일로부터(일)' },
  { value: 'gender', label: '성별', options: ['남성', '여성'] },
  { value: 'ageGroup', label: '연령대', options: ['10대', '20대', '30대', '40대', '50대 이상'] },
  { value: 'memberType', label: '회원구분', options: ['일반', '기명법인', '무기명법인'] },
  { value: 'inquiryType', label: '문의 유형', options: ['방문(WI)', '전화문의(TI)', '체험', '일일입장'] },
  { value: 'referral', label: '가입경로', options: ['간판', '블로그', '인스타', '당근', '지역카페', '현수막', '전단지', '회원소개', '기타'] },
  { value: 'paymentAmount', label: '누적 결제 금액(원)' },
];

const CONDITION_OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'gte', label: '이상' },
  { value: 'lte', label: '이하' },
];

// docs4 SCR-M010 자동 7종 (신규/만료후미등록/이탈위험/만료임박/관심필요/충성/활발)
const CUSTOM_SEGMENT_KEY = 'member_custom_segments';
const SEGMENT_MESSAGE_HISTORY_KEY = 'member_segment_message_history';

const AUTO_SEGMENTS: SegmentItem[] = [
  { id: 1, name: '신규', desc: '첫 정상 결제 완료일로부터 30일 이내', count: 0, color: 'text-blue-600 bg-blue-50 border-blue-200', auto: true },
  { id: 2, name: '만료후미등록', desc: '마지막 이용권 만료일 +60일 경과, 재등록 결제 없음', count: 0, color: 'text-rose-600 bg-rose-50 border-rose-200', auto: true },
  { id: 3, name: '이탈위험', desc: '활성 회원이 최근 30일 이상 방문/출석 없음', count: 0, color: 'text-red-600 bg-red-50 border-red-200', auto: true },
  { id: 4, name: '만료임박', desc: '만료일이 30일 이내인 활성 회원', count: 0, color: 'text-orange-600 bg-orange-50 border-orange-200', auto: true },
  { id: 5, name: '관심필요', desc: '최근 90일 이내 종합평가·상담 기록 없음', count: 0, color: 'text-amber-600 bg-amber-50 border-amber-200', auto: true },
  { id: 6, name: '충성', desc: '누적 결제 12개월 이상 또는 고액 결제 회원', count: 0, color: 'text-purple-600 bg-purple-50 border-purple-200', auto: true },
  { id: 7, name: '활발', desc: '최근 30일 이내 방문/출석 8회 이상', count: 0, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', auto: true },
];

function daysFrom(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function daysUntil(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export default function SegmentPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSegmentName, setSelectedSegmentName] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<string | null>(null);
  const [segmentsState, setSegmentsState] = useState<SegmentItem[]>(AUTO_SEGMENTS);
  const [memberSnapshots, setMemberSnapshots] = useState<SegmentMemberSnapshot[]>([]);
  const [segmentMembers, setSegmentMembers] = useState<Record<string, Array<{ name: string; note: string }>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchId, setBranchId] = useState(1);
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', desc: '', count: 24 });
  const [messageBody, setMessageBody] = useState('');

  // 조건 빌더 (docs4 MBR-EXT-04-03): AND/OR 조합 + 최대 3개 조건
  const [joinOp, setJoinOp] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<SegmentCondition[]>([
    { field: 'status', operator: 'eq', value: '활성' },
  ]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const segments = segmentsState;
  const selectedMembers = useMemo(() => segmentMembers[selectedSegmentName ?? ''] ?? [], [selectedSegmentName]);

  const evaluateCondition = (member: SegmentMemberSnapshot, condition: SegmentCondition) => {
    const numericValue = Number(condition.value);
    let source: string | number | null = null;
    if (condition.field === 'status') source = member.status === 'ACTIVE' ? '활성' : member.status === 'EXPIRED' ? '만료' : member.status;
    if (condition.field === 'gender') source = member.gender === 'MALE' ? '남성' : member.gender === 'FEMALE' ? '여성' : member.gender;
    if (condition.field === 'memberType') source = member.memberType ?? '일반';
    if (condition.field === 'referral') source = member.referralSource ?? '';
    if (condition.field === 'lastVisit') source = daysFrom(member.lastVisitAt);
    if (condition.field === 'expiry') source = daysUntil(member.membershipExpiry);
    if (condition.field === 'firstPayment') source = daysFrom(member.firstPaymentAt);
    if (condition.field === 'paymentAmount') source = member.totalPayment;
    if (condition.field === 'ageGroup') source = '';
    if (condition.field === 'inquiryType') source = '';
    if (condition.field === 'suspended') source = member.status === 'SUSPENDED' ? '정지 포함' : '정지 제외';

    if (typeof source === 'number') {
      if (condition.operator === 'gte') return source >= numericValue;
      if (condition.operator === 'lte') return source <= numericValue;
      if (condition.operator === 'neq') return source !== numericValue;
      return source === numericValue;
    }
    if (condition.operator === 'neq') return String(source) !== condition.value;
    return String(source) === condition.value;
  };

  const filterByConditions = (conds: SegmentCondition[], op: 'AND' | 'OR') => {
    const filled = conds.filter((condition) => condition.value.trim() !== '');
    if (filled.length === 0) return [];
    return memberSnapshots.filter((member) => {
      const results = filled.map((condition) => evaluateCondition(member, condition));
      return op === 'AND' ? results.every(Boolean) : results.some(Boolean);
    });
  };

  const buildNote = (member: SegmentMemberSnapshot, segmentName: string) => {
    if (segmentName === '신규') return `첫 결제 ${daysFrom(member.firstPaymentAt)}일차`;
    if (segmentName === '만료임박') return `만료 D-${daysUntil(member.membershipExpiry)}`;
    if (segmentName === '이탈위험') return `${daysFrom(member.lastVisitAt)}일 미방문`;
    if (segmentName === '활발') return `최근 30일 출석 ${member.attendance30}회`;
    if (segmentName === '관심필요') return `${daysFrom(member.lastCareAt)}일 상담/평가 없음`;
    return `누적 결제 ${member.totalPayment.toLocaleString()}원`;
  };

  const reload = async () => {
    setLoading(true);
    setError('');
    const currentBranchId = getCurrentBranchId();
    setBranchId(currentBranchId);
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
      const [customSegments, membersRes, attendanceRes, salesRes, consultationRes, evaluationRes] = await Promise.all([
        loadBranchSetting<SegmentItem[]>(CUSTOM_SEGMENT_KEY, [], currentBranchId),
        supabase
          .from('members')
          .select('id, name, status, gender, memberType, referralSource, registeredAt, membershipExpiry, lastVisitAt')
          .eq('branchId', currentBranchId)
          .is('deletedAt', null),
        supabase
          .from('attendance')
          .select('memberId, checkInAt')
          .eq('branchId', currentBranchId)
          .gte('checkInAt', ninetyDaysAgo),
        supabase
          .from('sales')
          .select('memberId, amount, status, saleDate')
          .eq('branchId', currentBranchId),
        supabase
          .from('consultations')
          .select('memberId, completedAt, createdAt')
          .eq('branchId', currentBranchId)
          .gte('createdAt', ninetyDaysAgo),
        supabase
          .from('member_evaluations')
          .select('memberId, createdAt')
          .eq('branchId', currentBranchId)
          .gte('createdAt', ninetyDaysAgo),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (attendanceRes.error) throw attendanceRes.error;
      if (salesRes.error) throw salesRes.error;

      const attendanceByMember = new Map<number, string[]>();
      (attendanceRes.data ?? []).forEach((row) => {
        const memberId = Number(row.memberId);
        attendanceByMember.set(memberId, [...(attendanceByMember.get(memberId) ?? []), row.checkInAt]);
      });

      const salesByMember = new Map<number, Array<{ amount: number; saleDate: string | null }>>();
      (salesRes.data ?? []).forEach((row) => {
        const memberId = Number(row.memberId);
        const rows = salesByMember.get(memberId) ?? [];
        rows.push({ amount: Number(row.amount ?? 0), saleDate: row.saleDate ?? null });
        salesByMember.set(memberId, rows);
      });

      const careByMember = new Map<number, string>();
      [...(consultationRes.data ?? []), ...(evaluationRes.data ?? [])].forEach((row) => {
        const memberId = Number(row.memberId);
        const record = row as Record<string, any>;
        const date = record.completedAt ?? record.createdAt;
        const prev = careByMember.get(memberId);
        if (!prev || new Date(prev) < new Date(date)) careByMember.set(memberId, date);
      });

      const snapshots: SegmentMemberSnapshot[] = (membersRes.data ?? []).map((member) => {
        const memberId = Number(member.id);
        const attendances = attendanceByMember.get(memberId) ?? [];
        const payments = salesByMember.get(memberId) ?? [];
        const firstPaymentAt = payments
          .map((payment) => payment.saleDate)
          .filter(Boolean)
          .sort()[0] ?? null;
        const lastVisitAt = member.lastVisitAt ?? attendances.sort().at(-1) ?? null;
        return {
          id: memberId,
          name: member.name ?? `회원 ${memberId}`,
          status: member.status ?? '',
          gender: member.gender ?? null,
          memberType: member.memberType ?? null,
          referralSource: member.referralSource ?? null,
          registeredAt: member.registeredAt ?? null,
          membershipExpiry: member.membershipExpiry ?? null,
          lastVisitAt,
          firstPaymentAt,
          totalPayment: payments.reduce((sum, payment) => sum + payment.amount, 0),
          attendance30: attendances.filter((date) => daysFrom(date) <= 30).length,
          attendance90: attendances.length,
          lastCareAt: careByMember.get(memberId) ?? null,
        };
      });

      const autoMembers: Record<string, SegmentMemberSnapshot[]> = {
        신규: snapshots.filter((member) => daysFrom(member.firstPaymentAt) <= 30),
        만료후미등록: snapshots.filter((member) => daysUntil(member.membershipExpiry) < -60),
        이탈위험: snapshots.filter((member) => member.status === 'ACTIVE' && daysFrom(member.lastVisitAt) >= 30),
        만료임박: snapshots.filter((member) => member.status === 'ACTIVE' && daysUntil(member.membershipExpiry) >= 0 && daysUntil(member.membershipExpiry) <= 30),
        관심필요: snapshots.filter((member) => daysFrom(member.lastCareAt) >= 90),
        충성: snapshots.filter((member) => member.totalPayment >= 1_000_000 || daysFrom(member.firstPaymentAt) >= 365),
        활발: snapshots.filter((member) => member.attendance30 >= 8),
      };

      setMemberSnapshots(snapshots);
      setSegmentMembers(Object.fromEntries(
        Object.entries(autoMembers).map(([name, rows]) => [
          name,
          rows.slice(0, 20).map((member) => ({ name: member.name, note: buildNote(member, name) })),
        ]),
      ));
      setSegmentsState([
        ...customSegments,
        ...AUTO_SEGMENTS.map((segment) => ({ ...segment, count: autoMembers[segment.name]?.length ?? 0 })),
      ]);
      setSnapshotDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : '세그먼트 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  /** 조건을 사람이 읽을 수 있는 요약 문자열로 변환 */
  const summarizeConditions = (conds: SegmentCondition[], op: 'AND' | 'OR'): string => {
    const fieldLabel = (f: string) => CONDITION_FIELDS.find((c) => c.value === f)?.label ?? f;
    const opLabel = (o: string) => CONDITION_OPERATORS.find((c) => c.value === o)?.label ?? o;
    const joiner = op === 'AND' ? ' 그리고 ' : ' 또는 ';
    return conds
      .filter((c) => c.value.trim() !== '')
      .map((c) => `${fieldLabel(c.field)} ${opLabel(c.operator)} ${c.value}`)
      .join(joiner);
  };

  const handleAddCondition = () => {
    if (conditions.length >= 3) {
      toast.error('최대 3단계까지 가능합니다.');
      return;
    }
    setConditions((prev) => [...prev, { field: 'lastVisit', operator: 'gte', value: '' }]);
  };

  const handlePreview = () => {
    const filled = conditions.filter((c) => c.value.trim() !== '');
    if (filled.length === 0) {
      toast.error('조건을 1개 이상 입력하세요.');
      return;
    }
    setPreviewCount(filterByConditions(filled, joinOp).length);
  };

  const resetCreateForm = () => {
    setForm({ name: '', desc: '', count: 24 });
    setJoinOp('AND');
    setConditions([{ field: 'status', operator: 'eq', value: '활성' }]);
    setPreviewCount(null);
  };

  const handleCreateSegment = async () => {
    if (!form.name.trim()) {
      toast.error('세그먼트 이름을 입력하세요.');
      return;
    }
    if (form.name.trim().length > 30) {
      toast.error('세그먼트 이름은 30자 이내로 입력하세요.');
      return;
    }
    if (segments.some((s) => s.name === form.name.trim())) {
      toast.error('동일 이름이 이미 있어요.');
      return;
    }
    const conditionSummary = summarizeConditions(conditions, joinOp);
    if (!conditionSummary) {
      toast.error('조건을 1개 이상 입력하세요.');
      return;
    }
    if (previewCount === null) {
      toast.warning('미리보기로 회원 수를 확인하지 않았습니다. 그대로 저장합니다.');
    }
    const customSegment: SegmentItem = {
      id: Date.now(),
      name: form.name.trim(),
      desc: form.desc.trim() ? `${form.desc.trim()} · ${conditionSummary}` : conditionSummary,
      count: previewCount ?? filterByConditions(conditions, joinOp).length,
      color: 'text-sky-600 bg-sky-50 border-sky-200',
      auto: false,
      conditions,
      joinOp,
    };
    const nextCustom = [customSegment, ...segments.filter((segment) => !segment.auto)];
    const errorMessage = await saveBranchSetting(CUSTOM_SEGMENT_KEY, nextCustom);
    if (errorMessage) {
      toast.error(`세그먼트 저장 실패: ${errorMessage}`);
      return;
    }
    setSegmentsState((prev) => [
      customSegment,
      ...prev,
    ]);
    setSegmentMembers((prev) => ({
      ...prev,
      [customSegment.name]: filterByConditions(conditions, joinOp).slice(0, 20).map((member) => ({
        name: member.name,
        note: summarizeConditions(conditions, joinOp),
      })),
    }));
    setShowCreate(false);
    resetCreateForm();
    toast.success('세그먼트를 생성했습니다.');
  };

  const handleSendMessage = async () => {
    if (!messageTarget || !messageBody.trim()) {
      toast.error('메시지 내용을 입력하세요.');
      return;
    }
    const prev = await loadBranchSetting<Array<{ segment: string; body: string; sentAt: string; count: number }>>(SEGMENT_MESSAGE_HISTORY_KEY, []);
    const target = segments.find((segment) => segment.name === messageTarget);
    await saveBranchSetting(SEGMENT_MESSAGE_HISTORY_KEY, [
      { segment: messageTarget, body: messageBody.trim(), sentAt: new Date().toISOString(), count: target?.count ?? 0 },
      ...prev,
    ].slice(0, 100));
    toast.success(`${messageTarget} 세그먼트에 메시지를 발송했습니다.`);
    setMessageTarget(null);
    setMessageBody('');
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <PageHeader
          title="세그먼트 관리"
          description="회원 그룹을 만들어 타겟 마케팅에 활용합니다"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                onClick={() => void reload()}
              >
                DB 갱신
              </Button>
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
                세그먼트 생성
              </Button>
            </div>
          }
        />

        {/* 세그먼트 요약 (자동/커스텀/총 대상) */}
        <StatCardGrid cols={3}>
          <StatCard label="자동 세그먼트" value={segments.filter((s) => s.auto).length} icon={<Zap size={20} />} />
          <StatCard label="커스텀 세그먼트" value={segments.filter((s) => !s.auto).length} icon={<Tag size={20} />} variant="mint" />
          <StatCard label="대상 회원 합계" value={segments.reduce((acc, s) => acc + s.count, 0)} icon={<Filter size={20} />} variant="peach" />
        </StatCardGrid>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          Supabase snapshot · 지점 {branchId} · 기준일 {snapshotDate ?? '-'}
          {error && <span className="ml-2 text-red-600">Fallback 사용: {error}</span>}
        </div>

        {/* 4축 상태: 로딩 / 빈 / 정상 */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-line bg-surface-secondary/60" />
            ))}
          </div>
        ) : segments.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="세그먼트가 없습니다"
            description="조건을 조합해 타겟 회원 그룹을 만들고 메시지 발송·혜택 적용 액션을 연결하세요."
            action={{ label: '세그먼트 생성', onClick: () => setShowCreate(true) }}
          />
        ) : (
        <div className="space-y-3">
          {segments.map((seg) => (
            <div key={seg.id} className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl border ${seg.color}`}>
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{seg.name}</p>
                    {seg.auto && (
                      <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        <Zap className="w-3 h-3" /> 자동
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{seg.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-base font-bold text-gray-800">{seg.count}명</p>
                  <div className="flex gap-1.5 mt-1 justify-end">
                    <button type="button" onClick={() => setMessageTarget(seg.name)} className="text-xs text-blue-600 hover:underline">메시지 발송</button>
                    <span className="text-gray-300">·</span>
                    <button type="button" onClick={() => setSelectedSegmentName(seg.name)} className="text-xs text-gray-500 hover:underline">보기</button>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); resetCreateForm(); }}
        title="새 세그먼트 만들기"
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-sm">
            <Button variant="outline" size="sm" onClick={handlePreview}>미리보기</Button>
            <div className="flex gap-sm">
              <Button variant="outline" onClick={() => { setShowCreate(false); resetCreateForm(); }}>취소</Button>
              <Button onClick={handleCreateSegment}>저장</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-md">
          <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="세그먼트 이름 (최대 30자)" maxLength={30} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          <input value={form.desc} onChange={(e) => setForm((prev) => ({ ...prev, desc: e.target.value }))} placeholder="설명 (선택)" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />

          {/* 조건 빌더 (MBR-EXT-04-03): AND/OR 조합, 최대 3개 */}
          <div className="rounded-xl border border-line bg-surface-secondary/40 p-md">
            <div className="mb-sm flex items-center justify-between">
              <p className="text-xs font-semibold text-content-secondary">조건 빌더</p>
              <div className="flex overflow-hidden rounded-lg border border-line">
                {(['AND', 'OR'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setJoinOp(op)}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${joinOp === op ? 'bg-blue-600 text-white' : 'bg-white text-content-secondary'}`}
                  >
                    {op === 'AND' ? '모두 충족 (AND)' : '하나라도 충족 (OR)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-sm">
              {conditions.map((cond, idx) => {
                const fieldDef = CONDITION_FIELDS.find((f) => f.value === cond.field);
                return (
                  <div key={idx} className="flex items-center gap-sm">
                    {idx > 0 && (
                      <span className="w-10 shrink-0 text-center text-[11px] font-bold text-blue-600">{joinOp}</span>
                    )}
                    {idx === 0 && <span className="w-10 shrink-0" />}
                    <select
                      value={cond.field}
                      onChange={(e) => {
                        const nextField = e.target.value;
                        const nextDef = CONDITION_FIELDS.find((f) => f.value === nextField);
                        setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, field: nextField, value: nextDef?.options?.[0] ?? '' } : c));
                      }}
                      className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    >
                      {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) => setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, operator: e.target.value } : c))}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    >
                      {CONDITION_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {fieldDef?.options ? (
                      <select
                        value={cond.value}
                        onChange={(e) => setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, value: e.target.value } : c))}
                        className="w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                      >
                        {fieldDef.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        value={cond.value}
                        onChange={(e) => setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, value: e.target.value } : c))}
                        placeholder="값"
                        className="w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setConditions((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={conditions.length === 1}
                      className="shrink-0 rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-30"
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddCondition}
              className="mt-sm flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> 조건 추가 (최대 3개)
            </button>

            {previewCount !== null && (
              <div className="mt-sm rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                미리보기: 현재 조건에 약 <span className="font-bold">{previewCount}명</span>이 해당합니다. (예상치)
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={selectedSegmentName !== null}
        onClose={() => setSelectedSegmentName(null)}
        title={selectedSegmentName ? `${selectedSegmentName} 회원` : '세그먼트 회원'}
        size="lg"
        footer={<div className="flex justify-end"><Button variant="outline" onClick={() => setSelectedSegmentName(null)}>닫기</Button></div>}
      >
        <div className="space-y-sm">
          {selectedMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-md py-lg text-sm text-content-secondary">샘플 회원 목록이 아직 없습니다.</div>
          ) : (
            selectedMembers.map((member) => (
              <div key={member.name} className="rounded-xl border border-line px-md py-md">
                <p className="text-sm font-semibold text-content">{member.name}</p>
                <p className="mt-xs text-xs text-content-secondary">{member.note}</p>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        isOpen={messageTarget !== null}
        onClose={() => setMessageTarget(null)}
        title={messageTarget ? `${messageTarget} 메시지 발송` : '메시지 발송'}
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setMessageTarget(null)}>취소</Button>
            <Button icon={<Send className="w-4 h-4" />} onClick={handleSendMessage}>발송</Button>
          </div>
        }
      >
        <textarea
          rows={5}
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          placeholder="세그먼트 공지 내용을 입력하세요."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
      </Modal>
    </AppLayout>
  );
}
