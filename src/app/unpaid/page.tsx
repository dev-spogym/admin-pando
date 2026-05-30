'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Download,
  AlertCircle,
  DollarSign,
  Clock,
  TrendingDown,
  Pencil,
  Link2,
  CreditCard,
  Banknote,
  Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';

import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import { formatKRW } from "@/lib/format";
import TabNav from "@/components/common/TabNav";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import AppLayout from "@/components/layout/AppLayout";
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import PaymentLinkModal, { type PaymentLinkTarget } from '@/components/common/PaymentLinkModal';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/exportExcel';

// 미수금 항목 타입
type UnpaidItem = {
  id: number;
  no: number;
  branchId: number;
  memberName: string;
  memberId: number;
  productId: number | null;
  productName: string;
  amount: number;
  originalAmount: number;
  paidAmount: number;
  approvalNo: string | null;
  paymentMethod: string;
  dueDate: string;
  status: string; // PENDING / PARTIAL / OVERDUE / PAID
  memo: string;
  createdAt: string;
};

type PaymentMethod = 'card' | 'cash' | 'transfer';
type CashReceiptType = 'income' | 'expense';

type UnpaidPaymentForm = {
  amount: string;
  method: PaymentMethod;
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

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: '카드',
  cash: '현금',
  transfer: '계좌이체',
};

const PAYMENT_METHOD_CODE: Record<PaymentMethod, 'CARD' | 'CASH' | 'TRANSFER'> = {
  card: 'CARD',
  cash: 'CASH',
  transfer: 'TRANSFER',
};

const PAYMENT_METHOD_ICON: Record<PaymentMethod, React.ReactNode> = {
  card: <CreditCard size={14} />,
  cash: <Banknote size={14} />,
  transfer: <Landmark size={14} />,
};

// 로컬 날짜 포맷
const fmtLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toDateTimeLocalValue = (date = new Date()) => {
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
};

