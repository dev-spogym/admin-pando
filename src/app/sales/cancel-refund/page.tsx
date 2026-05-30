'use client';
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, RefreshCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/layout/AppLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Payment {
  id: number;
  memberId: number;
  memberName: string;
  productId: number | null;
  product: string;
  amount: number;
  paidAt: string;
  method: string;
  type: string;
  round: string | null;
  staffId: number | null;
  staffName: string | null;
  durationMonths: number | null;
  approvalNo: string | null;
  memo: string | null;
  cardAmount: number;
  cashAmount: number;
  mileageAmount: number;
  paymentLines: PaymentLine[];
}

interface PaymentLine {
  key: string;
  id: number | null;
  saleId: number;
  productId: number | null;
  productName: string;
  method: string;
  amount: number;
  refundedAmount: number;
  remainingAmount: number;
  approvalNo: string | null;
  terminalId: string | null;
  externalTransactionId: string | null;
  bankPayerName: string | null;
  transferConfirmNo: string | null;
}

const cancelReasons = ['단순 변심', '서비스 불만족', '중복 결제', '회원 요청', '결제 오류', '기타'];
const METHOD_KO: Record<string, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
  MILEAGE: '포인트',
  MIXED: '혼합결제',
};

type ActionType = 'cancel' | 'partial';
type SettlementMode = 'PRODUCT_REFUND' | 'COLLECTION_CANCEL';
type RefundMethod = 'ORIGINAL' | 'CARD' | 'CASH' | 'TRANSFER' | 'MILEAGE' | 'MIXED';
type ProcessStatus = '요청' | '승인대기' | '완료';
type ResultStatus = 'success' | null;

interface ManualPolicyForm {
  usedDeductionAmount: string;
  penaltyAmount: string;
  previousRefundAmount: string;
  availableRefundAmount: string;
  adjustmentReason: string;
  refundMethod: RefundMethod;
  externalStatus: string;
  evidenceMemo: string;
  processStatus: ProcessStatus;
  approvalMemo: string;
  paymentBranch: string;
  usageBranch: string;
  salesAttributionBranch: string;
  settlementBranch: string;
  incentiveOwner: string;
  customReason: string;
}

const initialManualPolicyForm: ManualPolicyForm = {
  usedDeductionAmount: '',
  penaltyAmount: '',
  previousRefundAmount: '',
  availableRefundAmount: '',
  adjustmentReason: '',
  refundMethod: 'ORIGINAL',
  externalStatus: '외부 환불 완료',
  evidenceMemo: '',
  processStatus: '완료',
  approvalMemo: '',
  paymentBranch: '',
  usageBranch: '',
  salesAttributionBranch: '',
  settlementBranch: '',
  incentiveOwner: '',
  customReason: '',
};

const processStatusToDbStatus: Record<ProcessStatus, string> = {
  요청: 'REFUND_REQUESTED',
  승인대기: 'REFUND_PENDING',
  완료: 'REFUNDED',
};

const parseMoney = (value: string) => {
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
};

const paymentLineKey = (line: Pick<PaymentLine, 'key'>) => line.key;

const createAllocationDraft = (lines: PaymentLine[], amount: number) => {
  let remaining = Math.max(0, Math.round(amount));
  return lines.reduce<Record<string, string>>((acc, line) => {
    const allocation = Math.min(line.remainingAmount, remaining);
    acc[paymentLineKey(line)] = allocation > 0 ? String(allocation) : '';
    remaining -= allocation;
    return acc;
  }, {});
};

const toMethodCode = (label: string | null | undefined) => {
  const normalized = String(label ?? '').trim().toUpperCase();
  if (normalized.includes('카드') || normalized === 'CARD') return 'CARD';
  if (normalized.includes('현금') || normalized === 'CASH') return 'CASH';
  if (normalized.includes('계좌') || normalized === 'TRANSFER') return 'TRANSFER';
  if (normalized.includes('포인트') || normalized.includes('마일리지') || normalized === 'MILEAGE') return 'MILEAGE';
  if (normalized.includes('혼합') || normalized === 'MIXED') return 'MIXED';
  return 'CARD';
};

const resolveAllocationMethod = (
  lineMethod: string,
  refundMethod: RefundMethod,
  settlementMode: SettlementMode,
) => {
  if (settlementMode === 'COLLECTION_CANCEL') return toMethodCode(lineMethod);
  if (refundMethod === 'ORIGINAL' || refundMethod === 'MIXED') return toMethodCode(lineMethod);
  return toMethodCode(refundMethod);
};

const extractInternalApprovalNo = (memo: string | null | undefined, approvalNo: string | null | undefined) => {
  const memoMatch = String(memo ?? '').match(/CRM 내부 승인번호:\s*([^\n]+)/);
  if (memoMatch?.[1]) return memoMatch[1].trim();
  const approval = String(approvalNo ?? '').trim();
  return approval || null;
};

const parsePaymentLinesFromMemo = (sale: {
  id: number;
  productId: number | null;
  productName: string;
  memo: string | null;
}) => {
  const marker = '상품별 수납:';
  if (!sale.memo?.includes(marker)) return [];

  const section = sale.memo
    .slice(sale.memo.indexOf(marker) + marker.length)
    .split('\n결제일시:')[0]
    .trim();

  return section
    .split('\n')
    .map((raw, index): PaymentLine | null => {
      const parts = raw.split('|').map((part) => part.trim()).filter(Boolean);
      if (parts.length < 3) return null;

      const method = toMethodCode(parts[1]);
      const amount = parseMoney(parts[2]);
      if (amount <= 0) return null;

      const approvalNo = parts.find((part) => part.startsWith('카드 승인번호'))?.replace('카드 승인번호', '').trim() || null;
      const terminalId = parts.find((part) => part.startsWith('단말 ID'))?.replace('단말 ID', '').trim() || null;
      const externalTransactionId = parts.find((part) => part.startsWith('외부 거래번호'))?.replace('외부 거래번호', '').trim() || null;
      const bankPayerName = parts.find((part) => part.startsWith('입금자명'))?.replace('입금자명', '').trim() || null;
      const transferConfirmNo = parts.find((part) => part.startsWith('이체확인번호'))?.replace('이체확인번호', '').trim() || null;

      return {
        key: `memo-${sale.id}-${index}`,
        id: null,
        saleId: sale.id,
        productId: sale.productId,
        productName: parts[0].replace(/\sx\d+$/, '') || sale.productName,
        method,
        amount,
        refundedAmount: 0,
        remainingAmount: amount,
        approvalNo,
        terminalId,
        externalTransactionId,
        bankPayerName,
        transferConfirmNo,
      };
    })
    .filter((line): line is PaymentLine => Boolean(line));
};

