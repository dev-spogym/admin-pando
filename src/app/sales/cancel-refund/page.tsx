'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';

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
  paymentRoute: '현장(POS)' | '결제링크'; // 환불 수단 확인을 위한 결제경로
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
type RefundMethod = 'ORIGINAL' | 'CARD' | 'CASH' | 'TRANSFER' | 'MILEAGE' | 'MIXED';
// SAL-EXT-04-11: 수납행 취소(계약 유지·미수 전환) vs 상품 환불/계약 취소(매출·계약 축소)
type RefundScope = 'receiptCancel' | 'productRefund';

// 혼합결제 환불 분해표 행 (mock — 원수납 결제수단별 분해)
interface RefundBreakdownRow {
  method: 'CARD' | 'CASH' | 'TRANSFER' | 'MILEAGE';
  label: string;
  originalAmount: number;   // 원수납액
  previousRefund: number;   // 기환불액
  thisRefund: number;       // 이번 환불 배분액 (수기 입력)
}
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
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
};

const getBranchId = () => {
  if (typeof window === 'undefined') return 1;
  return Number(localStorage.getItem('branchId') ?? 1) || 1;
};

const approvalNo = () => `RF${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 9000) + 1000}`;

// 원결제 수단을 기준으로 혼합결제 환불 분해표 mock 생성.
// 수단별 자동 분해 정책 확정 전에는 원수납액을 단일 수단에 배치하고 운영자가 수기 조정한다.
const buildBreakdownRows = (payment: Payment): RefundBreakdownRow[] => {
  const total = payment.amount;
  const base = {
    CARD: { method: 'CARD' as const, label: '카드', originalAmount: 0, previousRefund: 0, thisRefund: 0 },
    CASH: { method: 'CASH' as const, label: '현금', originalAmount: 0, previousRefund: 0, thisRefund: 0 },
    TRANSFER: { method: 'TRANSFER' as const, label: '계좌이체', originalAmount: 0, previousRefund: 0, thisRefund: 0 },
    MILEAGE: { method: 'MILEAGE' as const, label: '마일리지(포인트)', originalAmount: 0, previousRefund: 0, thisRefund: 0 },
  };
  if (payment.method === 'CASH') base.CASH.originalAmount = total;
  else if (payment.method === 'TRANSFER') base.TRANSFER.originalAmount = total;
  else if (payment.method === 'MILEAGE') base.MILEAGE.originalAmount = total;
  else base.CARD.originalAmount = total; // CARD/MIXED/기타 기본은 카드 행으로 배치
  return [base.CARD, base.CASH, base.TRANSFER, base.MILEAGE];
};

