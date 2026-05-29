'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  CreditCard,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronRight,
  Download,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge from '@/components/common/StatusBadge';
import TabNav from '@/components/common/TabNav';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { formatKRW } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';

// ─── SCR-S009 할부결제 관리 (SAL-EXT-01) ──────────────────────────────────────
// docs4/V1/D03-매출관리/매출관리.md ## SCR-S009
// 정기 분납 계약의 전체 현황 + 회차별 납입 추적 + 미납 관리.
// 요약카드 4개 / 상태탭 4개(전체·진행중·완납·미납) / 계약출처 필터 / 회차 펼침 / 납입 처리(DLG-S008) / 할부 등록(DLG-S009).
// 4축 상태: 로딩 / 정상 / 검색 결과 없음 / 탭 내 데이터 없음.

type InstallmentStatus = '진행중' | '완납' | '미납';
type ContractSource = '현장 결제 연계' | '미수금 전환' | '직접 등록';
type RoundStatus = '완료' | '예정' | '미납';

interface InstallmentRound {
  no: number;
  dueDate: string;
  paidDate: string | null;
  amount: number;
  status: RoundStatus;
}

interface Installment {
  id: string;
  memberName: string;
  product: string;
  source: ContractSource;
  prepaid: number; // 선납금
  totalAmount: number; // 총 할부 금액(선납 제외)
  totalRounds: number;
  rounds: InstallmentRound[];
  refundInProgress?: boolean; // 환불 진행 중 → 납입 처리 차단
}

const fmtLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getNextMonthValue = () => {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

// 회차 배열로 파생값 계산
const paidCount = (i: Installment) => i.rounds.filter(r => r.status === '완료').length;
const paidAmount = (i: Installment) => i.rounds.filter(r => r.status === '완료').reduce((s, r) => s + r.amount, 0);
const remainingAmount = (i: Installment) => i.totalAmount - paidAmount(i);
const hasOverdue = (i: Installment) => i.rounds.some(r => r.status === '미납');
const nextDue = (i: Installment) => {
  const next = i.rounds.find(r => r.status !== '완료');
  return next ? next.dueDate : '-';
};
const deriveStatus = (i: Installment): InstallmentStatus => {
  if (hasOverdue(i)) return '미납';
  if (i.rounds.every(r => r.status === '완료')) return '완납';
  return '진행중';
};

// 회차 생성 헬퍼
const buildRounds = (total: number, count: number, startDue: string, paid: number, overdueIdx: number[] = []): InstallmentRound[] => {
  const per = Math.round(total / count);
  const [y, m] = startDue.split('-').map(Number);
  return Array.from({ length: count }, (_, idx) => {
    const dueMonth = m + idx;
    const yy = y + Math.floor((dueMonth - 1) / 12);
    const mm = ((dueMonth - 1) % 12) + 1;
    const due = `${yy}-${String(mm).padStart(2, '0')}-05`;
    let status: RoundStatus = idx < paid ? '완료' : '예정';
    if (overdueIdx.includes(idx)) status = '미납';
    return {
      no: idx + 1,
      dueDate: due,
      paidDate: status === '완료' ? due : null,
      amount: per,
      status,
    };
  });
};

const SEED: Installment[] = [
  { id: 'INS-001', memberName: '김민준', product: 'PT 30회 패키지', source: '현장 결제 연계', prepaid: 300000, totalAmount: 600000, totalRounds: 3, rounds: buildRounds(600000, 3, '2026-03', 2) },
  { id: 'INS-002', memberName: '이서연', product: '연간 회원권', source: '미수금 전환', prepaid: 0, totalAmount: 1200000, totalRounds: 6, rounds: buildRounds(1200000, 6, '2026-02', 2, [2]) },
  { id: 'INS-003', memberName: '박지호', product: 'PT 20회 패키지', source: '직접 등록', prepaid: 100000, totalAmount: 500000, totalRounds: 5, rounds: buildRounds(500000, 5, '2025-12', 5) },
  { id: 'INS-004', memberName: '최유나', product: '필라테스 6개월', source: '현장 결제 연계', prepaid: 130000, totalAmount: 650000, totalRounds: 3, rounds: buildRounds(650000, 3, '2026-04', 1, [1]) },
  { id: 'INS-005', memberName: '정재원', product: 'PT 50회 패키지', source: '직접 등록', prepaid: 500000, totalAmount: 1000000, totalRounds: 5, rounds: buildRounds(1000000, 5, '2026-03', 3), refundInProgress: true },
];

const STATUS_VARIANT: Record<InstallmentStatus, 'success' | 'warning' | 'error'> = {
  진행중: 'warning',
  완납: 'success',
  미납: 'error',
};
const ROUND_VARIANT: Record<RoundStatus, 'success' | 'default' | 'error'> = {
  완료: 'success',
  예정: 'default',
  미납: 'error',
};

const TABS = [
  { key: 'ALL', label: '전체' },
  { key: '진행중', label: '진행중' },
  { key: '완납', label: '완납' },
  { key: '미납', label: '미납' },
];

const SOURCE_OPTIONS = ['전체', '현장 결제 연계', '미수금 전환', '직접 등록'];

export default function InstallmentPage() {
  const authUser = useAuthStore((s) => s.user);
  // SAL-EXT-01-07: 할부 등록은 manager 이상에게만 노출
  const canRegister = authUser?.isSuperAdmin || isRoleAtLeast(normalizeRole(authUser?.role ?? ''), 'manager');

  const [contracts, setContracts] = useState<Installment[]>(SEED);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('전체');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // DLG-S008 납입 처리 / DLG-S009 할부 등록 모달 상태
  const [payModal, setPayModal] = useState<{ contract: Installment; round: InstallmentRound } | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regForm, setRegForm] = useState({ memberName: '', product: '', prepaid: 0, totalAmount: 0, rounds: 3, startDue: getNextMonthValue() });
  const todayStr = fmtLocal(new Date());

  // 요약 지표 (SAL-EXT-01-01)
  const stats = useMemo(() => {
    const inProgress = contracts.filter(c => deriveStatus(c) === '진행중').length;
    const thisMonth = todayStr.slice(0, 7);
    const dueThisMonth = contracts.filter(c => c.rounds.some(r => r.status !== '완료' && r.dueDate.slice(0, 7) === thisMonth)).length;
    const paidThisMonth = contracts.filter(c => c.rounds.some(r => r.status === '완료' && r.paidDate?.slice(0, 7) === thisMonth)).length;
    const overdueTotal = contracts.reduce((s, c) => s + c.rounds.filter(r => r.status === '미납').reduce((a, r) => a + r.amount, 0), 0);
    return { inProgress, dueThisMonth, paidThisMonth, overdueTotal };
  }, [contracts]);

  const tabsWithCount = useMemo(() => TABS.map(t => ({
    ...t,
    count: t.key === 'ALL' ? contracts.length : contracts.filter(c => deriveStatus(c) === t.key).length,
  })), [contracts]);

  // 탭 + 검색 + 출처 필터
  const filtered = useMemo(() => {
    return contracts.filter(c => {
      const matchTab = activeTab === 'ALL' || deriveStatus(c) === activeTab;
      const matchSearch = !search.trim() || c.memberName.includes(search.trim());
      const matchSource = sourceFilter === '전체' || c.source === sourceFilter;
      return matchTab && matchSearch && matchSource;
    });
  }, [contracts, activeTab, search, sourceFilter]);

  // DLG-S008: 납입 처리
  const openPay = (contract: Installment, round: InstallmentRound) => {
    if (contract.refundInProgress) {
      toast.error('환불 진행 중인 계약입니다.');
      return;
    }
    setPayModal({ contract, round });
    setPayAmount(round.amount);
  };

  const handlePay = () => {
    if (!payModal) return;
    // 예외처리: 입금액 < 회차 금액
    if (payAmount < payModal.round.amount) {
      toast.error('회차 금액에 미달합니다.');
      return;
    }
    setContracts(prev => prev.map(c => {
      if (c.id !== payModal.contract.id) return c;
      return {
        ...c,
        rounds: c.rounds.map(r => r.no === payModal.round.no ? { ...r, status: '완료' as RoundStatus, paidDate: todayStr } : r),
      };
    }));
    setPayModal(null);
    toast.success('처리되었습니다.');
  };

  // DLG-S009: 할부 등록
  const handleRegister = () => {
    if (!regForm.memberName.trim() || !regForm.product.trim()) {
      toast.error('회원명과 상품명을 입력해주세요.');
      return;
    }
    if (regForm.rounds > 24) {
      toast.error('할부는 최대 24회까지 가능합니다.');
      return;
    }
    const per = regForm.rounds > 0 ? Math.round(regForm.totalAmount / regForm.rounds) : 0;
    if (per < 10000) {
      toast.error('회차당 최소 10,000원 이상이어야 합니다.');
      return;
    }
    const id = `INS-${String(contracts.length + 1).padStart(3, '0')}`;
    setContracts(prev => [
      {
        id,
        memberName: regForm.memberName.trim(),
        product: regForm.product.trim(),
        source: '직접 등록',
        prepaid: regForm.prepaid,
        totalAmount: regForm.totalAmount,
        totalRounds: regForm.rounds,
        rounds: buildRounds(regForm.totalAmount, regForm.rounds, regForm.startDue, 0),
      },
      ...prev,
    ]);
    setRegisterOpen(false);
    setRegForm({ memberName: '', product: '', prepaid: 0, totalAmount: 0, rounds: 3, startDue: getNextMonthValue() });
    toast.success('등록되었습니다.');
  };

  return (
    <AppLayout>
      <PageHeader
        title="할부결제 관리"
        description="정기 분납 계약의 회차별 납입 현황을 추적하고 미납 회차를 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            {canRegister && (
              <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setRegisterOpen(true)}>
                할부 등록
              </Button>
            )}
            <Button variant="outline" size="sm" icon={<Download size={15} />} onClick={() => toast.success(`${filtered.length}건 엑셀 다운로드 완료`)}>
              엑셀 다운로드
            </Button>
          </div>
        }
      />

      {/* 요약 지표 카드 (SAL-EXT-01-01) */}
      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label="진행 중인 할부 계약" value={`${stats.inProgress}건`} icon={<CreditCard />} variant="peach" />
        <StatCard label="이번 달 납입 예정" value={`${stats.dueThisMonth}건`} icon={<CalendarClock />} />
        <StatCard label="이번 달 납입 완료" value={`${stats.paidThisMonth}건`} icon={<CheckCircle2 />} variant="mint" />
        <StatCard
          label="미납 총액"
          value={formatKRW(stats.overdueTotal)}
          icon={<AlertTriangle />}
          className={stats.overdueTotal > 0 ? 'border-state-error/20' : ''}
        />
      </StatCardGrid>

      {/* 탭 + 검색 + 출처 필터 */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="flex flex-col gap-md border-b border-line p-lg lg:flex-row lg:items-center lg:justify-between">
          <TabNav tabs={tabsWithCount} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex items-center gap-sm">
            <div className="relative w-[200px]">
              <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
              <input
                type="text"
                placeholder="회원명 검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-[6px] bg-surface-secondary border border-line rounded-lg text-[13px] text-content placeholder-content-tertiary focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="w-[150px]">
              <Select
                options={SOURCE_OPTIONS.map(s => ({ value: s, label: s }))}
                value={sourceFilter}
                onChange={setSourceFilter}
              />
            </div>
          </div>
        </div>

        {/* 4축 상태: 빈(검색/탭) / 정상(목록) */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={search ? '검색 결과가 없어요' : '해당 상태의 할부 계약이 없어요'}
            description={search ? '회원명을 다시 확인하거나 검색어를 비워보세요.' : '다른 상태 탭이나 계약 출처 필터로 변경해 보세요.'}
            action={search ? { label: '검색 초기화', onClick: () => setSearch('') } : undefined}
          />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-surface-secondary/85">
              <tr className="text-[11px] font-black uppercase tracking-[0.12em] text-content-secondary">
                <th className="px-3 py-3 text-left">회원명</th>
                <th className="px-3 py-3 text-left">상품 · 출처</th>
                <th className="px-3 py-3 text-right">선납금</th>
                <th className="px-3 py-3 text-right">총 할부 / 잔여</th>
                <th className="px-3 py-3 text-center">납입 회차</th>
                <th className="px-3 py-3 text-center">다음 납입일</th>
                <th className="px-3 py-3 text-center">상태</th>
                <th className="px-3 py-3 text-center">회차</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map(c => {
                const status = deriveStatus(c);
                const expanded = expandedId === c.id;
                return (
                  <React.Fragment key={c.id}>
                    <tr className="transition-colors hover:bg-surface-secondary/70">
                      <td className="px-3 py-3 font-semibold text-content">{c.memberName}</td>
                      <td className="px-3 py-3">
                        <div className="text-content">{c.product}</div>
                        <div className="mt-[2px] text-[11px] text-content-tertiary">{c.source}</div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{c.prepaid > 0 ? formatKRW(c.prepaid) : '-'}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <div className="font-semibold text-content">{formatKRW(c.totalAmount)}</div>
                        <div className={cn('text-[11px]', remainingAmount(c) > 0 ? 'text-primary' : 'text-content-tertiary')}>
                          잔여 {formatKRW(remainingAmount(c))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">{paidCount(c)} / {c.totalRounds}</td>
                      <td className="px-3 py-3 text-center tabular-nums">
                        <span className={cn(status === '미납' && 'font-semibold text-state-error')}>{nextDue(c)}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge variant={STATUS_VARIANT[status]} dot>{status}</StatusBadge>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => setExpandedId(expanded ? null : c.id)}
                          className="inline-flex items-center gap-[3px] rounded-md border border-line px-sm py-[3px] text-[11px] font-semibold text-content-secondary hover:bg-surface-tertiary transition-colors"
                        >
                          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          회차
                        </button>
                      </td>
                    </tr>
                    {/* 회차별 납입 현황 펼침 (SAL-EXT-01-05) */}
                    {expanded && (
                      <tr>
                        <td colSpan={8} className="bg-surface-secondary/40 px-lg py-md">
                          {c.refundInProgress && (
                            <div className="mb-sm flex items-center gap-xs rounded-lg border border-state-error/30 bg-red-50 px-md py-sm text-[12px] text-state-error">
                              <AlertTriangle size={14} />
                              환불 진행 중인 계약입니다. 납입 처리가 차단됩니다.
                            </div>
                          )}
                          <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
                            {c.rounds.map(r => (
                              <div
                                key={r.no}
                                className={cn(
                                  'flex items-center justify-between rounded-xl border px-md py-sm',
                                  r.status === '미납' ? 'border-state-error/30 bg-red-50/50' : 'border-line bg-surface'
                                )}
                              >
                                <div>
                                  <div className="flex items-center gap-xs">
                                    <span className="text-[12px] font-bold text-content">{r.no}회차</span>
                                    <StatusBadge variant={ROUND_VARIANT[r.status]} dot>{r.status}</StatusBadge>
                                  </div>
                                  <div className="mt-[2px] text-[11px] text-content-secondary tabular-nums">
                                    예정 {r.dueDate}{r.paidDate ? ` · 완료 ${r.paidDate}` : ''}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-xs">
                                  <span className="text-[12px] font-semibold tabular-nums text-content">{formatKRW(r.amount)}</span>
                                  {r.status !== '완료' && (
                                    <Button variant="primary" size="sm" disabled={c.refundInProgress} onClick={() => openPay(c, r)}>
                                      납입 처리
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* DLG-S008 납입 처리 */}
      <Modal
        isOpen={payModal !== null}
        onClose={() => setPayModal(null)}
        title="납입 처리"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setPayModal(null)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handlePay}>납입 확정</Button>
          </div>
        }
      >
        {payModal && (
          <div className="space-y-md">
            <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
              <p className="text-[13px] font-bold text-content">{payModal.contract.memberName} · {payModal.round.no}회차</p>
              <p className="mt-[2px] text-[12px] text-content-secondary">{payModal.contract.product} · 예정일 {payModal.round.dueDate}</p>
            </div>
            <Input
              label="입금액"
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(Number(e.target.value) || 0)}
              hint={`회차 금액 ${formatKRW(payModal.round.amount)}`}
              error={payAmount < payModal.round.amount ? '회차 금액에 미달합니다.' : undefined}
            />
          </div>
        )}
      </Modal>

      {/* DLG-S009 할부 등록 */}
      <Modal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="할부 등록"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setRegisterOpen(false)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleRegister}>등록</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <div className="grid grid-cols-2 gap-md">
            <Input label="회원명" value={regForm.memberName} onChange={e => setRegForm(p => ({ ...p, memberName: e.target.value }))} placeholder="회원명" />
            <Input label="상품명" value={regForm.product} onChange={e => setRegForm(p => ({ ...p, product: e.target.value }))} placeholder="상품명" />
          </div>
          <div className="grid grid-cols-2 gap-md">
            <Input label="선납금" type="number" value={regForm.prepaid} onChange={e => setRegForm(p => ({ ...p, prepaid: Number(e.target.value) || 0 }))} />
            <Input label="총 할부 금액(선납 제외)" type="number" value={regForm.totalAmount} onChange={e => setRegForm(p => ({ ...p, totalAmount: Number(e.target.value) || 0 }))} />
          </div>
          <div className="grid grid-cols-2 gap-md">
            <Input
              label="총 회차"
              type="number"
              value={regForm.rounds}
              onChange={e => setRegForm(p => ({ ...p, rounds: Number(e.target.value) || 1 }))}
              hint="최대 24회 · 회차당 최소 10,000원"
            />
            <Input label="첫 납입월" type="month" value={regForm.startDue} onChange={e => setRegForm(p => ({ ...p, startDue: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