const createDefaultPaymentForm = (amount = 0): UnpaidPaymentForm => ({
  amount: amount > 0 ? String(amount) : '',
  method: 'card',
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

const parseMoney = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractInternalApprovalNo = (memo: string | null | undefined, approvalNo: string | null | undefined) => {
  const memoMatch = String(memo ?? '').match(/CRM 내부 승인번호:\s*([^\n]+)/);
  if (memoMatch?.[1]) return memoMatch[1].trim();
  const approval = String(approvalNo ?? '').trim();
  return approval || null;
};

const appendMemoLine = (memo: string | null | undefined, line: string) => {
  const current = String(memo ?? '').trim();
  return current ? `${current}\n${line}` : line;
};

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

// 상태 한글 레이블
const STATUS_KO: Record<string, string> = {
  PENDING: '미결제',
  PARTIAL: '일부결제',
  OVERDUE: '연체',
  PAID: '완료',
};

// 상태별 배지 variant
const statusVariant = (status: string) => {
  if (status === '완료') return 'success' as const;
  if (status === '연체') return 'error' as const;
  if (status === '일부결제') return 'warning' as const;
  return 'default' as const;
};

// 연체 여부 판단 (30일 이상)
const isOverdue = (dueDate: string): boolean => {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  const diffMs = today.getTime() - due.getTime();
  return diffMs > 30 * 24 * 60 * 60 * 1000;
};

const FALLBACK_UNPAID_STATUS = ['미결제', '일부결제', '연체'] as const;

const buildFallbackUnpaid = (salesRows: Record<string, unknown>[]): UnpaidItem[] => {
  const candidates = salesRows.filter(row => Number(row.unpaid) > 0);
  const sourceRows = candidates.length > 0 ? candidates : salesRows.slice(0, 8);

  return sourceRows.map((row, idx) => {
    const saleDateRaw = (row.saleDate as string) ?? new Date().toISOString();
    const saleDate = saleDateRaw.slice(0, 10);
    const dueDate = new Date(saleDateRaw);
    dueDate.setDate(dueDate.getDate() + 7 + idx);
    const baseAmount = Number(row.unpaid) || Math.max(Math.round((Number(row.amount) || Number(row.salePrice) || 0) * 0.2), 10000);
    const status = candidates.length > 0
      ? Number(row.unpaid) > 0
        ? idx % 2 === 0 ? '연체' : '미결제'
        : '완료'
      : FALLBACK_UNPAID_STATUS[idx % FALLBACK_UNPAID_STATUS.length];

    return {
      id: Number(row.id) || idx + 1,
      no: sourceRows.length - idx,
      branchId: Number(row.branchId) || getBranchId(),
      memberName: (row.memberName as string) ?? `회원 ${idx + 1}`,
      memberId: Number(row.memberId) || idx + 1,
      productId: Number(row.productId) || null,
      productName: (row.productName as string) ?? '기본 상품',
      amount: baseAmount,
      originalAmount: Number(row.amount) || Number(row.salePrice) || baseAmount,
      paidAmount: Math.max(0, (Number(row.amount) || Number(row.salePrice) || baseAmount) - baseAmount),
      approvalNo: extractInternalApprovalNo(row.memo as string | null, row.approvalNo as string | null),
      paymentMethod: String(row.paymentMethod ?? ''),
      dueDate: dueDate.toISOString().slice(0, 10),
      status,
      memo: status === '일부결제' ? '일부 금액 수납 완료' : status === '연체' ? '연체 고객 추적 필요' : '',
      createdAt: saleDate,
    };
  });
};

export default function UnpaidManagement() {
  const [unpaidData, setUnpaidData] = useState<UnpaidItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // 메모 편집 모달 상태
  const [memoModal, setMemoModal] = useState<{ open: boolean; id: number; memo: string }>({
    open: false, id: 0, memo: '',
  });
  // DLG-S016 결제링크 발송 모달 상태
  const [linkTarget, setLinkTarget] = useState<PaymentLinkTarget | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; item: UnpaidItem | null }>({
    open: false,
    item: null,
  });
  const [paymentForm, setPaymentForm] = useState<UnpaidPaymentForm>(() => createDefaultPaymentForm());
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 결제링크 발송 권한 (Owner/manager 이상)
  const authUser = useAuthStore((s) => s.user);
  const canSendLink = hasPermission(authUser?.role ?? '', '/unpaid', authUser?.isSuperAdmin);

  // 미수금 데이터 조회
  const fetchUnpaid = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('id, branchId, memberId, memberName, productId, productName, amount, salePrice, unpaid, paymentMethod, approvalNo, saleDate, status, createdAt, memo')
      .eq('branchId', getBranchId())
      .gt('unpaid', 0)
      .order('createdAt', { ascending: false });

    setIsLoading(false);

    if (error) {
      console.error('미수금 데이터 로드 실패:', error);
      toast.error('미수금 데이터를 불러오지 못했습니다.');
      return;
    }

    const mapped = (data ?? []).map((row: Record<string, unknown>, idx: number) => {
      const statusEn = (row.status as string) ?? 'UNPAID';
      const currentUnpaid = Number(row.unpaid) || 0;
      const originalAmount = Number(row.amount) || Number(row.salePrice) || currentUnpaid;
      const paidAmount = Math.max(0, originalAmount - currentUnpaid);
      const dueDate = (row.saleDate as string)?.slice(0, 10) ?? '';
      const statusMapped = currentUnpaid <= 0
        ? '완료'
        : paidAmount > 0
          ? '일부결제'
          : isOverdue(dueDate)
            ? '연체'
            : STATUS_KO[statusEn] ?? '미결제';
      return {
        id: row.id as number,
        no: (data ?? []).length - idx,
        branchId: Number(row.branchId) || getBranchId(),
        memberName: (row.memberName as string) ?? '',
        memberId: (row.memberId as number) ?? 0,
        productId: row.productId ? Number(row.productId) : null,
        productName: (row.productName as string) ?? '',
        amount: currentUnpaid,
        originalAmount,
        paidAmount,
        approvalNo: extractInternalApprovalNo(row.memo as string | null, row.approvalNo as string | null),
        paymentMethod: String(row.paymentMethod ?? ''),
        dueDate,
        status: statusMapped,
        memo: String(row.memo ?? ''),
        createdAt: (row.createdAt as string)?.slice(0, 10) ?? '',
      };
    });

    setUnpaidData(mapped);
  }, []);

  useEffect(() => {
    fetchUnpaid();
  }, [fetchUnpaid]);

  // debounce 검색
  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  // 탭별 + 검색 필터링
  const filteredData = useMemo(() => {
    return unpaidData.filter(item => {
      const matchSearch = item.memberName.includes(debouncedSearch);
      const matchTab =
        activeTab === 'ALL' ||
        (activeTab === 'PENDING' && item.status === '미결제') ||
        (activeTab === 'PARTIAL' && item.status === '일부결제') ||
        (activeTab === 'OVERDUE' && item.status === '연체') ||
        (activeTab === 'PAID' && item.status === '완료');
      return matchSearch && matchTab;
    });
  }, [unpaidData, debouncedSearch, activeTab]);

  // 통계 집계
  const stats = useMemo(() => {
    const active = unpaidData.filter(i => i.status !== '완료');
    const totalAmount = active.reduce((s, i) => s + i.amount, 0);
    const totalCount = active.length;
    const overdueCount = active.filter(i => isOverdue(i.dueDate)).length;
    // 이번달 완료 합계
    const thisMonth = fmtLocal(new Date()).slice(0, 7);
    const recovered = unpaidData
      .filter(i => i.status === '완료' && i.createdAt.slice(0, 7) === thisMonth)
      .reduce((s, i) => s + i.amount, 0);
    const avgUnpaid = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;
    return { totalAmount, totalCount, overdueCount, recovered, avgUnpaid };
  }, [unpaidData]);

  // 결제완료 처리
  const handleMarkPaid = async (id: number) => {
    const { error } = await supabase
      .from('sales')
      .update({ status: 'COMPLETED', unpaid: 0 })
      .eq('id', id);
    if (error) {
      toast.error('상태 변경에 실패했습니다.');
      return;
    }
    toast.success('결제 완료 처리되었습니다.');
    fetchUnpaid();
  };

  // 상태 변경 처리
  const handleChangeStatus = async (id: number, newStatusKo: string) => {
    const koToEn: Record<string, string> = { 미결제: 'UNPAID', 일부결제: 'UNPAID', 연체: 'UNPAID', 완료: 'COMPLETED' };
    const unpaidVal = newStatusKo === '완료' ? 0 : undefined;
    const updatePayload: Record<string, unknown> = { status: koToEn[newStatusKo] ?? newStatusKo };
    if (unpaidVal !== undefined) updatePayload.unpaid = unpaidVal;
    const { error } = await supabase
      .from('sales')
      .update(updatePayload)
      .eq('id', id);
    if (error) {
      toast.error('상태 변경에 실패했습니다.');
      return;
    }
    toast.success('상태가 변경되었습니다.');
    fetchUnpaid();
  };

  const openPaymentModal = (item: UnpaidItem) => {
    setPaymentForm(createDefaultPaymentForm(item.amount));
    setPaymentModal({ open: true, item });
  };

  const updatePaymentForm = (patch: Partial<UnpaidPaymentForm>) => {
    setPaymentForm(prev => ({ ...prev, ...patch }));
  };

  const validatePaymentForm = (item: UnpaidItem, form: UnpaidPaymentForm) => {
    const amount = parseMoney(form.amount);
    if (!item.approvalNo) return '원 결제의 CRM 내부 승인번호가 없어 미수금 납부를 처리할 수 없습니다.';
    if (amount <= 0) return '납부액은 0원보다 커야 합니다.';
    if (amount > item.amount) return '납부액은 현재 미수 잔액을 초과할 수 없습니다.';
    if (!form.paidAt) return '납부 일시를 입력해주세요.';
    if (form.method === 'card' && !form.approvalNo.trim()) return '카드 납부는 카드 승인번호를 입력해야 합니다.';
    if (form.method === 'transfer' && !form.bankPayerName.trim()) return '계좌이체 납부는 입금자명을 입력해야 합니다.';
    if (form.method === 'transfer' && !form.transferConfirmNo.trim()) return '계좌이체 납부는 이체확인번호를 입력해야 합니다.';
    if ((form.method === 'cash' || form.method === 'transfer') && form.cashReceiptIssued && !form.cashReceiptIdentifier.trim()) {
      return '현금영수증 처리 시 식별번호를 입력해야 합니다.';
    }
    if (Number.isNaN(new Date(form.paidAt).getTime())) return '납부 일시 형식이 올바르지 않습니다.';
    return null;
  };

  const handleSubmitUnpaidPayment = async () => {
    const item = paymentModal.item;
    if (!item) return;

    const validationMessage = validatePaymentForm(item, paymentForm);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const amount = parseMoney(paymentForm.amount);
    const remaining = Math.max(0, item.amount - amount);
    setIsPaymentSubmitting(true);

    const { error } = await supabase.rpc('process_unpaid_collection', {
      p_sale_id: item.id,
      p_branch_id: item.branchId,
      p_member_id: item.memberId,
      p_internal_approval_no: item.approvalNo,
      p_method: PAYMENT_METHOD_CODE[paymentForm.method],
      p_amount: amount,
      p_paid_at: new Date(paymentForm.paidAt).toISOString(),
      p_approval_no: paymentForm.method === 'card' ? paymentForm.approvalNo.trim() : null,
      p_terminal_id: paymentForm.terminalId.trim() || null,
      p_external_transaction_id: paymentForm.externalTransactionId.trim() || null,
      p_bank_payer_name: paymentForm.method === 'transfer' ? paymentForm.bankPayerName.trim() : null,
      p_transfer_confirm_no: paymentForm.method === 'transfer' ? paymentForm.transferConfirmNo.trim() : null,
      p_cash_receipt_issued: paymentForm.method === 'cash' || paymentForm.method === 'transfer'
        ? paymentForm.cashReceiptIssued
        : false,
      p_cash_receipt_type: paymentForm.cashReceiptIssued ? paymentForm.cashReceiptType : null,
      p_cash_receipt_identifier: paymentForm.cashReceiptIssued ? paymentForm.cashReceiptIdentifier.trim() : null,
      p_memo: paymentForm.memo.trim() || null,
      p_processed_by: authUser?.name ?? null,
    });

    setIsPaymentSubmitting(false);

    if (error) {
      toast.error(`미수금 납부 처리 실패: ${error.message}`);
      return;
    }

    toast.success(remaining === 0 ? '미수금이 완납 처리되었습니다.' : `미수금 ${formatKRW(amount)} 납부 처리되었습니다.`);
    setPaymentModal({ open: false, item: null });
    setPaymentForm(createDefaultPaymentForm());
    fetchUnpaid();
  };

  // 상태별 전환 가능 옵션
  const getNextStatuses = (current: string): string[] => {
    if (current === '미결제') return ['일부결제', '완료'];
    if (current === '일부결제') return ['완료'];
    if (current === '연체') return ['일부결제', '완료'];
    return [];
  };

  // 메모 저장 (sales 테이블에 memo 컬럼이 없어 로컬 상태에만 반영)
  const handleSaveMemo = async () => {
    const { error } = await supabase
      .from('sales')
      .update({ memo: memoModal.memo })
      .eq('id', memoModal.id);

    if (error) {
      toast.error('메모 저장에 실패했습니다.');
      return;
    }

    setUnpaidData(prev =>
      prev.map(item => item.id === memoModal.id ? { ...item, memo: memoModal.memo } : item)
    );
    toast.success('메모가 저장되었습니다.');
    setMemoModal({ open: false, id: 0, memo: '' });
  };

  // 엑셀 다운로드
  const handleDownloadExcel = () => {
    const exportColumns = [
      { key: 'memberName', header: '회원명' },
      { key: 'productName', header: '상품명' },
      { key: 'approvalNo', header: '원결제ID' },
      { key: 'originalAmount', header: '원결제금액' },
      { key: 'paidAmount', header: '기납부액' },
      { key: 'amount', header: '미수금액' },
      { key: 'dueDate', header: '결제기한' },
      { key: 'status', header: '상태' },
      { key: 'memo', header: '메모' },
      { key: 'createdAt', header: '등록일' },
    ];
    exportToExcel(filteredData as Record<string, unknown>[], exportColumns, { filename: '미수금관리' });
    toast.success(`${filteredData.length}건 엑셀 다운로드 완료`);
  };

  // 탭 정의
  const tabs = [
    { key: 'ALL', label: '전체', count: unpaidData.length },
    { key: 'PENDING', label: '미결제', count: unpaidData.filter(i => i.status === '미결제').length },
    { key: 'PARTIAL', label: '일부결제', count: unpaidData.filter(i => i.status === '일부결제').length },
    { key: 'OVERDUE', label: '연체', count: unpaidData.filter(i => i.status === '연체').length },
    { key: 'PAID', label: '완료', count: unpaidData.filter(i => i.status === '완료').length },
  ];

  // 테이블 컬럼
  const columns = [
    { key: 'no', header: 'No', width: 60, align: 'center' as const },
    {
      key: 'memberName', header: '회원명', width: 120,
      render: (val: string, row: UnpaidItem) => (
        <button
          className="text-primary hover:underline font-medium transition-colors"
          onClick={() => moveToPage(985, { id: row.memberId })}
        >
          {val}
        </button>
      ),
    },
    { key: 'productName', header: '상품명', width: 200 },
    {
      key: 'approvalNo', header: '원결제ID', width: 160,
      render: (v: string | null) => (
        <span className={cn('font-mono text-[12px]', v ? 'text-content-secondary' : 'text-state-error')}>
          {v ?? '확인 필요'}
        </span>
      ),
    },
    {
      key: 'paidAmount', header: '기납부액', width: 120, align: 'right' as const,
      render: (v: number) => <span className="tabular-nums text-content-secondary">{formatKRW(v)}</span>,
    },
    {
      key: 'amount', header: '미수금액', width: 130, align: 'right' as const,
      render: (v: number) => (
        <span className="font-semibold tabular-nums text-state-error">{formatKRW(v)}</span>
      ),
    },
    { key: 'dueDate', header: '결제기한', width: 130,
      render: (v: string) => (
        <span className={cn(isOverdue(v) && v ? 'text-state-error font-semibold' : '')}>{v || '-'}</span>
      ),
    },
    {
      key: 'status', header: '상태', width: 100, align: 'center' as const,
      render: (val: string) => (
        <StatusBadge variant={statusVariant(val)} dot>{val}</StatusBadge>
      ),
    },
    { key: 'memo', header: '메모', width: 180,
      render: (val: string) => <span className="text-content-tertiary text-[12px]">{val}</span>,
    },
    { key: 'createdAt', header: '등록일', width: 120 },
    {
      key: 'id', header: '액션', width: 360, align: 'center' as const,
      render: (_val: unknown, row: UnpaidItem) => {
        const nextStatuses = getNextStatuses(row.status);
        return (
          <div className="flex items-center justify-center gap-xs">
            {row.status !== '완료' && (
              <button
                onClick={() => openPaymentModal(row)}
                className="flex items-center gap-[4px] px-sm py-[3px] bg-primary text-white rounded-md text-[11px] font-semibold hover:bg-primary-dark transition-colors"
              >
                <DollarSign size={11} />
                납부
              </button>
            )}
            {nextStatuses.length > 0 && (
              <Select
                options={nextStatuses.map(s => ({ value: s, label: s }))}
                value=""
                onChange={v => { if (v) handleChangeStatus(row.id, v); }}
                placeholder="상태변경"
              />
            )}
            <button
              onClick={() => setMemoModal({ open: true, id: row.id, memo: row.memo })}
              className="flex items-center gap-[4px] px-sm py-[3px] bg-surface border border-line text-content-secondary rounded-md text-[11px] font-semibold hover:bg-surface-tertiary transition-colors"
            >
              <Pencil size={11} />
              메모
            </button>
            {/* DLG-S016 결제링크 발송: V2/후속 범위 식별용 */}
            {row.status !== '완료' && (
              <button
                onClick={() =>
                  setLinkTarget({
                    memberName: row.memberName,
                    phone: '010-0000-0000',
                    appLinked: row.memberId % 2 === 0,
                    productName: row.productName,
                    amount: row.amount,
                  })
                }
                className="flex items-center gap-[4px] px-sm py-[3px] rounded-md border border-red-200 bg-red-50 text-red-700 text-[11px] font-semibold hover:bg-red-100 transition-colors"
              >
                <Link2 size={11} />
                결제링크 V2/후속
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const paymentItem = paymentModal.item;
  const paymentAmount = parseMoney(paymentForm.amount);
  const paymentRemaining = paymentItem ? Math.max(0, paymentItem.amount - paymentAmount) : 0;

  return (
    <AppLayout>
      <PageHeader
        title="미수금 관리"
        description="미결제 내역을 추적하고 관리합니다."
        actions={
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-xs px-md py-sm bg-surface border border-line text-content-secondary rounded-button text-[13px] font-semibold hover:bg-surface-tertiary transition-colors"
          >
            <Download size={15} />
            엑셀 다운로드
          </button>
        }
      />

      {/* 통계 카드 */}
      <StatCardGrid cols={5} className="mb-xl">
        <StatCard
          label="미수금 총액"
          value={formatKRW(stats.totalAmount)}
          variant="peach"
          icon={<DollarSign />}
        />
        <StatCard
          label="미수금 건수"
          value={`${stats.totalCount}건`}
          icon={<AlertCircle />}
        />
        <StatCard
          label="연체 (30일+)"
          value={`${stats.overdueCount}건`}
          icon={<Clock />}
          className={stats.overdueCount > 0 ? 'border-state-error/20' : ''}
        />
        <StatCard
          label="이번달 회수"
          value={formatKRW(stats.recovered)}
          variant="mint"
          icon={<TrendingDown />}
        />
        <StatCard
          label="평균 미수금"
          value={formatKRW(stats.avgUnpaid)}
          description="건당 평균 미수금액"
        />
      </StatCardGrid>

      {/* 탭 + 검색 + 테이블 */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md p-lg border-b border-line">
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="relative w-full sm:w-[240px]">
            <input
              type="text"
              placeholder="회원명 검색..."
              value={searchValue}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-[6px] bg-surface-secondary border border-line rounded-lg text-[13px] text-content placeholder-content-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
            <AlertCircle className="absolute left-[10px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          pagination={{ page: 1, pageSize: 20, total: filteredData.length }}
          emptyMessage={debouncedSearch ? "검색 결과가 없습니다." : "미수금 내역이 없습니다."}
        />
      </div>

      {/* 메모 편집 모달 */}
      {memoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-xl border border-line shadow-xl w-[400px] p-xl">
            <h2 className="text-Section-Title text-content mb-md">메모 편집</h2>
            <Textarea
              value={memoModal.memo}
              onChange={e => setMemoModal(prev => ({ ...prev, memo: e.target.value }))}
              placeholder="메모를 입력하세요..."
              rows={5}
            />
            <div className="flex justify-end gap-sm mt-md">
              <button
                onClick={() => setMemoModal({ open: false, id: 0, memo: '' })}
                className="px-md py-sm border border-line text-content-secondary rounded-button text-[13px] font-semibold hover:bg-surface-tertiary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveMemo}
                className="px-md py-sm bg-primary text-surface rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DLG-S008 미수금 납입 처리 모달 */}
      {paymentModal.open && paymentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-lg">
          <div className="flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
            <div className="border-b border-line px-xl py-lg">
              <h2 className="text-Section-Title text-content">미수금 납부 처리</h2>
              <p className="mt-xs text-[13px] text-content-secondary">
                원 결제의 CRM 내부 승인번호를 유지하고 이번 납부 수납 행만 추가합니다.
              </p>
            </div>

            <div className="overflow-y-auto px-xl py-lg">
              <div className="grid grid-cols-1 gap-md rounded-lg border border-line bg-surface-secondary p-md sm:grid-cols-2">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary">회원</span>
                  <span className="mt-1 block text-[14px] font-semibold text-content">{paymentItem.memberName}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary">상품</span>
                  <span className="mt-1 block text-[14px] font-semibold text-content">{paymentItem.productName || '-'}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary">CRM 내부 승인번호</span>
                  <span className="mt-1 block font-mono text-[13px] font-semibold text-content">
                    {paymentItem.approvalNo ?? '확인 필요'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-sm">
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary">원결제</span>
                    <span className="mt-1 block text-[13px] font-semibold text-content">{formatKRW(paymentItem.originalAmount)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary">기납부</span>
                    <span className="mt-1 block text-[13px] font-semibold text-content-secondary">{formatKRW(paymentItem.paidAmount)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary">현재 미수</span>
                    <span className="mt-1 block text-[13px] font-semibold text-state-error">{formatKRW(paymentItem.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-lg grid grid-cols-1 gap-lg lg:grid-cols-[1fr_280px]">
                <div className="space-y-md">
                  <label className="block">
                    <span className="mb-xs block text-[12px] font-semibold text-content-secondary">납부액</span>
                    <input
                      type="number"
                      min={1}
                      max={paymentItem.amount}
                      value={paymentForm.amount}
                      onChange={e => updatePaymentForm({ amount: e.target.value })}
                      className="w-full rounded-button border border-line bg-surface px-md py-sm text-[14px] text-content focus:border-primary focus:outline-none"
                      placeholder="납부액"
                    />
                  </label>

                  <div>
                    <span className="mb-xs block text-[12px] font-semibold text-content-secondary">수납 방식</span>
                    <div className="grid grid-cols-3 gap-sm">
                      {(['card', 'cash', 'transfer'] as PaymentMethod[]).map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => updatePaymentForm({
                            method,
                            cashReceiptIssued: method === 'card' ? false : paymentForm.cashReceiptIssued,
                          })}
                          className={cn(
                            'flex h-10 items-center justify-center gap-xs rounded-button border px-sm text-[13px] font-semibold transition-colors',
                            paymentForm.method === method
                              ? 'border-primary bg-primary text-white'
                              : 'border-line bg-surface text-content-secondary hover:bg-surface-tertiary'
                          )}
                        >
                          {PAYMENT_METHOD_ICON[method]}
                          {PAYMENT_METHOD_LABEL[method]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-xs block text-[12px] font-semibold text-content-secondary">납부 일시</span>
                    <input
                      type="datetime-local"
                      value={paymentForm.paidAt}
                      onChange={e => updatePaymentForm({ paidAt: e.target.value })}
                      className="w-full rounded-button border border-line bg-surface px-md py-sm text-[14px] text-content focus:border-primary focus:outline-none"
                    />
                  </label>

                  {paymentForm.method === 'card' && (
                    <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-xs block text-[12px] font-semibold text-content-secondary">카드 승인번호</span>
                        <input
                          type="text"
                          value={paymentForm.approvalNo}
                          onChange={e => updatePaymentForm({ approvalNo: e.target.value })}
                          className="w-full rounded-button border border-line bg-surface px-md py-sm text-[14px] text-content focus:border-primary focus:outline-none"
                          placeholder="승인번호"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-xs block text-[12px] font-semibold text-content-secondary">단말 ID</span>
                        <input
                          type="text"
                          value={paymentForm.terminalId}
                          onChange={e => updatePaymentForm({ terminalId: e.target.value })}
                          className="w-full rounded-button border border-line bg-surface px-md py-sm text-[14px] text-content focus:border-primary focus:outline-none"
                          placeholder="선택"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-xs block text-[12px] font-semibold text-content-secondary">외부 거래번호</span>
                        <input
                          type="text"
                          value={paymentForm.externalTransactionId}
                          onChange={e => updatePaymentForm({ externalTransactionId: e.target.value })}
                          className="w-full rounded-button border border-line bg-surface px-md py-sm text-[14px] text-content focus:border-primary focus:outline-none"
                          placeholder="선택"
                        />
                      </label>
                    </div>
                  )}

                  {paymentForm.method === 'transfer' && (
                    <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-xs block text-[12px] font-semibold text-content-secondary">입금자명</span>
                        <input
                          type="text"
                          value={paymentForm.bankPayerName}
                          onChange={e => updatePaymentForm({ bankPayerName: e.target.value })}
                          className="w-full rounded-button border border-line bg-surface px-md py-sm text-[14px] text-content focus:border-primary focus:outline-none"
                          placeholder="실제 입금자명"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-xs block text-[12px] font-semibold text-content-secondary">이체확인번호</span>
                        <input
                          type="text"
                          value={paymentForm.transferConfirmNo}
                          onChange={e => updatePaymentForm({ transferConfirmNo: e.target.value })}
                          className="w-full rounded-button border border-line bg-surface px-md py-sm text-[14px] text-content focus:border-primary focus:outline-none"
                          placeholder="이체확인번호"
                        />
                      </label>
                    </div>
                  )}

                  {(paymentForm.method === 'cash' || paymentForm.method === 'transfer') && (
                    <div className="rounded-lg border border-line p-md">
                      <div className="flex items-center justify-between gap-md">
                        <div>
                          <p className="text-[13px] font-semibold text-content">현금영수증 처리</p>
                          <p className="text-[12px] text-content-tertiary">현금/계좌이체 납부 시 발행 정보를 남깁니다.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updatePaymentForm({ cashReceiptIssued: !paymentForm.cashReceiptIssued })}
                          className={cn(
                            'rounded-full px-3 py-1 text-[12px] font-bold transition-colors',
                            paymentForm.cashReceiptIssued
                              ? 'bg-primary text-white'
                              : 'border border-line bg-surface text-content-secondary'
                          )}
                        >
                          {paymentForm.cashReceiptIssued ? '처리' : '미처리'}
                        </button>
                      </div>
                      {paymentForm.cashReceiptIssued && (
                        <div className="mt-md grid grid-cols-1 gap-md sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-xs block text-[12px] font-semibold text-content-secondary">발행 유형</span>
                            <select
                              value={paymentForm.cashReceiptType}
                              onChange={e => updatePaymentForm({ cashReceiptType: e.target.value as CashReceiptType })}
                              className="w-full rounded-button border border-line bg-surface px-md py-sm text-[14px] text-content focus:border-primary focus:outline-none"
                            >
                              <option value="income">소득공제</option>
                              <option value="expense">지출증빙</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-xs block text-[12px] font-semibold text-content-secondary">식별번호</span>
                            <input
                              type="text"
                              value={paymentForm.cashReceiptIdentifier}
                              onChange={e => updatePaymentForm({ cashReceiptIdentifier: e.target.value })}
                              className="w-full rounded-button border border-line bg-surface px-md py-sm text-[14px] text-content focus:border-primary focus:outline-none"
                              placeholder="휴대폰/사업자번호"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  <label className="block">
                    <span className="mb-xs block text-[12px] font-semibold text-content-secondary">처리 메모</span>
                    <Textarea
                      value={paymentForm.memo}
                      onChange={e => updatePaymentForm({ memo: e.target.value })}
                      rows={3}
                      placeholder="납부 관련 메모를 입력하세요."
                    />
                  </label>
                </div>

                <div className="h-fit rounded-lg border border-line bg-surface-secondary p-md">
                  <h3 className="text-[13px] font-bold text-content">납부 후 잔액</h3>
                  <div className="mt-md space-y-sm text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-content-secondary">현재 미수</span>
                      <span className="font-semibold text-content">{formatKRW(paymentItem.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-secondary">이번 납부</span>
                      <span className="font-semibold text-primary">{formatKRW(paymentAmount)}</span>
                    </div>
                    <div className="border-t border-line pt-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold text-content">잔액</span>
                        <span className={cn('font-bold', paymentRemaining > 0 ? 'text-state-error' : 'text-state-success')}>
                          {formatKRW(paymentRemaining)}
                        </span>
                      </div>
                      <p className="mt-xs text-[12px] text-content-tertiary">
                        {paymentRemaining > 0 ? '잔액이 남아 일부결제로 유지됩니다.' : '잔액 0원으로 완료 처리됩니다.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-sm border-t border-line px-xl py-md">
              <button
                onClick={() => {
                  setPaymentModal({ open: false, item: null });
                  setPaymentForm(createDefaultPaymentForm());
                }}
                disabled={isPaymentSubmitting}
                className="px-md py-sm border border-line text-content-secondary rounded-button text-[13px] font-semibold hover:bg-surface-tertiary transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmitUnpaidPayment}
                disabled={isPaymentSubmitting}
                className="px-md py-sm bg-primary text-surface rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {isPaymentSubmitting ? '처리 중...' : '납부 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DLG-S016 결제링크 발송 모달 */}
      <PaymentLinkModal
        isOpen={linkTarget !== null}
        onClose={() => setLinkTarget(null)}
        target={linkTarget}
        canSend={canSendLink}
        v2Only
      />
    </AppLayout>
  );
}