const buildFallbackPaymentLines = (sale: {
  id: number;
  productId: number | null;
  productName: string;
  amount: number;
  method: string;
  approvalNo: string | null;
  memo: string | null;
  cardAmount: number;
  cashAmount: number;
  mileageAmount: number;
}) => {
  const memoLines = parsePaymentLinesFromMemo(sale);
  if (memoLines.length > 0) return memoLines;

  const aggregateLines = [
    { method: 'CARD', amount: sale.cardAmount, name: '카드 수납' },
    { method: 'CASH', amount: sale.cashAmount, name: '현금/계좌 수납' },
    { method: 'MILEAGE', amount: sale.mileageAmount, name: '포인트 사용' },
  ].filter((line) => line.amount > 0);

  const lines = aggregateLines.length > 0
    ? aggregateLines
    : [{ method: sale.method, amount: sale.amount, name: sale.productName }];

  return lines.map((line, index): PaymentLine => ({
    key: `fallback-${sale.id}-${index}`,
    id: null,
    saleId: sale.id,
    productId: sale.productId,
    productName: line.name === sale.productName ? sale.productName : `${sale.productName} / ${line.name}`,
    method: toMethodCode(line.method),
    amount: Math.round(line.amount),
    refundedAmount: 0,
    remainingAmount: Math.round(line.amount),
    approvalNo: sale.approvalNo,
    terminalId: null,
    externalTransactionId: null,
    bankPayerName: null,
    transferConfirmNo: null,
  }));
};

const getBranchId = () => {
  if (typeof window === 'undefined') return 1;
  return Number(localStorage.getItem('branchId') ?? 1) || 1;
};

const approvalNo = () => `RF${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 9000) + 1000}`;

function CancelRefundContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedSaleId = searchParams?.get('saleId') ?? null;
  const linkedApprovalNo = searchParams?.get('approvalNo') ?? null;
  const [query, setQuery] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [initialSelectionApplied, setInitialSelectionApplied] = useState(false);
  const [action, setAction] = useState<ActionType>('cancel');
  const [settlementMode, setSettlementMode] = useState<SettlementMode>('PRODUCT_REFUND');
  const [partialAmount, setPartialAmount] = useState('');
  const [reason, setReason] = useState(cancelReasons[0]);
  const [manualPolicy, setManualPolicy] = useState<ManualPolicyForm>(initialManualPolicyForm);
  const [refundAllocations, setRefundAllocations] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ResultStatus>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateManualPolicy = <K extends keyof ManualPolicyForm>(key: K, value: ManualPolicyForm[K]) => {
    setManualPolicy((prev) => ({ ...prev, [key]: value }));
  };

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('id, memberId, memberName, productId, productName, amount, saleDate, paymentMethod, type, round, staffId, staffName, durationMonths, approvalNo, memo, card, cash, mileageUsed')
      .eq('branchId', getBranchId())
      .eq('status', 'COMPLETED')
      .gt('amount', 0)
      .order('saleDate', { ascending: false })
      .limit(150);

    setLoading(false);

    if (error) {
      toast.error(`결제 내역 조회 실패: ${error.message}`);
      return;
    }

    const saleRows = (data ?? []).map((row: Record<string, unknown>) => ({
      id: Number(row.id),
      memberId: Number(row.memberId),
      memberName: String(row.memberName ?? ''),
      productId: row.productId == null ? null : Number(row.productId),
      product: String(row.productName ?? row.type ?? '상품 미지정'),
      amount: Math.round(Number(row.amount) || 0),
      paidAt: String(row.saleDate ?? '').slice(0, 10),
      method: String(row.paymentMethod ?? 'CARD'),
      type: String(row.type ?? '환불'),
      round: row.round == null ? null : String(row.round),
      staffId: row.staffId == null ? null : Number(row.staffId),
      staffName: row.staffName == null ? null : String(row.staffName),
      durationMonths: row.durationMonths == null ? null : Number(row.durationMonths),
      approvalNo: extractInternalApprovalNo(
        row.memo == null ? null : String(row.memo),
        row.approvalNo == null ? null : String(row.approvalNo),
      ),
      memo: row.memo == null ? null : String(row.memo),
      cardAmount: Math.round(Number(row.card) || 0),
      cashAmount: Math.round(Number(row.cash) || 0),
      mileageAmount: Math.round(Number(row.mileageUsed) || 0),
      paymentLines: [] as PaymentLine[],
    }));

    const saleIds = saleRows.map((row) => row.id);
    const paymentLinesBySaleId = new Map<number, PaymentLine[]>();

    if (saleIds.length > 0) {
      const { data: lineRows, error: lineError } = await supabase
        .from('sale_payment_lines')
        .select('id, saleId, productId, productName, method, amount, refundedAmount, approvalNo, terminalId, externalTransactionId, bankPayerName, transferConfirmNo')
        .in('saleId', saleIds)
        .eq('lineType', 'PAYMENT')
        .order('id', { ascending: true });

      if (!lineError && lineRows && lineRows.length > 0) {
        const lineIds = lineRows.map((line: Record<string, unknown>) => Number(line.id));
        const refundedByLineId = new Map<number, number>();

        const { data: refundLineRows } = await supabase
          .from('sale_payment_lines')
          .select('originalLineId, amount')
          .eq('lineType', 'REFUND')
          .in('originalLineId', lineIds);

        (refundLineRows ?? []).forEach((line: Record<string, unknown>) => {
          const originalLineId = Number(line.originalLineId);
          refundedByLineId.set(originalLineId, (refundedByLineId.get(originalLineId) ?? 0) + Math.round(Number(line.amount) || 0));
        });

        lineRows.forEach((line: Record<string, unknown>) => {
          const id = Number(line.id);
          const saleId = Number(line.saleId);
          const amount = Math.round(Number(line.amount) || 0);
          const storedRefundedAmount = Math.round(Number(line.refundedAmount) || 0);
          const refundedAmount = Math.max(storedRefundedAmount, refundedByLineId.get(id) ?? 0);
          const paymentLine: PaymentLine = {
            key: `db-${id}`,
            id,
            saleId,
            productId: line.productId == null ? null : Number(line.productId),
            productName: String(line.productName ?? '상품 미지정'),
            method: String(line.method ?? 'CARD'),
            amount,
            refundedAmount,
            remainingAmount: Math.max(0, amount - refundedAmount),
            approvalNo: line.approvalNo == null ? null : String(line.approvalNo),
            terminalId: line.terminalId == null ? null : String(line.terminalId),
            externalTransactionId: line.externalTransactionId == null ? null : String(line.externalTransactionId),
            bankPayerName: line.bankPayerName == null ? null : String(line.bankPayerName),
            transferConfirmNo: line.transferConfirmNo == null ? null : String(line.transferConfirmNo),
          };
          paymentLinesBySaleId.set(saleId, [...(paymentLinesBySaleId.get(saleId) ?? []), paymentLine]);
        });
      } else if (lineError) {
        toast.warning(`상품별 수납 행을 불러오지 못해 결제 집계값으로 표시합니다: ${lineError.message}`);
      }
    }

    setPayments(saleRows.map((row) => {
      const dbLines = paymentLinesBySaleId.get(row.id) ?? [];
      const fallbackLines = buildFallbackPaymentLines({
        id: row.id,
        productId: row.productId,
        productName: row.product,
        amount: row.amount,
        method: row.method,
        approvalNo: row.approvalNo,
        memo: row.memo,
        cardAmount: row.cardAmount,
        cashAmount: row.cashAmount,
        mileageAmount: row.mileageAmount,
      });

      return {
        ...row,
        paymentLines: dbLines.length > 0 ? dbLines : fallbackLines,
      };
    }));
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filtered = payments.filter(
    (p) => p.memberName.includes(query) || String(p.id).includes(query) || (p.approvalNo ?? '').includes(query) || p.product.includes(query)
  );

  const resetFlow = useCallback(() => {
    setResult(null);
    setSelected(null);
    setPartialAmount('');
    setReason(cancelReasons[0]);
    setAction('cancel');
    setSettlementMode('PRODUCT_REFUND');
    setManualPolicy(initialManualPolicyForm);
    setRefundAllocations({});
    setConfirmOpen(false);
    setIsSubmitting(false);
  }, []);

  const usedDeductionAmount = parseMoney(manualPolicy.usedDeductionAmount);
  const penaltyAmountValue = parseMoney(manualPolicy.penaltyAmount);
  const previousRefundAmount = parseMoney(manualPolicy.previousRefundAmount);
  const storedPreviousRefundAmount = selected
    ? selected.paymentLines.reduce((sum, line) => sum + line.refundedAmount, 0)
    : 0;
  const effectivePreviousRefundAmount = Math.max(previousRefundAmount, storedPreviousRefundAmount);
  const remainingLineTotal = selected
    ? selected.paymentLines.reduce((sum, line) => sum + line.remainingAmount, 0)
    : 0;
  const calculatedAvailableAmount = selected
    ? Math.max(0, selected.amount - usedDeductionAmount - penaltyAmountValue - effectivePreviousRefundAmount)
    : 0;
  const confirmedAvailableAmount = selected
    ? manualPolicy.availableRefundAmount.trim()
      ? Math.max(0, parseMoney(manualPolicy.availableRefundAmount))
      : Math.min(calculatedAvailableAmount, remainingLineTotal)
    : 0;
  const isAvailableAdjusted = Boolean(manualPolicy.availableRefundAmount.trim())
    && confirmedAvailableAmount !== calculatedAvailableAmount;
  const requiresAdjustmentReason = usedDeductionAmount > 0 || penaltyAmountValue > 0 || isAvailableAdjusted;
  const refundAmount = selected
    ? action === 'cancel'
      ? confirmedAvailableAmount
      : parseMoney(partialAmount)
    : 0;
  const allocationTotal = selected
    ? selected.paymentLines.reduce((sum, line) => sum + parseMoney(refundAllocations[paymentLineKey(line)] ?? ''), 0)
    : 0;
  const allocationDiff = refundAmount - allocationTotal;
  const previewAllocationMethods = selected
    ? Array.from(new Set(selected.paymentLines
      .map((line) => ({
        amount: parseMoney(refundAllocations[paymentLineKey(line)] ?? ''),
        method: resolveAllocationMethod(line.method, manualPolicy.refundMethod, settlementMode),
      }))
      .filter((allocation) => allocation.amount > 0)
      .map((allocation) => allocation.method)))
    : [];
  const effectiveRefundMethod = previewAllocationMethods.length > 1
    ? 'MIXED'
    : previewAllocationMethods[0] ?? (selected ? toMethodCode(selected.method) : 'CARD');
  const finalReason = reason === '기타'
    ? manualPolicy.customReason.trim()
    : reason;

  const handleSelectPayment = useCallback((payment: Payment) => {
    setSelected(payment);
    setResult(null);
    setConfirmOpen(false);
    setAction('cancel');
    setSettlementMode('PRODUCT_REFUND');
    setPartialAmount('');
    setReason(cancelReasons[0]);
    setManualPolicy(initialManualPolicyForm);
    const remainingTotal = payment.paymentLines.reduce((sum, line) => sum + line.remainingAmount, 0);
    setRefundAllocations(createAllocationDraft(payment.paymentLines, remainingTotal || payment.amount));
  }, []);

  useEffect(() => {
    if (initialSelectionApplied || payments.length === 0 || selected || result) return;
    if (!linkedSaleId && !linkedApprovalNo) return;

    const target = payments.find((payment) => {
      const matchesSaleId = linkedSaleId ? String(payment.id) === linkedSaleId : false;
      const matchesApprovalNo = linkedApprovalNo ? payment.approvalNo === linkedApprovalNo : false;
      return matchesSaleId || matchesApprovalNo;
    });

    setInitialSelectionApplied(true);

    if (!target) {
      setQuery(linkedSaleId ?? linkedApprovalNo ?? '');
      toast.warning('연결된 결제 건을 현재 지점의 완료 결제 목록에서 찾지 못했습니다.');
      return;
    }

    setQuery(target.approvalNo || String(target.id));
    handleSelectPayment(target);
  }, [
    handleSelectPayment,
    initialSelectionApplied,
    linkedApprovalNo,
    linkedSaleId,
    payments,
    result,
    selected,
  ]);

  const handleSettlementModeChange = (nextMode: SettlementMode) => {
    setSettlementMode(nextMode);
    if (nextMode === 'COLLECTION_CANCEL') {
      updateManualPolicy('refundMethod', 'ORIGINAL');
    }
  };

  const handleActionChange = (nextAction: ActionType) => {
    setAction(nextAction);
    setSettlementMode(nextAction === 'partial' ? 'COLLECTION_CANCEL' : 'PRODUCT_REFUND');
    if (nextAction === 'partial') {
      updateManualPolicy('refundMethod', 'ORIGINAL');
    }
    if (!selected) return;
    const targetAmount = nextAction === 'cancel' ? confirmedAvailableAmount : parseMoney(partialAmount);
    setRefundAllocations(createAllocationDraft(selected.paymentLines, targetAmount));
  };

  const handlePartialAmountChange = (value: string) => {
    setPartialAmount(value);
    if (!selected) return;
    setRefundAllocations(createAllocationDraft(selected.paymentLines, parseMoney(value)));
  };

  const handleAutoAllocate = () => {
    if (!selected) return;
    setRefundAllocations(createAllocationDraft(selected.paymentLines, refundAmount));
  };

  const validateRefundAmount = () => {
    if (!selected) return false;
    if ([usedDeductionAmount, penaltyAmountValue, previousRefundAmount, confirmedAvailableAmount].some((amount) => amount < 0)) {
      toast.error('수기 입력 금액은 0원 이상이어야 합니다.');
      return false;
    }
    if (requiresAdjustmentReason && !manualPolicy.adjustmentReason.trim()) {
      toast.error('기사용 차감금, 위약금, 가능액 조정이 있는 경우 조정 사유를 입력해 주세요.');
      return false;
    }
    if (reason === '기타' && !manualPolicy.customReason.trim()) {
      toast.error('기타 사유를 직접 입력해 주세요.');
      return false;
    }
    if (!remainingLineTotal || remainingLineTotal <= 0) {
      toast.error('이미 전액 취소 또는 환불된 결제 건입니다.');
      return false;
    }
    if (!confirmedAvailableAmount || confirmedAvailableAmount <= 0) {
      toast.error('이번 환불 가능액을 확인해 주세요.');
      return false;
    }
    if (!refundAmount || refundAmount <= 0 || refundAmount > confirmedAvailableAmount) {
      toast.error('환불 금액을 확인해 주세요.');
      return false;
    }
    for (const line of selected.paymentLines) {
      const amount = parseMoney(refundAllocations[paymentLineKey(line)] ?? '');
      if (amount < 0) {
        toast.error(`${line.productName} 환불 배분액은 0원 이상이어야 합니다.`);
        return false;
      }
      if (amount > line.remainingAmount) {
        toast.error(`${line.productName} 환불 배분액이 잔여 가능액을 초과했습니다.`);
        return false;
      }
    }
    if (allocationTotal !== refundAmount) {
      toast.error('상품별 환불 배분 합계가 최종 환불액과 일치해야 합니다.');
      return false;
    }
    return true;
  };

  const handleOpenConfirm = () => {
    if (!validateRefundAmount()) return;
    setConfirmOpen(true);
  };

  async function handleSubmit() {
    if (!selected) return;
    if (!validateRefundAmount()) return;

    setIsSubmitting(true);
    const now = new Date().toISOString();
    const refundStatus = processStatusToDbStatus[manualPolicy.processStatus];
    const shouldFinalizeRefund = manualPolicy.processStatus === '완료';
    const refundApprovalNo = approvalNo();
    const selectedAllocations = selected.paymentLines
      .map((line) => {
        const amount = parseMoney(refundAllocations[paymentLineKey(line)] ?? '');
        const method = resolveAllocationMethod(line.method, manualPolicy.refundMethod, settlementMode);
        return { line, amount, method };
      })
      .filter((allocation) => allocation.amount > 0);
    const allocatedCardAmount = selectedAllocations
      .filter((allocation) => allocation.method === 'CARD')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
    const allocatedCashAmount = selectedAllocations
      .filter((allocation) => allocation.method === 'CASH' || allocation.method === 'TRANSFER')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
    const allocatedMileageAmount = selectedAllocations
      .filter((allocation) => allocation.method === 'MILEAGE')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
    const allocationMethods = Array.from(new Set(selectedAllocations.map((allocation) => allocation.method)));
    const refundPaymentMethod = allocationMethods.length > 1
      ? 'MIXED'
      : allocationMethods[0] ?? toMethodCode(effectiveRefundMethod);
    const allocationMemo = selectedAllocations
      .map((allocation) => `${allocation.line.productName} / ${METHOD_KO[allocation.method] ?? allocation.method} / ${allocation.amount.toLocaleString()}원`)
      .join('\n');
    const manualMemo = [
      `${action === 'cancel' ? '전체 취소' : '부분 환불'}: 원매출 #${selected.id}`,
      `[처리목적] ${settlementMode === 'COLLECTION_CANCEL' ? '수납행 취소(상품 계약 유지, 미수금 전환)' : '상품 환불/계약 취소'}`,
      `[수기계산] 기사용 차감금 ${usedDeductionAmount.toLocaleString()}원 / 위약금 ${penaltyAmountValue.toLocaleString()}원 / 기환불 누계 ${effectivePreviousRefundAmount.toLocaleString()}원 / 환불 가능액 ${confirmedAvailableAmount.toLocaleString()}원`,
      allocationMemo ? `[상품별 환불 배분]\n${allocationMemo}` : '',
      settlementMode === 'COLLECTION_CANCEL' && shouldFinalizeRefund ? `[미수전환] 취소 수납금액 ${refundAmount.toLocaleString()}원은 상품 계약 유지 미수금으로 생성` : '',
      manualPolicy.adjustmentReason.trim() ? `[조정사유] ${manualPolicy.adjustmentReason.trim()}` : '',
      `[환불수단] ${manualPolicy.refundMethod === 'ORIGINAL' ? `원결제 수단(${METHOD_KO[selected.method] ?? selected.method})` : METHOD_KO[manualPolicy.refundMethod] ?? manualPolicy.refundMethod}`,
      `[외부처리] ${manualPolicy.externalStatus}`,
      manualPolicy.evidenceMemo.trim() ? `[증빙] ${manualPolicy.evidenceMemo.trim()}` : '',
      `[처리상태] ${manualPolicy.processStatus}`,
      manualPolicy.approvalMemo.trim() ? `[승인메모] ${manualPolicy.approvalMemo.trim()}` : '',
      manualPolicy.paymentBranch.trim() ? `[결제지점] ${manualPolicy.paymentBranch.trim()}` : '',
      manualPolicy.usageBranch.trim() ? `[이용지점] ${manualPolicy.usageBranch.trim()}` : '',
      manualPolicy.salesAttributionBranch.trim() ? `[매출귀속지점] ${manualPolicy.salesAttributionBranch.trim()}` : '',
      manualPolicy.settlementBranch.trim() ? `[정산지점] ${manualPolicy.settlementBranch.trim()}` : '',
      manualPolicy.incentiveOwner.trim() ? `[인센티브귀속자] ${manualPolicy.incentiveOwner.trim()}` : '',
    ].filter(Boolean).join('\n');

    const { data: refundSale, error } = await supabase.from('sales').insert({
      memberId: selected.memberId,
      memberName: selected.memberName,
      productId: selected.productId,
      productName: selected.product,
      saleDate: new Date().toISOString(),
      type: '환불',
      round: settlementMode === 'COLLECTION_CANCEL' ? '수납행취소' : action === 'cancel' ? '환불' : '부분환불',
      quantity: 1,
      originalPrice: refundAmount,
      salePrice: refundAmount,
      discountPrice: 0,
      amount: refundAmount,
      paymentMethod: refundPaymentMethod,
      paymentType: settlementMode === 'COLLECTION_CANCEL'
        ? action === 'cancel' ? '수납행전체취소' : '수납행부분취소'
        : action === 'cancel' ? '전체환불' : '부분환불',
      cash: allocatedCashAmount,
      card: allocatedCardAmount,
      mileageUsed: allocatedMileageAmount,
      approvalNo: refundApprovalNo,
      status: refundStatus,
      unpaid: 0,
      staffId: selected.staffId,
      staffName: selected.staffName,
      memo: manualMemo,
      durationMonths: selected.durationMonths,
      saleCategory: settlementMode === 'COLLECTION_CANCEL' ? '수납행취소' : '환불',
      receiptIssued: false,
      penaltyAmount: penaltyAmountValue,
      branchId: getBranchId(),
      createdAt: now,
      updatedAt: now,
      originalSaleId: selected.id,
      refundReason: finalReason,
      refundProcessedBy: 'ADMIN',
      refundProcessedAt: manualPolicy.processStatus === '완료' ? now : null,
    }).select('id').single();

    if (error) {
      setIsSubmitting(false);
      toast.error(`환불 처리 실패: ${error.message}`);
      return;
    }

    const refundSaleId = Number(refundSale?.id);
    if (!refundSaleId) {
      setIsSubmitting(false);
      toast.error('환불 처리 번호를 확인할 수 없습니다.');
      return;
    }

    if (selectedAllocations.length > 0 && shouldFinalizeRefund) {
      const refundLineRows = selectedAllocations.map((allocation) => ({
        saleId: refundSaleId,
        branchId: getBranchId(),
        memberId: selected.memberId,
        productId: allocation.line.productId,
        productName: allocation.line.productName,
        itemKey: allocation.line.key,
        lineType: 'REFUND',
        method: allocation.method,
        amount: allocation.amount,
        refundedAmount: 0,
        originalLineId: allocation.line.id,
        approvalNo: refundApprovalNo,
        terminalId: allocation.line.terminalId,
        externalTransactionId: allocation.line.externalTransactionId,
        bankPayerName: allocation.line.bankPayerName,
        transferConfirmNo: allocation.line.transferConfirmNo,
        cashReceiptIssued: false,
        cashReceiptType: null,
        cashReceiptIdentifier: null,
        memo: `원매출 #${selected.id} / ${action === 'cancel' ? '전체 취소' : '부분 환불'} / ${finalReason || reason}`,
      }));

      const { error: lineError } = await supabase.from('sale_payment_lines').insert(refundLineRows);
      if (lineError) {
        setIsSubmitting(false);
        toast.error(`환불 배분 행 저장 실패: ${lineError.message}`);
        return;
      }

      await Promise.all(selectedAllocations
        .filter((allocation) => allocation.line.id != null)
        .map((allocation) => supabase
          .from('sale_payment_lines')
          .update({
            refundedAmount: allocation.line.refundedAmount + allocation.amount,
            updatedAt: now,
          })
          .eq('id', allocation.line.id)));
    }

    if (settlementMode === 'COLLECTION_CANCEL' && shouldFinalizeRefund && selectedAllocations.length > 0) {
      const unpaidRows = selectedAllocations.map((allocation) => ({
        memberId: selected.memberId,
        memberName: selected.memberName,
        productId: allocation.line.productId,
        productName: allocation.line.productName,
        saleDate: now,
        type: selected.type,
        round: '수납행취소미수',
        quantity: 1,
        originalPrice: allocation.amount,
        salePrice: allocation.amount,
        discountPrice: 0,
        amount: allocation.amount,
        paymentMethod: allocation.method,
        paymentType: '수납행취소미수',
        cash: 0,
        card: 0,
        mileageUsed: 0,
        approvalNo: selected.approvalNo,
        status: 'UNPAID',
        unpaid: allocation.amount,
        staffId: selected.staffId,
        staffName: selected.staffName,
        memo: `수납행 취소 미수 전환 / 원매출 #${selected.id} / 환불처리 #${refundSaleId} / ${METHOD_KO[allocation.method] ?? allocation.method} ${allocation.amount.toLocaleString()}원`,
        durationMonths: selected.durationMonths,
        saleCategory: '수납행취소미수',
        receiptIssued: false,
        penaltyAmount: 0,
        branchId: getBranchId(),
        createdAt: now,
        updatedAt: now,
        originalSaleId: selected.id,
      }));

      const { error: unpaidError } = await supabase.from('sales').insert(unpaidRows);
      if (unpaidError) {
        setIsSubmitting(false);
        toast.error(`미수금 전환 실패: ${unpaidError.message}`);
        return;
      }
    }

    setConfirmOpen(false);
    setResult('success');
    setIsSubmitting(false);
    toast.success(manualPolicy.processStatus === '완료'
      ? settlementMode === 'COLLECTION_CANCEL'
        ? '수납행 취소와 미수금 전환이 완료되었습니다.'
        : '환불 처리가 완료되었습니다.'
      : '환불 요청 상태로 기록되었습니다.');
    fetchPayments();
  }

  return (
    <AppLayout>
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <RefreshCcw className="w-6 h-6 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">결제 취소 / 부분 환불</h1>
          <p className="text-sm text-gray-500">결제 내역을 조회하고 취소 또는 부분 환불을 처리합니다.</p>
        </div>
      </div>

      {/* 결제 조회 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">1. 결제 조회</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); setResult(null); setConfirmOpen(false); }}
            placeholder="회원명, 결제번호, 내부 승인번호, 상품명으로 검색"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {loading && <p className="text-sm text-gray-400">결제 내역을 불러오는 중입니다.</p>}
        {query && !loading && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">결제번호 / 내부 승인번호</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">회원명</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">상품</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">금액</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">결제일</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">수단</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">선택</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-6 text-gray-400">검색 결과가 없습니다.</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${selected?.id === p.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-600">SALE-{p.id}</p>
                      <p className="mt-1 font-mono text-[11px] text-blue-600">{p.approvalNo || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{p.memberName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.product}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{p.amount.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.paidAt}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{METHOD_KO[p.method] ?? p.method}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSelectPayment(p)}
                        className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                          selected?.id === p.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {selected?.id === p.id ? '선택됨' : '선택'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 취소/환불 처리 폼 */}
      {selected && !result && (
        <div className="bg-white border rounded-xl p-5 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">2. 취소 / 환불 처리</h2>

          {/* 선택된 결제 요약 */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900">{selected.memberName}</span>
                <span className="text-gray-500 ml-2">{selected.product}</span>
              </div>
              <span className="font-bold text-gray-900">{selected.amount.toLocaleString()}원</span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-5">
              <div>
                <p className="font-medium text-gray-500">결제번호</p>
                <p className="mt-1 font-mono text-gray-800">SALE-{selected.id}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">CRM 내부 승인번호</p>
                <p className="mt-1 font-mono text-blue-700">{selected.approvalNo || '-'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">결제일</p>
                <p className="mt-1 text-gray-800">{selected.paidAt}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">결제수단</p>
                <p className="mt-1 text-gray-800">{METHOD_KO[selected.method] ?? selected.method}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">담당자</p>
                <p className="mt-1 text-gray-800">{selected.staffName || '-'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">상품별 수납 행 / 환불 배분</p>
                <p className="mt-1 text-xs text-gray-500">
                  내부 승인번호 {selected.approvalNo || `SALE-${selected.id}`} 기준으로 상품별 원수납액, 기환불액, 이번 취소/환불 배분액을 기록합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoAllocate}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                환불액 자동 배분
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">상품/수납 행</th>
                    <th className="px-3 py-2 text-center font-medium">수단</th>
                    <th className="px-3 py-2 text-right font-medium">원수납액</th>
                    <th className="px-3 py-2 text-right font-medium">기환불액</th>
                    <th className="px-3 py-2 text-right font-medium">잔여 가능액</th>
                    <th className="px-3 py-2 text-right font-medium">이번 배분액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selected.paymentLines.map((line) => {
                    const key = paymentLineKey(line);
                    const allocationValue = refundAllocations[key] ?? '';
                    const allocationAmount = parseMoney(allocationValue);
                    const overAllocated = allocationAmount > line.remainingAmount;
                    return (
                      <tr key={key}>
                        <td className="px-3 py-3 text-gray-700">
                          <p className="font-medium text-gray-900">{line.productName}</p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {line.approvalNo ? `승인/확인번호 ${line.approvalNo}` : line.transferConfirmNo ? `이체확인번호 ${line.transferConfirmNo}` : '확인번호 없음'}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">{METHOD_KO[line.method] ?? line.method}</td>
                        <td className="px-3 py-3 text-right font-medium text-gray-900">{line.amount.toLocaleString()}원</td>
                        <td className="px-3 py-3 text-right text-gray-600">{line.refundedAmount.toLocaleString()}원</td>
                        <td className="px-3 py-3 text-right text-gray-600">{line.remainingAmount.toLocaleString()}원</td>
                        <td className="px-3 py-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={line.remainingAmount}
                            value={allocationValue}
                            onChange={(e) => setRefundAllocations((prev) => ({ ...prev, [key]: e.target.value }))}
                            className={`w-32 rounded-lg border px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 ${
                              overAllocated
                                ? 'border-red-300 text-red-600 focus:ring-red-200'
                                : 'border-gray-200 text-gray-900 focus:ring-blue-500'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={`flex justify-end text-sm font-semibold ${allocationDiff === 0 ? 'text-gray-700' : 'text-red-600'}`}>
              배분 합계 {allocationTotal.toLocaleString()}원 / 최종 환불액 {refundAmount.toLocaleString()}원
              {allocationDiff !== 0 ? ` (차액 ${allocationDiff.toLocaleString()}원)` : ''}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-900">환불 계산 요약</p>
            <div className="mt-3 grid gap-2 text-xs text-amber-900 md:grid-cols-4">
              <div className="rounded-md bg-white/70 px-3 py-2">
                <p className="text-amber-700">원결제금액</p>
                <p className="mt-1 font-semibold">{selected.amount.toLocaleString()}원</p>
              </div>
              <div className="rounded-md bg-white/70 px-3 py-2">
                <p className="text-amber-700">기환불 누계</p>
                <p className="mt-1 font-semibold">{effectivePreviousRefundAmount.toLocaleString()}원</p>
                {storedPreviousRefundAmount > 0 && (
                  <p className="mt-1 text-[11px] text-amber-700">DB 기준 {storedPreviousRefundAmount.toLocaleString()}원</p>
                )}
              </div>
              <div className="rounded-md bg-white/70 px-3 py-2">
                <p className="text-amber-700">계산 환불 가능액</p>
                <p className="mt-1 font-semibold">{calculatedAvailableAmount.toLocaleString()}원</p>
              </div>
              <div className="rounded-md bg-white/70 px-3 py-2">
                <p className="text-amber-700">최종 환불액</p>
                <p className="mt-1 font-semibold">{refundAmount ? refundAmount.toLocaleString() : confirmedAvailableAmount.toLocaleString()}원</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-amber-800">
              클라이언트 환불 정책이 확정되기 전에는 수기 입력값을 기준으로 환불 가능액을 계산하고, 실제 배분은 상품별 수납 행 잔여 가능액을 초과할 수 없습니다.
            </p>
          </div>

          {/* 정책 미확정 수기 입력 */}
          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">정책 미확정 항목 수기 입력</p>
              <p className="mt-1 text-xs text-gray-500">사용분 차감, 위약금, 기환불 누계, 가능액 조정은 클라이언트 정책 확정 전까지 수기로 입력합니다.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ['usedDeductionAmount', '기사용 차감금'],
                ['penaltyAmount', '위약금'],
                ['previousRefundAmount', '기환불 누계 수기 보정'],
                ['availableRefundAmount', '이번 환불 가능액 조정'],
              ].map(([key, label]) => (
                <label key={key} className="space-y-1 text-xs font-medium text-gray-600">
                  <span>{label}</span>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={manualPolicy[key as keyof ManualPolicyForm]}
                      onChange={(e) => updateManualPolicy(key as keyof ManualPolicyForm, e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm font-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-normal text-gray-400">원</span>
                  </div>
                </label>
              ))}
            </div>
            <label className="block space-y-1 text-xs font-medium text-gray-600">
              <span>조정 사유</span>
              <textarea
                value={manualPolicy.adjustmentReason}
                onChange={(e) => updateManualPolicy('adjustmentReason', e.target.value)}
                placeholder="예: PT 3회 사용분 차감, 약관상 위약금 10%, 센터장 승인으로 위약금 조정"
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* 처리 유형 선택 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">처리 유형</p>
            <div className="flex gap-3">
              {([['cancel', '전체 취소'], ['partial', '부분 환불']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => handleActionChange(val)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    action === val
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">처리 목적</p>
            <div className="grid gap-3 md:grid-cols-2">
              {([
                ['PRODUCT_REFUND', '상품 환불 / 계약 취소', '매출과 계약을 줄이고 자동 미수금은 만들지 않습니다.'],
                ['COLLECTION_CANCEL', '수납행 취소 / 계약 유지', '취소 수납금액을 같은 상품의 미수금으로 전환합니다.'],
              ] as const).map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSettlementModeChange(value)}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    settlementMode === value
                      ? value === 'COLLECTION_CANCEL'
                        ? 'border-amber-400 bg-amber-50 text-amber-900'
                        : 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs opacity-80">{description}</p>
                </button>
              ))}
            </div>
            {settlementMode === 'COLLECTION_CANCEL' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                수납행 취소로 완료 처리하면 배분 합계 {allocationTotal.toLocaleString()}원이 미수금으로 생성됩니다. 상품 해지·이용권 환불이면 상품 환불 / 계약 취소를 선택해야 합니다.
              </div>
            )}
          </div>

          {/* 부분 환불 금액 */}
          {action === 'partial' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">환불 금액</label>
              <div className="relative">
                <input
                  type="number"
                  value={partialAmount}
                  onChange={(e) => handlePartialAmountChange(e.target.value)}
                  placeholder="환불할 금액 입력"
                  max={selected.amount}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">원</span>
              </div>
              {partialAmount && Number(partialAmount) > selected.amount && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 결제 금액을 초과할 수 없습니다.
                </p>
              )}
            </div>
          )}

          {/* 사유 선택 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">취소 사유</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {cancelReasons.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>

          {reason === '기타' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">기타 사유 직접 입력</label>
              <input
                value={manualPolicy.customReason}
                onChange={(e) => updateManualPolicy('customReason', e.target.value)}
                placeholder="환불 사유를 직접 입력"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-sm font-medium text-gray-700">
              <span>환불 수단</span>
              <select
                value={manualPolicy.refundMethod}
                onChange={(e) => updateManualPolicy('refundMethod', e.target.value as RefundMethod)}
                disabled={settlementMode === 'COLLECTION_CANCEL'}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ORIGINAL">원결제 수단 기준</option>
                <option value="CARD">카드</option>
                <option value="CASH">현금</option>
                <option value="TRANSFER">계좌이체</option>
                <option value="MILEAGE">포인트</option>
                <option value="MIXED">혼합결제 수기 배분</option>
              </select>
              {settlementMode === 'COLLECTION_CANCEL' && (
                <p className="mt-1 text-xs font-normal text-amber-700">수납행 취소는 원수납 행의 카드/현금/계좌이체 수단 기준으로 기록합니다.</p>
              )}
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700">
              <span>외부 처리 상태</span>
              <select
                value={manualPolicy.externalStatus}
                onChange={(e) => updateManualPolicy('externalStatus', e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>외부 환불 완료</option>
                <option>외부 환불 전</option>
                <option>PG 처리 대기</option>
                <option>CRM 기록만</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700">
              <span>처리 상태</span>
              <select
                value={manualPolicy.processStatus}
                onChange={(e) => updateManualPolicy('processStatus', e.target.value as ProcessStatus)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>완료</option>
                <option>승인대기</option>
                <option>요청</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-gray-700">
              <span>영수증/증빙 메모</span>
              <input
                value={manualPolicy.evidenceMemo}
                onChange={(e) => updateManualPolicy('evidenceMemo', e.target.value)}
                placeholder="예: POS 취소 승인번호, 계좌이체 완료 메모, 첨부파일명"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700">
              <span>지점장 승인/반려 메모</span>
              <input
                value={manualPolicy.approvalMemo}
                onChange={(e) => updateManualPolicy('approvalMemo', e.target.value)}
                placeholder="예: 10만원 이상 환불로 센터장 승인 필요"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-800">매출/정산 귀속 수기 메모</p>
            <div className="grid gap-3 md:grid-cols-5">
              {[
                ['paymentBranch', '결제지점'],
                ['usageBranch', '이용지점'],
                ['salesAttributionBranch', '매출 귀속 지점'],
                ['settlementBranch', '정산 지점'],
                ['incentiveOwner', '인센티브 귀속자'],
              ].map(([key, label]) => (
                <label key={key} className="space-y-1 text-xs font-medium text-gray-600">
                  <span>{label}</span>
                  <input
                    value={manualPolicy[key as keyof ManualPolicyForm]}
                    onChange={(e) => updateManualPolicy(key as keyof ManualPolicyForm, e.target.value)}
                    placeholder="수기 입력"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* 제출 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setSelected(null)}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleOpenConfirm}
              disabled={(action === 'partial' && (!partialAmount || parseMoney(partialAmount) > confirmedAvailableAmount)) || allocationDiff !== 0}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {manualPolicy.processStatus === '완료' ? (action === 'cancel' ? '처리 확인' : '부분 환불 확인') : `${manualPolicy.processStatus} 기록`}
            </button>
          </div>
        </div>
      )}

      {/* 처리 결과 */}
      {result === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">처리가 완료되었습니다.</p>
              <p className="text-xs text-green-600 mt-0.5">완료 건은 환불 관리에 반영되며, 요청/승인대기 건은 처리 상태 메모와 함께 확인할 수 있습니다.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => router.push('/refunds')}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              환불 관리로 이동
            </button>
            <button
              onClick={resetFlow}
              className="flex-1 rounded-lg border border-green-200 bg-white px-4 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
            >
              계속 처리
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="환불 처리 확인"
        description="아래 내용을 확인한 뒤 처리 완료를 누르세요."
        confirmLabel={isSubmitting ? '처리 중...' : manualPolicy.processStatus === '완료' ? '처리 완료' : `${manualPolicy.processStatus} 기록`}
        cancelLabel="이전으로"
        variant="danger"
        onCancel={() => {
          if (isSubmitting) return;
          setConfirmOpen(false);
        }}
        onConfirm={handleSubmit}
      >
        {selected && (
          <div className="space-y-3 text-sm text-gray-700">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-gray-900">{selected.memberName}</p>
              <p className="mt-1 text-gray-600">{selected.product}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-500">처리 유형</p>
                <p className="mt-1 font-semibold text-gray-900">{action === 'cancel' ? '전체 취소' : '부분 환불'}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-500">처리 목적</p>
                <p className="mt-1 font-semibold text-gray-900">{settlementMode === 'COLLECTION_CANCEL' ? '수납행 취소 / 미수 전환' : '상품 환불 / 계약 취소'}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-500">환불 금액</p>
                <p className="mt-1 font-semibold text-gray-900">{refundAmount.toLocaleString()}원</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-500">환불 수단</p>
                <p className="mt-1 font-semibold text-gray-900">{METHOD_KO[effectiveRefundMethod] ?? effectiveRefundMethod}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-500">취소 사유</p>
                <p className="mt-1 font-semibold text-gray-900">{finalReason || reason}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-500">환불 가능액</p>
                <p className="mt-1 font-semibold text-gray-900">{confirmedAvailableAmount.toLocaleString()}원</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-500">처리 상태</p>
                <p className="mt-1 font-semibold text-gray-900">{manualPolicy.processStatus}</p>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 p-3 text-xs">
              <p className="text-gray-500">상품별 취소/환불 배분</p>
              <div className="mt-2 space-y-1">
                {selected.paymentLines
                  .map((line) => ({ line, amount: parseMoney(refundAllocations[paymentLineKey(line)] ?? '') }))
                  .filter(({ amount }) => amount > 0)
                  .map(({ line, amount }) => (
                    <div key={paymentLineKey(line)} className="flex items-center justify-between gap-3">
                      <span className="truncate text-gray-700">{line.productName} / {METHOD_KO[line.method] ?? line.method}</span>
                      <span className="font-semibold text-gray-900">{amount.toLocaleString()}원</span>
                    </div>
                  ))}
              </div>
            </div>
            {settlementMode === 'COLLECTION_CANCEL' && manualPolicy.processStatus === '완료' && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">미수금 전환 확인</p>
                <p className="mt-1">처리 완료 시 취소 수납금액 {refundAmount.toLocaleString()}원이 같은 상품의 미수금으로 생성됩니다.</p>
              </div>
            )}
            {manualPolicy.adjustmentReason.trim() && (
              <div className="rounded-lg border border-gray-100 p-3 text-xs">
                <p className="text-gray-500">조정 사유</p>
                <p className="mt-1 whitespace-pre-wrap font-medium text-gray-900">{manualPolicy.adjustmentReason.trim()}</p>
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
    </AppLayout>
  );
}

export default function CancelRefundPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            결제 취소 / 부분 환불 화면을 불러오는 중입니다.
          </div>
        </AppLayout>
      }
    >
      <CancelRefundContent />
    </Suspense>
  );
}
