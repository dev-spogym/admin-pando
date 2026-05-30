'use client';
export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Banknote,
  Landmark,
  RefreshCw,
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
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/exportExcel';

// ─── SCR-S009 할부결제 관리 (SAL-EXT-01) ──────────────────────────────────────
// docs4/V1/D03-매출관리/매출관리.md ## SCR-S009
// 정기 분납 계약의 전체 현황 + 회차별 납입 추적 + 미납 관리.
// DLG-S007 할부 상세 / DLG-S008 납입 처리 / DLG-S009 할부 등록.

type InstallmentStatus = '진행중' | '완납' | '미납';
type ContractSource = '현장 결제 연계' | '미수금 전환' | '직접 등록';
type RoundStatus = '완료' | '예정' | '미납';
type PaymentMethodCode = 'CARD' | 'CASH' | 'TRANSFER';
type CashReceiptType = 'income' | 'expense';

interface InstallmentRound {
  id: number;
  no: number;
  dueDate: string;
  paidAt: string | null;
  amount: number;
  paidAmount: number;
  status: RoundStatus;
  method: PaymentMethodCode | null;
}

interface Installment {
  id: number;
  contractNo: string;
  memberId: number;
  memberName: string;
  productId: number | null;
  product: string;
  source: ContractSource;
  sourceSaleId: number | null;
  internalApprovalNo: string;
  prepaid: number;
  totalAmount: number;
  totalRounds: number;
  rounds: InstallmentRound[];
  refundInProgress: boolean;
  memo: string;
  createdAt: string;
}

interface MemberOption {
  id: number;
  name: string;
  phone: string | null;
  status: string | null;
}

interface ProductOption {
  id: number;
  name: string;
  price: number;
  category: string | null;
}

type PaymentForm = {
  amount: string;
  method: PaymentMethodCode;
  paidAt: string;
  approvalNo: string;
  terminalId: string;
  externalTransactionId: string;
  bankPayerName: string;
  transferConfirmNo: string;
  cashReceiptIssued: boolean;
  cashReceiptType: CashReceiptType;
  cashReceiptIdentifier: string;
  memo: string;
};

type RegisterForm = {
  memberId: string;
  productId: string;
  prepaid: string;
  totalAmount: string;
  rounds: string;
  startDue: string;
  memo: string;
};

const fmtLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toDateTimeLocalValue = (date = new Date()) => {
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
};

const getNextMonthValue = () => {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

const parseMoney = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const createDefaultPaymentForm = (amount = 0): PaymentForm => ({
  amount: amount > 0 ? String(amount) : '',
  method: 'CARD',
  paidAt: toDateTimeLocalValue(),
  approvalNo: '',
  terminalId: '',
  externalTransactionId: '',
  bankPayerName: '',
  transferConfirmNo: '',
  cashReceiptIssued: false,
  cashReceiptType: 'income',
  cashReceiptIdentifier: '',
  memo: '',
});

const createDefaultRegisterForm = (): RegisterForm => ({
  memberId: '',
  productId: '',
  prepaid: '0',
  totalAmount: '',
  rounds: '3',
  startDue: getNextMonthValue(),
  memo: '',
});

const isPastDue = (date: string) => {
  if (!date) return false;
  return date < fmtLocal(new Date());
};

const deriveRoundStatus = (round: Pick<InstallmentRound, 'status' | 'dueDate'>): RoundStatus => {
  if (round.status === '완료') return '완료';
  return isPastDue(round.dueDate) ? '미납' : '예정';
};

const paidCount = (i: Installment) => i.rounds.filter(r => r.status === '완료').length;
const paidAmount = (i: Installment) => i.rounds.reduce((s, r) => s + r.paidAmount, 0);
const remainingAmount = (i: Installment) => Math.max(0, i.totalAmount - paidAmount(i));
const hasOverdue = (i: Installment) => i.rounds.some(r => deriveRoundStatus(r) === '미납');
const nextDue = (i: Installment) => {
  const next = i.rounds.find(r => r.status !== '완료');
  return next ? next.dueDate : '-';
};
const deriveStatus = (i: Installment): InstallmentStatus => {
  if (i.rounds.length > 0 && i.rounds.every(r => r.status === '완료')) return '완납';
  if (hasOverdue(i)) return '미납';
  return '진행중';
};

const buildRoundRows = (contractId: number, total: number, count: number, startMonth: string) => {
  const [year, month] = startMonth.split('-').map(Number);
  const base = Math.floor(total / count);
  const remainder = total - base * count;

  return Array.from({ length: count }, (_, idx) => {
    const due = new Date(year, month - 1 + idx, 5);
    return {
      contractId,
      roundNo: idx + 1,
      dueDate: fmtLocal(due),
      amount: idx === count - 1 ? base + remainder : base,
      status: '예정',
    };
  });
};

const createContractNo = () => {
  const now = new Date();
  return `INS-${fmtLocal(now).replace(/-/g, '')}-${String(now.getTime()).slice(-5)}`;
};

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

const PAYMENT_METHOD_LABEL: Record<PaymentMethodCode, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
};