export default function CancelRefundPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [action, setAction] = useState<ActionType>('cancel');
  const [refundScope, setRefundScope] = useState<RefundScope>('productRefund');
  const [breakdownRows, setBreakdownRows] = useState<RefundBreakdownRow[]>([]);
  const [partialAmount, setPartialAmount] = useState('');
  const [reason, setReason] = useState(cancelReasons[0]);
  const [manualPolicy, setManualPolicy] = useState<ManualPolicyForm>(initialManualPolicyForm);
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
      .select('id, memberId, memberName, productId, productName, amount, saleDate, paymentMethod, paymentType, type, round, staffId, staffName, durationMonths')
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

    setPayments((data ?? []).map((row: Record<string, unknown>) => ({
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
      paymentRoute: String(row.paymentType ?? '').includes('결제링크') ? '결제링크' : '현장(POS)',
    })));
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filtered = payments.filter(
    (p) => p.memberName.includes(query) || String(p.id).includes(query) || p.product.includes(query)
  );

  const resetFlow = useCallback(() => {
    setResult(null);
    setSelected(null);
    setPartialAmount('');
    setReason(cancelReasons[0]);
    setAction('cancel');
    setRefundScope('productRefund');
    setBreakdownRows([]);
    setManualPolicy(initialManualPolicyForm);
    setConfirmOpen(false);
    setIsSubmitting(false);
  }, []);

  // 분해표 이번 환불 배분액 합계 + 마일리지 복원 요약
  const breakdownThisRefundTotal = useMemo(
    () => breakdownRows.reduce((sum, row) => sum + (row.thisRefund || 0), 0),
    [breakdownRows],
  );
  const mileageRestoreAmount = useMemo(
    () => breakdownRows.find(r => r.method === 'MILEAGE')?.thisRefund ?? 0,
    [breakdownRows],
  );
  const updateBreakdownRow = (method: RefundBreakdownRow['method'], thisRefund: number) =>
    setBreakdownRows(rows => rows.map(r => (r.method === method ? { ...r, thisRefund: Math.max(0, thisRefund) } : r)));

  const usedDeductionAmount = parseMoney(manualPolicy.usedDeductionAmount);
  const penaltyAmountValue = parseMoney(manualPolicy.penaltyAmount);
  const previousRefundAmount = parseMoney(manualPolicy.previousRefundAmount);
  const calculatedAvailableAmount = selected
    ? Math.max(0, selected.amount - usedDeductionAmount - penaltyAmountValue - previousRefundAmount)
    : 0;
  const confirmedAvailableAmount = selected
    ? manualPolicy.availableRefundAmount.trim()
      ? Math.max(0, parseMoney(manualPolicy.availableRefundAmount))
      : calculatedAvailableAmount
    : 0;
  const isAvailableAdjusted = Boolean(manualPolicy.availableRefundAmount.trim())
    && confirmedAvailableAmount !== calculatedAvailableAmount;
  const requiresAdjustmentReason = usedDeductionAmount > 0 || penaltyAmountValue > 0 || isAvailableAdjusted;
  const refundAmount = selected
    ? action === 'cancel'
      ? confirmedAvailableAmount
      : parseMoney(partialAmount)
    : 0;
  const effectiveRefundMethod = selected
    ? manualPolicy.refundMethod === 'ORIGINAL'
      ? selected.method
      : manualPolicy.refundMethod
    : 'CARD';
  const finalReason = reason === '기타'
    ? manualPolicy.customReason.trim()
    : reason;

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
    if (!confirmedAvailableAmount || confirmedAvailableAmount <= 0) {
      toast.error('이번 환불 가능액을 확인해 주세요.');
      return false;
    }
    if (!refundAmount || refundAmount <= 0 || refundAmount > confirmedAvailableAmount) {
      toast.error('환불 금액을 확인해 주세요.');
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
    const breakdownSummary = breakdownRows
      .filter(r => r.originalAmount > 0 || r.thisRefund > 0)
      .map(r => `${r.label} 원수납 ${r.originalAmount.toLocaleString()} / 기환불 ${r.previousRefund.toLocaleString()} / 이번환불 ${r.thisRefund.toLocaleString()} / 잔여 ${(r.originalAmount - r.previousRefund - r.thisRefund).toLocaleString()}`)
      .join(' | ');
    const manualMemo = [
      `${action === 'cancel' ? '전체 취소' : '부분 환불'}: 원매출 #${selected.id}`,
      `[처리구분] ${refundScope === 'receiptCancel' ? '수납행 취소(계약 유지·미수 전환)' : '상품 환불/계약 취소'}`,
      breakdownSummary ? `[혼합결제 분해] ${breakdownSummary}` : '',
      `[복원] 마일리지 ${mileageRestoreAmount.toLocaleString()}P 우선 복원 + 사용 쿠폰 미사용 복원`,
      `[수기계산] 기사용 차감금 ${usedDeductionAmount.toLocaleString()}원 / 위약금 ${penaltyAmountValue.toLocaleString()}원 / 기환불 누계 ${previousRefundAmount.toLocaleString()}원 / 환불 가능액 ${confirmedAvailableAmount.toLocaleString()}원`,
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

    const { error } = await supabase.from('sales').insert({
      memberId: selected.memberId,
      memberName: selected.memberName,
      productId: selected.productId,
      productName: selected.product,
      saleDate: new Date().toISOString(),
      type: '환불',
      round: action === 'cancel' ? '환불' : '부분환불',
      quantity: 1,
      originalPrice: refundAmount,
      salePrice: refundAmount,
      discountPrice: 0,
      amount: refundAmount,
      paymentMethod: effectiveRefundMethod,
      paymentType: action === 'cancel' ? '전체환불' : '부분환불',
      cash: effectiveRefundMethod === 'CASH' || effectiveRefundMethod === 'TRANSFER' || effectiveRefundMethod === 'MIXED' ? refundAmount : 0,
      card: effectiveRefundMethod === 'CARD' ? refundAmount : 0,
      mileageUsed: effectiveRefundMethod === 'MILEAGE' ? refundAmount : 0,
      approvalNo: approvalNo(),
      status: refundStatus,
      unpaid: 0,
      staffId: selected.staffId,
      staffName: selected.staffName,
      memo: manualMemo,
      durationMonths: selected.durationMonths,
      saleCategory: '환불',
      receiptIssued: false,
      penaltyAmount: penaltyAmountValue,
      branchId: getBranchId(),
      createdAt: now,
      updatedAt: now,
      originalSaleId: selected.id,
      refundReason: finalReason,
      refundProcessedBy: 'ADMIN',
      refundProcessedAt: manualPolicy.processStatus === '완료' ? now : null,
    });

    if (error) {
      setIsSubmitting(false);
      toast.error(`환불 처리 실패: ${error.message}`);
      return;
    }

    setConfirmOpen(false);
    setResult('success');
    setIsSubmitting(false);
    toast.success(manualPolicy.processStatus === '완료' ? '환불 처리가 완료되었습니다.' : '환불 요청 상태로 기록되었습니다.');
    fetchPayments();
  }

  return (
    <AppLayout>
      <PageHeader
        title="결제 취소 / 부분 환불"
        description="결제 내역을 조회하고 혼합결제 환불 분해와 함께 취소 또는 부분 환불을 처리합니다."
      />

      <div className="space-y-6">
      {/* 결제 조회 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">1. 결제 조회</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); setBreakdownRows([]); setResult(null); setConfirmOpen(false); }}
            placeholder="회원명, 결제번호, 상품명으로 검색"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {loading && <p className="text-sm text-gray-400">결제 내역을 불러오는 중입니다.</p>}
        {query && !loading && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">결제번호</th>
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
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">SALE-{p.id}</td>
                    <td className="px-4 py-3 text-gray-900">{p.memberName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.product}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{p.amount.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.paidAt}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{METHOD_KO[p.method] ?? p.method}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelected(p);
                          setResult(null);
                          setConfirmOpen(false);
                          setAction('cancel');
                          setRefundScope('productRefund');
                          setBreakdownRows(buildBreakdownRows(p));
                          setPartialAmount('');
                          setReason(cancelReasons[0]);
                          setManualPolicy(initialManualPolicyForm);
                        }}
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
            <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-4">
              <div>
                <p className="font-medium text-gray-500">결제번호</p>
                <p className="mt-1 font-mono text-gray-800">SALE-{selected.id}</p>
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
              <div>
                <p className="font-medium text-gray-500">결제경로</p>
                <p className="mt-1 text-gray-800">{selected.paymentRoute}</p>
              </div>
            </div>
          </div>

          {/* 환불 수단 확인 (결제경로별 안내) */}
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm">
            <p className="font-medium text-sky-900">환불 수단 확인</p>
            <p className="mt-1 text-xs text-sky-800">
              {selected.paymentRoute === '결제링크'
                ? '결제링크 건은 PG 환불 상태를 확인합니다. 결제되지 않은 링크는 환불 대상이 아니므로 결제링크 무효화로 안내합니다.'
                : '현장 등록 건은 외부 POS/현금/계좌이체 환불 완료 증빙을 확인합니다. 카드 수납행 취소는 외부 승인금액 단위 전체 취소를 원칙으로 안내합니다.'}
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-900">환불 계산 요약</p>
            <div className="mt-3 grid gap-2 text-xs text-amber-900 md:grid-cols-3">
              <div className="rounded-md bg-white/70 px-3 py-2">
                <p className="text-amber-700">원결제금액</p>
                <p className="mt-1 font-semibold">{selected.amount.toLocaleString()}원</p>
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
              클라이언트 환불 정책이 확정되기 전에는 아래 수기 입력값을 기준으로 환불 가능액을 계산하고, 조정 사유를 이력에 남깁니다.
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
                ['previousRefundAmount', '기환불 누계'],
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

          {/* SAL-EXT-04-11: 수납행 취소 / 상품 환불 구분 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">처리 구분</p>
            <div className="grid gap-3 md:grid-cols-2">
              {([
                ['receiptCancel', '수납행 취소', '결제수단 변경·승인 취소 등 상품 계약은 유지. 취소 배분액을 즉시 미수금으로 전환합니다.'],
                ['productRefund', '상품 환불 / 계약 취소', '상품 해지·이용권 환불. 매출과 계약을 줄이고 자동 미수금을 만들지 않습니다.'],
              ] as [RefundScope, string, string][]).map(([val, label, desc]) => (
                <button
                  key={val}
                  onClick={() => setRefundScope(val)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    refundScope === val
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${refundScope === val ? 'text-blue-700' : 'text-gray-700'}`}>{label}</p>
                  <p className="mt-1 text-xs text-gray-500">{desc}</p>
                </button>
              ))}
            </div>
            {refundScope === 'receiptCancel' && (
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> 취소 금액은 미수금으로 남습니다. 재결제 시 완납 처리됩니다.
              </p>
            )}
          </div>

          {/* 혼합결제 환불 분해표 */}
          <div className="space-y-2 rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-800">혼합결제 환불 분해표</p>
            <p className="text-xs text-gray-500">
              내부 승인번호 기준 결제수단별 원수납액·기환불액·이번 환불 배분액·잔여 환불 가능액을 확인합니다. 자동 분해 정책 확정 전에는 수기로 배분합니다.
            </p>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">수단</th>
                    <th className="px-3 py-2 text-right font-medium">원수납액</th>
                    <th className="px-3 py-2 text-right font-medium">기환불액</th>
                    <th className="px-3 py-2 text-right font-medium">이번 환불 배분</th>
                    <th className="px-3 py-2 text-right font-medium">잔여 가능액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {breakdownRows.map((row) => {
                    const remaining = row.originalAmount - row.previousRefund - row.thisRefund;
                    return (
                      <tr key={row.method} className={row.originalAmount === 0 ? 'text-gray-300' : ''}>
                        <td className="px-3 py-2 text-gray-700">{row.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.originalAmount.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.previousRefund.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={row.originalAmount - row.previousRefund}
                            value={row.thisRefund || ''}
                            onChange={(e) => updateBreakdownRow(row.method, Number(e.target.value))}
                            disabled={row.originalAmount === 0}
                            placeholder="0"
                            className="w-24 rounded border border-gray-200 px-2 py-1 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums ${remaining < 0 ? 'text-red-500 font-semibold' : ''}`}>{remaining.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold text-gray-800">
                  <tr>
                    <td className="px-3 py-2">합계 (이번 환불 배분)</td>
                    <td colSpan={2}></td>
                    <td className="px-3 py-2 text-right tabular-nums">{breakdownThisRefundTotal.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 쿠폰/마일리지 복원 요약 */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-900">쿠폰/마일리지 복원 요약</p>
            <ul className="mt-2 space-y-1 text-xs text-emerald-800">
              <li>· 사용 마일리지(포인트) 우선 복원: <span className="font-semibold">{mileageRestoreAmount.toLocaleString()}P</span></li>
              <li>· 사용 쿠폰: 미사용 상태로 복원</li>
              <li>· 복원 대상·금액·상태는 처리 전 최종 확인 팝업에서 확인합니다.</li>
            </ul>
          </div>

          {/* 처리 유형 선택 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">처리 유형</p>
            <div className="flex gap-3">
              {([['cancel', '전체 취소'], ['partial', '부분 환불']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setAction(val)}
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

          {/* 부분 환불 금액 */}
          {action === 'partial' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">환불 금액</label>
              <div className="relative">
                <input
                  type="number"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
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
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ORIGINAL">원결제 수단 기준</option>
                <option value="CARD">카드</option>
                <option value="CASH">현금</option>
                <option value="TRANSFER">계좌이체</option>
                <option value="MILEAGE">포인트</option>
                <option value="MIXED">혼합결제 수기 배분</option>
              </select>
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
              disabled={action === 'partial' && (!partialAmount || parseMoney(partialAmount) > confirmedAvailableAmount)}
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
                <p className="text-gray-500">처리 구분</p>
                <p className="mt-1 font-semibold text-gray-900">{refundScope === 'receiptCancel' ? '수납행 취소' : '상품 환불/계약 취소'}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-500">마일리지 복원</p>
                <p className="mt-1 font-semibold text-gray-900">{mileageRestoreAmount.toLocaleString()}P</p>
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
