'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from 'react';
import { GitMerge, Search, AlertTriangle, ArrowRight, RefreshCcw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';

// ─── SCR-M007 회원 병합 (MBR-EXT-01) ──────────────────────────────────────────
// docs4/V1/D02-회원관리/회원관리.md ## SCR-M007
// DB 연결: 중복 의심 회원 검색 → 주/부 계정 지정 → 비교 → 이력 이전 → 부계정 비활성
// 4축 상태: 로딩(스켈레톤) / 정상(검색 결과) / 빈(검색 0건) / 오류(권한·환불 차단)

type MergeCandidate = {
  id: number;
  name: string;
  phone: string;
  birthDate: string;
  membership: string;
  registeredAt: string;
  lastVisit: string;
  status: '활성' | '만료' | '홀딩';
  refundInProgress: boolean; // 부 계정 환불 진행 중 → 병합 차단 케이스
};

const getBranchId = () => {
  if (typeof window === 'undefined') return 1;
  return Number(localStorage.getItem('branchId') || '1');
};

const formatDate = (value: unknown, fallback = '-') => {
  if (typeof value !== 'string' || !value) return fallback;
  return value.slice(0, 10);
};

const mapStatus = (status: unknown): MergeCandidate['status'] => {
  if (status === 'ACTIVE') return '활성';
  if (status === 'HOLDING') return '홀딩';
  return '만료';
};

const STATUS_VARIANT: Record<MergeCandidate['status'], 'success' | 'error' | 'warning'> = {
  활성: 'success',
  만료: 'error',
  홀딩: 'warning',
};

function CandidateRow({
  c,
  role,
  selected,
  disabled,
  onSelect,
}: {
  c: MergeCandidate;
  role: '주' | '부';
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between gap-md rounded-xl border px-md py-sm text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-line hover:bg-surface-secondary',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-xs">
          <span className="text-[13px] font-bold text-content">{c.name}</span>
          <StatusBadge variant={STATUS_VARIANT[c.status]} dot>{c.status}</StatusBadge>
          <span className="text-[11px] text-content-tertiary">#{c.id}</span>
        </div>
        <div className="mt-[2px] text-[12px] text-content-secondary tabular-nums">
          {c.phone} · {c.birthDate} · {c.membership}
        </div>
      </div>
      <span className={cn('shrink-0 rounded-full px-2 py-[2px] text-[11px] font-semibold', selected ? 'bg-primary text-white' : 'bg-surface-tertiary text-content-secondary')}>
        {role} 계정
      </span>
    </button>
  );
}

function ComparePanel({ title, c, tone }: { title: string; c: MergeCandidate; tone: 'primary' | 'secondary' }) {
  const rows: Array<[string, string]> = [
    ['이름', c.name],
    ['연락처', c.phone],
    ['생년월일', c.birthDate],
    ['이용권', c.membership],
    ['등록일', c.registeredAt],
    ['최근 방문', c.lastVisit],
  ];
  return (
    <div className={cn('rounded-xl border p-md', tone === 'primary' ? 'border-primary/30 bg-primary/5' : 'border-line bg-surface-secondary/50')}>
      <div className="mb-sm flex items-center justify-between">
        <span className="text-[12px] font-bold text-content">{title}</span>
        <StatusBadge variant={STATUS_VARIANT[c.status]} dot>{c.status}</StatusBadge>
      </div>
      <div className="space-y-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-sm border-b border-line/60 py-[3px] last:border-0">
            <span className="text-[12px] text-content-secondary">{label}</span>
            <span className="text-[12px] font-semibold text-content tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberMerge() {
  const authUser = useAuthStore((s) => s.user);
  const canMerge = hasPermission(authUser?.role ?? '', '/members/merge', authUser?.isSuperAdmin);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<MergeCandidate[]>([]);
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [secondaryId, setSecondaryId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [merging, setMerging] = useState(false);

  const primary = useMemo(() => results.find((r) => r.id === primaryId) ?? null, [results, primaryId]);
  const secondary = useMemo(() => results.find((r) => r.id === secondaryId) ?? null, [results, secondaryId]);

  // 예외처리: 부 계정 환불 진행 중이면 병합 차단
  const blockedByRefund = secondary?.refundInProgress ?? false;
  // 예외처리: 양 계정 활성 이용권 존재 시 노랑 경고(진행 가능)
  const bothActiveWarning = primary?.status === '활성' && secondary?.status === '활성';

  const handleSearch = async () => {
    setLoading(true);
    setSearched(false);
    const q = search.trim();
    let query = supabase
      .from('members')
      .select('id, name, phone, birthDate, membershipType, registeredAt, lastVisitAt, status, branchId')
      .eq('branchId', getBranchId())
      .is('deletedAt', null)
      .limit(30);

    if (q) {
      const filters = [`name.ilike.%${q}%`, `phone.ilike.%${q}%`];
      if (/^\d{4}-\d{2}-\d{2}$/.test(q)) filters.push(`birthDate.eq.${q}`);
      query = query.or(filters.join(','));
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error) {
      toast.error('회원 검색에 실패했습니다.');
      setResults([]);
    } else {
      const memberRows = data ?? [];
      const ids = memberRows.map((member) => Number(member.id));
      const refundIds = new Set<number>();
      if (ids.length > 0) {
        const { data: saleRows } = await supabase
          .from('sales')
          .select('memberId, status')
          .in('memberId', ids)
          .in('status', ['refund_requested', 'refund_pending', 'REFUND_REQUESTED', 'REFUND_PENDING']);
        (saleRows ?? []).forEach((sale) => refundIds.add(Number(sale.memberId)));
      }
      const mapped: MergeCandidate[] = memberRows.map((member: Record<string, unknown>) => ({
        id: Number(member.id),
        name: String(member.name ?? ''),
        phone: String(member.phone ?? ''),
        birthDate: formatDate(member.birthDate),
        membership: String(member.membershipType ?? '이용권 없음'),
        registeredAt: formatDate(member.registeredAt),
        lastVisit: formatDate(member.lastVisitAt),
        status: mapStatus(member.status),
        refundInProgress: refundIds.has(Number(member.id)),
      }));
      setResults(mapped);
    }
    setPrimaryId(null);
    setSecondaryId(null);
    setSearched(true);
    setLoading(false);
  };

  const handleReset = () => {
    setSearch('');
    setResults([]);
    setSearched(false);
    setPrimaryId(null);
    setSecondaryId(null);
  };

  const handleMerge = async () => {
    if (!primary || !secondary) return;
    if (confirmText.trim() !== '병합') {
      toast.error('확인 문구가 일치하지 않습니다.');
      return;
    }
    setMerging(true);
    const relationTables = [
      'sales',
      'attendance',
      'body_compositions',
      'contracts',
      'member_memos',
      'consultations',
      'member_evaluations',
      'exercise_logs',
      'member_exercise_programs',
      'member_family_members',
    ];

    for (const table of relationTables) {
      const { error } = await supabase
        .from(table)
        .update({ memberId: primary.id })
        .eq('memberId', secondary.id);
      if (error) {
        setMerging(false);
        toast.error(`병합 중 ${table} 이력 이전에 실패했습니다.`);
        return;
      }
    }

    const { data: primaryGoal } = await supabase
      .from('member_goals')
      .select('id')
      .eq('memberId', primary.id)
      .maybeSingle();
    if (primaryGoal) {
      await supabase.from('member_goals').delete().eq('memberId', secondary.id);
    } else {
      await supabase.from('member_goals').update({ memberId: primary.id }).eq('memberId', secondary.id);
    }

    const { data: primaryLocker } = await supabase
      .from('lockers')
      .select('id')
      .eq('memberId', primary.id)
      .maybeSingle();
    if (primaryLocker) {
      await supabase.from('lockers').update({ memberId: null, memberName: null }).eq('memberId', secondary.id);
    } else {
      await supabase.from('lockers').update({ memberId: primary.id, memberName: primary.name }).eq('memberId', secondary.id);
    }

    const { error: memberError } = await supabase
      .from('members')
      .update({
        status: 'WITHDRAWN',
        deletedAt: new Date().toISOString(),
        previousMemberId: primary.id,
        memo: `회원 병합으로 비활성화됨. 주 계정 #${primary.id}`,
      })
      .eq('id', secondary.id);

    if (memberError) {
      setMerging(false);
      toast.error('부 계정 비활성화에 실패했습니다.');
      return;
    }

    await supabase.from('member_merge_logs').insert({
      primaryMemberId: primary.id,
      secondaryMemberId: secondary.id,
      branchId: getBranchId(),
      mergedBy: authUser?.name ?? '관리자',
      detail: {
        primaryName: primary.name,
        secondaryName: secondary.name,
        transferredTables: relationTables,
      },
    });

    setMerging(false);
    setConfirmOpen(false);
    setConfirmText('');
    toast.success('병합되었습니다.');
    handleReset();
  };

  // 오류 상태: 권한 부족
  if (!canMerge) {
    return (
      <AppLayout>
        <PageHeader title="회원 병합" description="중복 등록된 회원 계정을 하나로 합칩니다." />
        <EmptyState
          icon={ShieldAlert}
          title="접근 권한이 없습니다"
          description="회원 병합은 본사 권한자(superAdmin/primary) 또는 지점장만 수행할 수 있습니다. 지점 간 병합은 본사에 요청하세요."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="회원 병합"
        description="중복 등록된 회원 계정을 하나의 주 계정으로 통합합니다. 출석·결제·상담 이력은 주 계정으로 이전됩니다."
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCcw size={14} />} onClick={handleReset}>
            초기화
          </Button>
        }
      />

      <StatCardGrid cols={3} className="mb-lg">
        <StatCard label="검색 결과" value={searched ? results.length : '-'} icon={<Search size={20} />} />
        <StatCard label="주 계정" value={primary ? primary.name : '미선택'} icon={<GitMerge size={20} />} variant="mint" />
        <StatCard label="부 계정" value={secondary ? secondary.name : '미선택'} icon={<GitMerge size={20} />} variant="peach" />
      </StatCardGrid>

      {/* 중복 회원 검색 (MBR-EXT-01-01) */}
      <div className="mb-lg rounded-2xl border border-line bg-surface p-lg shadow-card">
        <h2 className="mb-sm text-[15px] font-bold text-content">중복 회원 검색</h2>
        <div className="flex flex-wrap items-end gap-sm">
          <div className="min-w-[260px] flex-1">
            <Input
              label="이름 · 연락처 · 생년월일"
              placeholder="중복 의심 회원 검색 (예: 김철수)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              leftIcon={<Search size={15} />}
            />
          </div>
          <Button variant="primary" onClick={handleSearch} loading={loading}>
            검색
          </Button>
        </div>
        <p className="mt-xs text-[12px] text-content-tertiary">
          결과가 없으면 이름·연락처·생년월일 중 1개 조건만 입력해 보세요.
        </p>
      </div>

      {/* 4축 상태 분기: 로딩 / 빈(검색 전) / 빈(0건) / 정상 */}
      {loading ? (
        <div className="space-y-sm">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-line bg-surface-secondary/60" />
          ))}
        </div>
      ) : !searched ? (
        <EmptyState
          icon={Search}
          title="중복 의심 회원을 검색하세요"
          description="이름·연락처·생년월일로 검색하면 병합 대상 후보가 표시됩니다."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="검색 결과가 없어요"
          description="조건을 줄여서 다시 검색해 보세요. 이름·연락처·생년월일 중 1개만 입력하는 것을 권장합니다."
          action={{ label: '검색 초기화', onClick: handleReset }}
        />
      ) : (
        <div className="grid gap-lg lg:grid-cols-2">
          {/* 주 계정 지정 (MBR-EXT-01-02) */}
          <div className="rounded-2xl border border-line bg-surface p-lg shadow-card">
            <h3 className="mb-sm text-[14px] font-bold text-content">주 계정 (유지할 계정)</h3>
            <div className="space-y-sm">
              {results.map((c) => (
                <CandidateRow
                  key={c.id}
                  c={c}
                  role="주"
                  selected={primaryId === c.id}
                  disabled={secondaryId === c.id}
                  onSelect={() => setPrimaryId(c.id)}
                />
              ))}
            </div>
          </div>

          {/* 부 계정 지정 */}
          <div className="rounded-2xl border border-line bg-surface p-lg shadow-card">
            <h3 className="mb-sm text-[14px] font-bold text-content">부 계정 (병합될 계정)</h3>
            <div className="space-y-sm">
              {results.map((c) => (
                <CandidateRow
                  key={c.id}
                  c={c}
                  role="부"
                  selected={secondaryId === c.id}
                  disabled={primaryId === c.id}
                  onSelect={() => {
                    if (primaryId === c.id) {
                      toast.error('다른 계정을 선택해주세요.');
                      return;
                    }
                    setSecondaryId(c.id);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 병합 전 정보 비교 (MBR-EXT-01-03) */}
      {primary && secondary && (
        <div className="mt-lg rounded-2xl border border-line bg-surface p-lg shadow-card">
          <h3 className="mb-md text-[14px] font-bold text-content">병합 전 정보 비교</h3>
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-md">
            <ComparePanel title="주 계정 (유지)" c={primary} tone="primary" />
            <div className="flex items-center justify-center">
              <ArrowRight className="text-content-tertiary" size={20} />
            </div>
            <ComparePanel title="부 계정 (비활성 전환)" c={secondary} tone="secondary" />
          </div>

          {bothActiveWarning && (
            <div className="mt-md flex items-start gap-sm rounded-xl border border-amber-300/40 bg-amber-50 px-md py-sm">
              <AlertTriangle size={15} className="mt-[2px] text-amber-600" />
              <p className="text-[12px] text-amber-700">양쪽 모두 활성 이용권이 있습니다. 잔여 기간은 주 계정으로 합산됩니다. (진행 가능)</p>
            </div>
          )}
          {blockedByRefund && (
            <div className="mt-md flex items-start gap-sm rounded-xl border border-state-error/30 bg-red-50 px-md py-sm">
              <AlertTriangle size={15} className="mt-[2px] text-state-error" />
              <p className="text-[12px] text-state-error">부 계정에 환불이 진행 중입니다. 환불 완료 후 재시도하세요. (병합 차단)</p>
            </div>
          )}

          <div className="mt-md flex justify-end">
            <Button
              variant="primary"
              icon={<GitMerge size={14} />}
              disabled={blockedByRefund}
              onClick={() => setConfirmOpen(true)}
            >
              병합 진행
            </Button>
          </div>
        </div>
      )}

      {/* 최종 확인 다이얼로그: "병합" 입력 확인 (DLG-M028 회원병합확인) */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmText(''); }}
        title="회원 병합 확인"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => { setConfirmOpen(false); setConfirmText(''); }}>취소</Button>
            <Button variant="danger" size="sm" loading={merging} disabled={confirmText.trim() !== '병합'} onClick={handleMerge}>
              병합 실행
            </Button>
          </div>
        }
      >
        <p className="mb-md text-[13px] text-content-secondary">
          <span className="font-semibold text-content">{secondary?.name} #{secondary?.id}</span> 계정의 이력이{' '}
          <span className="font-semibold text-content">{primary?.name} #{primary?.id}</span> 계정으로 이전되며,
          부 계정은 비활성 상태로 전환됩니다. 이 작업은 되돌리기 어렵습니다.
        </p>
        <Input
          label='확인을 위해 "병합" 을 입력하세요'
          placeholder="병합"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          error={confirmText && confirmText.trim() !== '병합' ? '"병합" 을 정확히 입력해주세요.' : undefined}
        />
      </Modal>
    </AppLayout>
  );
}

export default function MemberMergePage() {
  return (
    <React.Suspense>
      <MemberMerge />
    </React.Suspense>
  );
}
