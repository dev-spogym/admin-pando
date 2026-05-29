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

// ─── SCR-M007 회원 병합 (MBR-EXT-01) ──────────────────────────────────────────
// docs4/V1/D02-회원관리/회원관리.md ## SCR-M007
// 기능형 목업: 중복 의심 회원 검색 → 주/부 계정 지정 → 비교 → 병합 확인 다이얼로그
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

// 같은 이름/생년월일이 겹치는 "중복 의심" mock 명단
const MOCK_DUPLICATES: MergeCandidate[] = [
  { id: 1001, name: '김철수', phone: '010-1234-5678', birthDate: '1990-05-15', membership: 'PT 20회', registeredAt: '2024-01-10', lastVisit: '2026-05-20', status: '활성', refundInProgress: false },
  { id: 1042, name: '김철수', phone: '010-1234-9999', birthDate: '1990-05-15', membership: '헬스 3개월', registeredAt: '2025-08-02', lastVisit: '2026-04-11', status: '만료', refundInProgress: false },
  { id: 1103, name: '이영희', phone: '010-9876-5432', birthDate: '1988-11-20', membership: '필라테스 30회', registeredAt: '2023-06-15', lastVisit: '2026-05-18', status: '활성', refundInProgress: false },
  { id: 1188, name: '이영희', phone: '010-9876-0000', birthDate: '1988-11-20', membership: '요가 10회', registeredAt: '2025-12-01', lastVisit: '2026-03-02', status: '홀딩', refundInProgress: true },
  { id: 1230, name: '박지성', phone: '010-5555-4444', birthDate: '1992-03-10', membership: 'PT 10회', registeredAt: '2024-10-15', lastVisit: '2026-02-10', status: '만료', refundInProgress: false },
];

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
    await new Promise((r) => setTimeout(r, 500)); // mock 비동기 검색
    const q = search.trim();
    const matched = q
      ? MOCK_DUPLICATES.filter((m) => m.name.includes(q) || m.phone.includes(q) || m.birthDate.includes(q))
      : MOCK_DUPLICATES;
    setResults(matched);
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
    if (confirmText.trim() !== '병합') {
      toast.error('확인 문구가 일치하지 않습니다.');
      return;
    }
    setMerging(true);
    await new Promise((r) => setTimeout(r, 900));
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