const PAYMENT_METHOD_ICON: Record<PaymentMethodCode, React.ReactNode> = {
  CARD: <CreditCard size={14} />,
  CASH: <Banknote size={14} />,
  TRANSFER: <Landmark size={14} />,
};

const TABS = [
  { key: 'ALL', label: '전체' },
  { key: '진행중', label: '진행중' },
  { key: '완납', label: '완납' },
  { key: '미납', label: '미납' },
];

const SOURCE_OPTIONS = ['전체', '현장 결제 연계', '미수금 전환', '직접 등록'];

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

export default function InstallmentPage() {
  const authUser = useAuthStore((s) => s.user);
  const canRegister = Boolean(authUser?.isSuperAdmin || isRoleAtLeast(normalizeRole(authUser?.role ?? ''), 'manager'));

  const [contracts, setContracts] = useState<Installment[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('전체');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [payModal, setPayModal] = useState<{ contract: Installment; round: InstallmentRound } | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(() => createDefaultPaymentForm());
  const [isPaying, setIsPaying] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regForm, setRegForm] = useState<RegisterForm>(() => createDefaultRegisterForm());
  const todayStr = fmtLocal(new Date());

  const mapContractRow = (row: Record<string, unknown>): Installment => {
    const rawRounds = Array.isArray(row.installment_rounds) ? row.installment_rounds as Record<string, unknown>[] : [];
    const rounds = rawRounds
      .map((round) => {
        const mapped: InstallmentRound = {
          id: Number(round.id),
          no: Number(round.roundNo),
          dueDate: String(round.dueDate ?? '').slice(0, 10),
          paidAt: round.paidAt ? String(round.paidAt).slice(0, 10) : null,
          amount: parseMoney(round.amount as string | number),
          paidAmount: parseMoney(round.paidAmount as string | number),
          status: (round.status as RoundStatus) ?? '예정',
          method: (round.method as PaymentMethodCode | null) ?? null,
        };
        return { ...mapped, status: deriveRoundStatus(mapped) };
      })
      .sort((a, b) => a.no - b.no);

    return {
      id: Number(row.id),
      contractNo: String(row.contractNo ?? ''),
      memberId: Number(row.memberId),
      memberName: String(row.memberName ?? ''),
      productId: row.productId ? Number(row.productId) : null,
      product: String(row.productName ?? ''),
      source: (row.source as ContractSource) ?? '직접 등록',
      sourceSaleId: row.sourceSaleId ? Number(row.sourceSaleId) : null,
      internalApprovalNo: String(row.internalApprovalNo ?? ''),
      prepaid: parseMoney(row.prepaidAmount as string | number),
      totalAmount: parseMoney(row.totalAmount as string | number),
      totalRounds: Number(row.roundCount) || rounds.length,
      rounds,
      refundInProgress: Boolean(row.refundInProgress),
      memo: String(row.memo ?? ''),
      createdAt: String(row.createdAt ?? '').slice(0, 10),
    };
  };

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    const branchId = getBranchId();
    const [contractResult, memberResult, productResult] = await Promise.all([
      supabase
        .from('installment_contracts')
        .select('*, installment_rounds(*)')
        .eq('branchId', branchId)
        .order('createdAt', { ascending: false }),
      supabase
        .from('members')
        .select('id, name, phone, status')
        .eq('branchId', branchId)
        .is('deletedAt', null)
        .order('name', { ascending: true })
        .limit(300),
      supabase
        .from('products')
        .select('id, name, price, category, isActive')
        .eq('branchId', branchId)
        .eq('isActive', true)
        .order('name', { ascending: true })
        .limit(300),
    ]);

    setIsLoading(false);

    if (contractResult.error) {
      console.error('할부 계약 로드 실패:', contractResult.error);
      toast.error(`할부 계약을 불러오지 못했습니다: ${contractResult.error.message}`);
      return;
    }
    if (memberResult.error) {
      console.error('회원 옵션 로드 실패:', memberResult.error);
      toast.error('회원 목록을 불러오지 못했습니다.');
    }
    if (productResult.error) {
      console.error('상품 옵션 로드 실패:', productResult.error);
      toast.error('상품 목록을 불러오지 못했습니다.');
    }

    setContracts((contractResult.data ?? []).map(row => mapContractRow(row as Record<string, unknown>)));
    setMembers((memberResult.data ?? []).map(row => ({
      id: Number(row.id),
      name: String(row.name ?? ''),
      phone: row.phone ? String(row.phone) : null,
      status: row.status ? String(row.status) : null,
    })));
    setProducts((productResult.data ?? []).map(row => ({
      id: Number(row.id),
      name: String(row.name ?? ''),
      price: parseMoney(row.price as string | number),
      category: row.category ? String(row.category) : null,
    })));
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const stats = useMemo(() => {
    const inProgress = contracts.filter(c => deriveStatus(c) === '진행중').length;
    const thisMonth = todayStr.slice(0, 7);
    const dueThisMonth = contracts.filter(c => c.rounds.some(r => r.status !== '완료' && r.dueDate.slice(0, 7) === thisMonth)).length;
    const paidThisMonth = contracts.filter(c => c.rounds.some(r => r.status === '완료' && r.paidAt?.slice(0, 7) === thisMonth)).length;
    const overdueTotal = contracts.reduce((s, c) => s + c.rounds.filter(r => deriveRoundStatus(r) === '미납').reduce((a, r) => a + Math.max(0, r.amount - r.paidAmount), 0), 0);
    return { inProgress, dueThisMonth, paidThisMonth, overdueTotal };
  }, [contracts, todayStr]);

  const tabsWithCount = useMemo(() => TABS.map(t => ({
    ...t,
    count: t.key === 'ALL' ? contracts.length : contracts.filter(c => deriveStatus(c) === t.key).length,
  })), [contracts]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return contracts.filter(c => {
      const matchTab = activeTab === 'ALL' || deriveStatus(c) === activeTab;
      const matchSearch = !keyword ||
        c.memberName.toLowerCase().includes(keyword) ||
        c.product.toLowerCase().includes(keyword) ||
        c.contractNo.toLowerCase().includes(keyword) ||
        c.internalApprovalNo.toLowerCase().includes(keyword);
      const matchSource = sourceFilter === '전체' || c.source === sourceFilter;
      return matchTab && matchSearch && matchSource;
    });
  }, [contracts, activeTab, search, sourceFilter]);

  const openPay = (contract: Installment, round: InstallmentRound) => {
    if (contract.refundInProgress) {
      toast.error('환불 진행 중인 계약입니다.');
      return;
    }
    setPayModal({ contract, round });
    setPaymentForm(createDefaultPaymentForm(round.amount));
  };

  const updatePaymentForm = (patch: Partial<PaymentForm>) => {
    setPaymentForm(prev => ({ ...prev, ...patch }));
  };

  const validatePayment = (round: InstallmentRound, form: PaymentForm) => {
    const amount = parseMoney(form.amount);
    if (amount <= 0) return '납입액은 0원보다 커야 합니다.';
    if (amount !== round.amount) return '납입액은 회차 금액과 일치해야 합니다.';
    if (!form.paidAt) return '납입 일시를 입력해주세요.';
    if (form.method === 'CARD' && !form.approvalNo.trim()) return '카드 납입은 카드 승인번호를 입력해야 합니다.';
    if (form.method === 'TRANSFER' && !form.bankPayerName.trim()) return '계좌이체 납입은 입금자명을 입력해야 합니다.';
    if (form.method === 'TRANSFER' && !form.transferConfirmNo.trim()) return '계좌이체 납입은 이체확인번호를 입력해야 합니다.';
    if ((form.method === 'CASH' || form.method === 'TRANSFER') && form.cashReceiptIssued && !form.cashReceiptIdentifier.trim()) {
      return '현금영수증 처리 시 식별번호를 입력해야 합니다.';
    }
    if (Number.isNaN(new Date(form.paidAt).getTime())) return '납입 일시 형식이 올바르지 않습니다.';
    return null;
  };

  const handlePay = async () => {
    if (!payModal) return;
    const validation = validatePayment(payModal.round, paymentForm);
    if (validation) {
      toast.error(validation);
      return;
    }

    const amount = parseMoney(paymentForm.amount);
    setIsPaying(true);
    const { error } = await supabase.rpc('process_installment_round_payment', {
      p_round_id: payModal.round.id,
      p_method: paymentForm.method,
      p_amount: amount,
      p_paid_at: new Date(paymentForm.paidAt).toISOString(),
      p_approval_no: paymentForm.method === 'CARD' ? paymentForm.approvalNo.trim() : null,
      p_terminal_id: paymentForm.terminalId.trim() || null,
      p_external_transaction_id: paymentForm.externalTransactionId.trim() || null,
      p_bank_payer_name: paymentForm.method === 'TRANSFER' ? paymentForm.bankPayerName.trim() : null,
      p_transfer_confirm_no: paymentForm.method === 'TRANSFER' ? paymentForm.transferConfirmNo.trim() : null,
      p_cash_receipt_issued: paymentForm.method === 'CASH' || paymentForm.method === 'TRANSFER'
        ? paymentForm.cashReceiptIssued
        : false,
      p_cash_receipt_type: paymentForm.cashReceiptIssued ? paymentForm.cashReceiptType : null,
      p_cash_receipt_identifier: paymentForm.cashReceiptIssued ? paymentForm.cashReceiptIdentifier.trim() : null,
      p_memo: paymentForm.memo.trim() || null,
      p_processed_by: authUser?.name ?? null,
    });
    setIsPaying(false);

    if (error) {
      toast.error(`납입 처리 실패: ${error.message}`);
      return;
    }

    toast.success(`${payModal.contract.memberName} ${payModal.round.no}회차 납입 처리되었습니다.`);
    setPayModal(null);
    setPaymentForm(createDefaultPaymentForm());
    fetchContracts();
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => String(p.id) === productId);
    setRegForm(prev => ({
      ...prev,
      productId,
      totalAmount: product && !prev.totalAmount ? String(product.price) : prev.totalAmount,
    }));
  };

  const handleRegister = async () => {
    const selectedMember = members.find(m => String(m.id) === regForm.memberId);
    const selectedProduct = products.find(p => String(p.id) === regForm.productId);
    const totalAmount = parseMoney(regForm.totalAmount);
    const prepaid = parseMoney(regForm.prepaid);
    const rounds = Number(regForm.rounds) || 0;

    if (!selectedMember) {
      toast.error('회원 검색 후 등록할 회원을 선택해주세요.');
      return;
    }
    if (!selectedProduct) {
      toast.error('상품을 선택해주세요.');
      return;
    }
    if (rounds < 1 || rounds > 24) {
      toast.error('할부는 1회 이상 24회 이하로 등록할 수 있습니다.');
      return;
    }
    if (totalAmount <= 0) {
      toast.error('총 할부 금액을 입력해주세요.');
      return;
    }
    if (Math.floor(totalAmount / rounds) < 10000) {
      toast.error('회차당 최소 10,000원 이상이어야 합니다.');
      return;
    }
    if (!regForm.startDue) {
      toast.error('첫 납입월을 입력해주세요.');
      return;
    }

    const branchId = getBranchId();
    const contractNo = createContractNo();
    const startDueDate = `${regForm.startDue}-05`;
    const { data: contract, error } = await supabase
      .from('installment_contracts')
      .insert({
        contractNo,
        branchId,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        source: '직접 등록',
        internalApprovalNo: contractNo,
        prepaidAmount: prepaid,
        totalAmount,
        roundCount: rounds,
        status: '진행중',
        startDueDate,
        memo: regForm.memo.trim() || null,
      })
      .select('id')
      .single();

    if (error || !contract) {
      toast.error(`할부 계약 등록 실패: ${error?.message ?? '계약 ID를 확인할 수 없습니다.'}`);
      return;
    }

    const contractId = Number(contract.id);
    const roundRows = buildRoundRows(contractId, totalAmount, rounds, regForm.startDue);
    const { error: roundError } = await supabase.from('installment_rounds').insert(roundRows);

    if (roundError) {
      await supabase.from('installment_contracts').delete().eq('id', contractId);
      toast.error(`할부 회차 생성 실패: ${roundError.message}`);
      return;
    }

    toast.success('할부 계약이 등록되었습니다.');
    setRegisterOpen(false);
    setRegForm(createDefaultRegisterForm());
    fetchContracts();
  };

  const handleDownload = () => {
    exportToExcel(
      filtered.map(contract => ({
        contractNo: contract.contractNo,
        memberName: contract.memberName,
        productName: contract.product,
        source: contract.source,
        prepaid: contract.prepaid,
        totalAmount: contract.totalAmount,
        paidAmount: paidAmount(contract),
        remainingAmount: remainingAmount(contract),
        totalRounds: contract.totalRounds,
        paidRounds: paidCount(contract),
        nextDueDate: nextDue(contract),
        status: deriveStatus(contract),
      })),
      [
        { key: 'contractNo', header: '할부번호' },
        { key: 'memberName', header: '회원명' },
        { key: 'productName', header: '상품명' },
        { key: 'source', header: '계약 출처' },
        { key: 'prepaid', header: '선납금' },
        { key: 'totalAmount', header: '총 할부금액' },
        { key: 'paidAmount', header: '납입 완료 금액' },
        { key: 'remainingAmount', header: '잔여 금액' },
        { key: 'totalRounds', header: '총 회차' },
        { key: 'paidRounds', header: '납입 회차' },
        { key: 'nextDueDate', header: '다음 납입일' },
        { key: 'status', header: '상태' },
      ],
      { filename: '할부결제관리' }
    );
    toast.success(`${filtered.length}건 엑셀 다운로드 완료`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="할부결제 관리"
        description="정기 분납 계약의 회차별 납입 현황을 추적하고 미납 회차를 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            <Button variant="outline" size="sm" icon={<RefreshCw size={15} />} onClick={fetchContracts}>
              새로고침
            </Button>
            {canRegister && (
              <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setRegisterOpen(true)}>
                할부 등록
              </Button>
            )}
            <Button variant="outline" size="sm" icon={<Download size={15} />} onClick={handleDownload}>
              엑셀 다운로드
            </Button>
          </div>
        }
      />

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

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="flex flex-col gap-md border-b border-line p-lg lg:flex-row lg:items-center lg:justify-between">
          <TabNav tabs={tabsWithCount} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
              <input
                type="text"
                placeholder="회원명·상품·승인번호 검색"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-[6px] bg-surface-secondary border border-line rounded-lg text-[13px] text-content placeholder-content-tertiary focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="w-full sm:w-[150px]">
              <Select
                options={SOURCE_OPTIONS.map(s => ({ value: s, label: s }))}
                value={sourceFilter}
                onChange={setSourceFilter}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-lg py-12 text-center text-[13px] text-content-secondary">할부 계약을 불러오는 중입니다.</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={search ? '검색 결과가 없어요' : '해당 상태의 할부 계약이 없어요'}
            description={search ? '회원명, 상품명, 할부번호 또는 내부 승인번호를 다시 확인해주세요.' : '할부 등록 버튼으로 직접 등록 계약을 생성할 수 있습니다.'}
            action={search ? { label: '검색 초기화', onClick: () => setSearch('') } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-[13px]">
              <thead className="bg-surface-secondary/85">
                <tr className="text-[11px] font-black uppercase tracking-[0.12em] text-content-secondary">
                  <th className="px-3 py-3 text-left">회원명</th>
                  <th className="px-3 py-3 text-left">상품 · 출처</th>
                  <th className="px-3 py-3 text-left">내부 승인번호</th>
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
                        <td className="px-3 py-3">
                          <div className="font-semibold text-content">{c.memberName}</div>
                          <div className="mt-[2px] text-[11px] text-content-tertiary">{c.contractNo}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-content">{c.product}</div>
                          <div className="mt-[2px] text-[11px] text-content-tertiary">{c.source}</div>
                        </td>
                        <td className="px-3 py-3 font-mono text-[12px] text-content-secondary">{c.internalApprovalNo}</td>
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
                      {expanded && (
                        <tr>
                          <td colSpan={9} className="bg-surface-secondary/40 px-lg py-md">
                            {c.refundInProgress && (
                              <div className="mb-sm flex items-center gap-xs rounded-lg border border-state-error/30 bg-red-50 px-md py-sm text-[12px] text-state-error">
                                <AlertTriangle size={14} />
                                환불 진행 중인 계약입니다. 납입 처리가 차단됩니다.
                              </div>
                            )}
                            <div className="grid gap-sm sm:grid-cols-2 xl:grid-cols-3">
                              {c.rounds.map(r => (
                                <div
                                  key={r.id}
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
                                      예정 {r.dueDate}{r.paidAt ? ` · 완료 ${r.paidAt}` : ''}
                                    </div>
                                    {r.method && (
                                      <div className="mt-[2px] flex items-center gap-[4px] text-[11px] text-content-tertiary">
                                        {PAYMENT_METHOD_ICON[r.method]}
                                        {PAYMENT_METHOD_LABEL[r.method]}
                                      </div>
                                    )}
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
          </div>
        )}
      </div>

      <Modal
        isOpen={payModal !== null}
        onClose={() => setPayModal(null)}
        title="납입 처리"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setPayModal(null)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handlePay} disabled={isPaying}>
              {isPaying ? '처리 중...' : '납입 확정'}
            </Button>
          </div>
        }
      >
        {payModal && (
          <div className="space-y-md">
            <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
              <p className="text-[13px] font-bold text-content">{payModal.contract.memberName} · {payModal.round.no}회차</p>
              <p className="mt-[2px] text-[12px] text-content-secondary">{payModal.contract.product} · 예정일 {payModal.round.dueDate}</p>
              <p className="mt-[4px] font-mono text-[12px] text-content-tertiary">CRM 내부 승인번호 {payModal.contract.internalApprovalNo}</p>
            </div>
            <div className="grid gap-md sm:grid-cols-2">
              <Input
                label="납입 금액"
                type="number"
                value={paymentForm.amount}
                onChange={e => updatePaymentForm({ amount: e.target.value })}
                hint={`회차 금액 ${formatKRW(payModal.round.amount)}`}
                error={parseMoney(paymentForm.amount) !== payModal.round.amount ? '회차 금액과 일치해야 합니다.' : undefined}
              />
              <Input
                label="납입 일시"
                type="datetime-local"
                value={paymentForm.paidAt}
                onChange={e => updatePaymentForm({ paidAt: e.target.value })}
              />
            </div>
            <div className="grid gap-md sm:grid-cols-2">
              <div>
                <label className="mb-xs block text-[12px] font-semibold text-content-secondary">납입 수단</label>
                <Select
                  value={paymentForm.method}
                  onChange={(value) => updatePaymentForm({ method: value as PaymentMethodCode })}
                  options={[
                    { value: 'CARD', label: '카드' },
                    { value: 'CASH', label: '현금' },
                    { value: 'TRANSFER', label: '계좌이체' },
                  ]}
                />
              </div>
              {paymentForm.method === 'CARD' ? (
                <Input
                  label="카드 승인번호"
                  value={paymentForm.approvalNo}
                  onChange={e => updatePaymentForm({ approvalNo: e.target.value })}
                  placeholder="VAN/POS 승인번호"
                />
              ) : paymentForm.method === 'TRANSFER' ? (
                <Input
                  label="입금자명"
                  value={paymentForm.bankPayerName}
                  onChange={e => updatePaymentForm({ bankPayerName: e.target.value })}
                  placeholder="실제 입금자명"
                />
              ) : (
                <Input
                  label="현금 수납 메모"
                  value={paymentForm.memo}
                  onChange={e => updatePaymentForm({ memo: e.target.value })}
                  placeholder="필요 시 입력"
                />
              )}
            </div>
            {paymentForm.method === 'CARD' && (
              <div className="grid gap-md sm:grid-cols-2">
                <Input label="단말 ID" value={paymentForm.terminalId} onChange={e => updatePaymentForm({ terminalId: e.target.value })} />
                <Input label="외부 거래번호" value={paymentForm.externalTransactionId} onChange={e => updatePaymentForm({ externalTransactionId: e.target.value })} />
              </div>
            )}
            {paymentForm.method === 'TRANSFER' && (
              <div className="grid gap-md sm:grid-cols-2">
                <Input label="이체확인번호" value={paymentForm.transferConfirmNo} onChange={e => updatePaymentForm({ transferConfirmNo: e.target.value })} />
                <Input label="외부 거래번호" value={paymentForm.externalTransactionId} onChange={e => updatePaymentForm({ externalTransactionId: e.target.value })} />
              </div>
            )}
            {(paymentForm.method === 'CASH' || paymentForm.method === 'TRANSFER') && (
              <div className="rounded-xl border border-line bg-surface-secondary/40 p-md">
                <label className="flex items-center gap-sm text-[13px] font-semibold text-content">
                  <input
                    type="checkbox"
                    checked={paymentForm.cashReceiptIssued}
                    onChange={e => updatePaymentForm({ cashReceiptIssued: e.target.checked })}
                    className="h-4 w-4 rounded border-line"
                  />
                  현금영수증 발행
                </label>
                {paymentForm.cashReceiptIssued && (
                  <div className="mt-md grid gap-md sm:grid-cols-2">
                    <div>
                      <label className="mb-xs block text-[12px] font-semibold text-content-secondary">발행 유형</label>
                      <Select
                        value={paymentForm.cashReceiptType}
                        onChange={(value) => updatePaymentForm({ cashReceiptType: value as CashReceiptType })}
                        options={[
                          { value: 'income', label: '소득공제' },
                          { value: 'expense', label: '지출증빙' },
                        ]}
                      />
                    </div>
                    <Input
                      label="식별번호"
                      value={paymentForm.cashReceiptIdentifier}
                      onChange={e => updatePaymentForm({ cashReceiptIdentifier: e.target.value })}
                      placeholder="휴대폰번호 또는 사업자번호"
                    />
                  </div>
                )}
              </div>
            )}
            {paymentForm.method !== 'CASH' && (
              <Input label="처리 메모" value={paymentForm.memo} onChange={e => updatePaymentForm({ memo: e.target.value })} />
            )}
          </div>
        )}
      </Modal>

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
          <div className="grid gap-md sm:grid-cols-2">
            <div>
              <label className="mb-xs block text-[12px] font-semibold text-content-secondary">회원</label>
              <Select
                value={regForm.memberId}
                onChange={(value) => setRegForm(prev => ({ ...prev, memberId: value }))}
                options={[
                  { value: '', label: members.length === 0 ? '등록 가능한 회원 없음' : '회원 선택' },
                  ...members.map(member => ({
                    value: String(member.id),
                    label: `${member.name}${member.phone ? ` · ${member.phone}` : ''}`,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="mb-xs block text-[12px] font-semibold text-content-secondary">상품</label>
              <Select
                value={regForm.productId}
                onChange={handleProductChange}
                options={[
                  { value: '', label: products.length === 0 ? '등록 가능한 상품 없음' : '상품 선택' },
                  ...products.map(product => ({
                    value: String(product.id),
                    label: `${product.name} · ${formatKRW(product.price)}`,
                  })),
                ]}
              />
            </div>
          </div>
          <div className="grid gap-md sm:grid-cols-2">
            <Input label="선납금" type="number" value={regForm.prepaid} onChange={e => setRegForm(p => ({ ...p, prepaid: e.target.value }))} />
            <Input label="총 할부 금액(선납 제외)" type="number" value={regForm.totalAmount} onChange={e => setRegForm(p => ({ ...p, totalAmount: e.target.value }))} />
          </div>
          <div className="grid gap-md sm:grid-cols-2">
            <Input
              label="총 회차"
              type="number"
              value={regForm.rounds}
              onChange={e => setRegForm(p => ({ ...p, rounds: e.target.value }))}
              hint="최대 24회 · 회차당 최소 10,000원"
            />
            <Input label="첫 납입월" type="month" value={regForm.startDue} onChange={e => setRegForm(p => ({ ...p, startDue: e.target.value }))} />
          </div>
          <Input label="등록 메모" value={regForm.memo} onChange={e => setRegForm(p => ({ ...p, memo: e.target.value }))} />
        </div>
      </Modal>
    </AppLayout>
  );
}
