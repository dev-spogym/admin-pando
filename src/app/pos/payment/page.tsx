'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  X,
  CreditCard,
  Banknote,
  CheckCircle2,
  Printer,
  RotateCcw,
  Upload,
  Link2,
  FileText,
  Plus,
  Trash2,
  Building2,
  Hash,
  ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { moveToPage } from '@/internal';
import { supabase } from '@/lib/supabase';
import { checkDuplicatePayment, deductPoints, accruePoints, updateMembershipPeriod } from '@/lib/businessLogic';
import { uploadFile } from '@/lib/uploadFile';
import { formatKRW, formatNumber } from '@/lib/format';

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

const toDateTimeLocalValue = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const getCurrentStaffName = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string; staffName?: string; username?: string };
    return parsed.name ?? parsed.staffName ?? parsed.username ?? null;
  } catch {
    return null;
  }
};

// 수납 방식: 현장 전액 / 계약금 / 잔액 / 결제링크 발송
type CollectionMode = 'full' | 'deposit' | 'balance' | 'link';
// 혼합결제 수납행 결제수단: 카드 / 현금 / 계좌이체
type PayMethod = 'card' | 'cash' | 'transfer';
// 이용권 개시 옵션
type MembershipStart = 'immediate' | 'afterPaid';
// 잔액 처리 방식
type BalancePlan = 'manual' | 'installment';

// 혼합결제 수납행 (mock UI — 외부 POS/현금/계좌이체 수납 결과를 직원이 등록)
interface PaymentRow {
  rowId: string;
  method: PayMethod;
  amount: number;
  approvalNo: string;   // 카드 외부 승인번호 또는 이체확인번호
  approvedAt: string;   // 승인·입금 시각
  depositorName: string; // 계좌이체 입금자명(계좌이체 필수)
  cashReceipt: boolean;  // 현금영수증 처리 여부
  memo: string;
}

const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  card: '카드',
  cash: '현금',
  transfer: '계좌이체',
};

// 지점 귀속 select 옵션 (mock — 실제로는 D10 지점 마스터 연동)
const BRANCH_OPTIONS = ['강남점', '송도점', '분당점', '마곡점', '수원점', '판교점'];

const newPaymentRow = (method: PayMethod = 'card'): PaymentRow => ({
  rowId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  method,
  amount: 0,
  approvalNo: '',
  approvedAt: '',
  depositorName: '',
  cashReceipt: false,
  memo: '',
});

interface CartItem {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
  durationDays?: number | null;
  sessions?: number | null;
  productType?: string | null;
}

interface Member {
  id: number;
  name: string;
  phone: string;
  mileage: number;
}

export default function PosPayment() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberResults, setMemberResults] = useState<Member[]>([]);

  const [collectionMode, setCollectionMode] = useState<CollectionMode>('full');
  // 혼합결제 수납행 (카드 2~3개 + 현금 + 계좌이체 분할 입력)
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([newPaymentRow('card')]);
  const [pointAmount, setPointAmount] = useState(0);
  const [paidAt, setPaidAt] = useState(toDateTimeLocalValue());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [fcMemo, setFcMemo] = useState('');

  // 수동 할인 (v1: 자동 적용 없음, 운영자 수동 확정 금액만 입력)
  const [discountAmount, setDiscountAmount] = useState(0);
  // 계약금 등록 시 당일 수납액 (잔액 = 최종금액 - 당일수납 - 포인트)
  const [depositAmount, setDepositAmount] = useState(0);
  // 이용권 개시 옵션 / 잔액 처리 방식
  const [membershipStart, setMembershipStart] = useState<MembershipStart>('immediate');
  const [balancePlan, setBalancePlan] = useState<BalancePlan>('manual');
  // 지점 귀속 설정
  const [paymentBranch, setPaymentBranch] = useState(BRANCH_OPTIONS[0]);
  const [usageBranch, setUsageBranch] = useState(BRANCH_OPTIONS[0]);
  const [revenueBranch, setRevenueBranch] = useState(BRANCH_OPTIONS[0]);
  const [settlementBranch, setSettlementBranch] = useState(BRANCH_OPTIONS[0]);
  const [incentiveOwner, setIncentiveOwner] = useState('');
  // VAN/POS 결과 (mock — 수기 입력 또는 연동 조회)
  const [vanTerminalId, setVanTerminalId] = useState('');
  const [vanResult, setVanResult] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const [showDupConfirm, setShowDupConfirm] = useState(false);
  const [dupMessage, setDupMessage] = useState('');

  useEffect(() => {
    const storedCart = sessionStorage.getItem('posCart');
    if (storedCart) {
      try {
        setCartItems(JSON.parse(storedCart) as CartItem[]);
        sessionStorage.removeItem('posCart');
      } catch {
        // 세션 장바구니 복원 실패는 빈 장바구니로 처리한다.
      }
    }

    const storedBuyer = sessionStorage.getItem('posBuyer');
    if (storedBuyer) {
      try {
        const buyer = JSON.parse(storedBuyer) as Partial<Member>;
        if (buyer.id && buyer.name && buyer.phone) {
          setSelectedMember({
            id: Number(buyer.id),
            name: String(buyer.name),
            phone: String(buyer.phone),
            mileage: Number(buyer.mileage ?? 0),
          });
          setMemberSearch(String(buyer.name));
        }
        sessionStorage.removeItem('posBuyer');
      } catch {
        // 구매자 복원 실패는 회원 미선택으로 처리한다.
      }
    }
  }, []);

  // 내부 승인번호: 한 장바구니 결제그룹을 묶는 CRM 자동 발번 (PAY-01-13)
  const [internalApprovalNo] = useState(
    () => `CRM-${new Date().getFullYear()}${String(Date.now()).slice(-8)}`,
  );

  const grossSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // 정가 - 수동 할인 = 최종 결제 금액
  const subtotal = Math.max(0, grossSubtotal - discountAmount);
  // 혼합결제 행 합계 (포인트 제외 실수납액)
  const paymentRowsTotal = paymentRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  // 계약금/잔액 등록 시 당일 수납 기준 금액
  const todayTarget = collectionMode === 'deposit' ? depositAmount : subtotal;
  // 혼합결제 행 합계 + 포인트 사용액
  const collectedAmount = paymentRowsTotal + pointAmount;
  const amountDiff = todayTarget - collectedAmount;
  // 계약금 등록 시 잔액
  const balanceAmount = collectionMode === 'deposit' ? Math.max(0, subtotal - collectedAmount) : 0;
  const maxDurationDays = Math.max(0, ...cartItems.map(item => Number(item.durationDays ?? 0)));

  useEffect(() => {
    // 장바구니/할인 변경 시 단일 카드 행 금액을 최종 합계로 초기화
    setPaymentRows([{ ...newPaymentRow('card'), amount: subtotal }]);
    setPointAmount(0);
    setDepositAmount(0);
  }, [subtotal]);

  // 혼합결제 행 조작
  const addPaymentRow = (method: PayMethod) =>
    setPaymentRows(rows => [...rows, newPaymentRow(method)]);
  const removePaymentRow = (rowId: string) =>
    setPaymentRows(rows => (rows.length <= 1 ? rows : rows.filter(r => r.rowId !== rowId)));
  const updatePaymentRow = (rowId: string, patch: Partial<PaymentRow>) =>
    setPaymentRows(rows => rows.map(r => (r.rowId === rowId ? { ...r, ...patch } : r)));

  const handleMemberSearch = async (query: string) => {
    setMemberSearch(query);
    if (!query.trim()) {
      setMemberResults([]);
      return;
    }
    const { data, error } = await supabase
      .from('members')
      .select('id, name, phone, mileage')
      .eq('branchId', getBranchId())
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);
    if (!error && data) {
      setMemberResults(
        data.map((m: Record<string, unknown>) => ({
          id: m.id as number,
          name: m.name as string,
          phone: m.phone as string,
          mileage: Number(m.mileage ?? 0),
        }))
      );
    }
  };

  const validationMessages = useMemo(() => {
    const messages: string[] = [];
    if (cartItems.length === 0) messages.push('장바구니에 상품을 담아주세요.');
    if (!selectedMember) messages.push('회원/이용권 등록을 위해 회원을 선택해주세요.');

    if (collectionMode === 'link') {
      return messages;
    }

    if (!receiptFile) messages.push('영수증 파일을 첨부해주세요.');
    if (!paidAt) messages.push('결제일시를 입력해주세요.');
    if (pointAmount < 0) messages.push('포인트 사용액은 0원 이상이어야 합니다.');
    // 혼합결제 행 합계 + 포인트 사용액 = 당일 수납 목표 금액
    if (collectedAmount !== todayTarget) {
      messages.push(
        collectionMode === 'deposit'
          ? '수납행 합계 + 포인트 사용액이 계약금(당일 수납액)과 일치해야 합니다.'
          : '수납행 합계 + 포인트 사용액이 최종 결제 금액과 일치해야 합니다.',
      );
    }
    // 계좌이체 행 입금자명 필수
    if (paymentRows.some(r => r.method === 'transfer' && r.amount > 0 && !r.depositorName.trim())) {
      messages.push('계좌이체 수납행의 입금자명을 입력해주세요.');
    }
    if (collectionMode === 'deposit' && depositAmount <= 0) {
      messages.push('계약금(당일 수납액)을 입력해주세요.');
    }
    if (pointAmount > 0 && !selectedMember) messages.push('포인트 사용은 회원 선택이 필요합니다.');
    if (selectedMember && pointAmount > selectedMember.mileage) messages.push('보유 포인트가 부족합니다.');
    return messages;
  }, [cartItems.length, collectionMode, paidAt, pointAmount, receiptFile, selectedMember, collectedAmount, todayTarget, paymentRows, depositAmount]);

  const isValid = validationMessages.length === 0;

  const uploadReceipt = async () => {
    if (!receiptFile) return null;
    const safeName = receiptFile.name.replace(/[^\w.-]/g, '_');
    const path = `payment-receipts/${getBranchId()}/${Date.now()}_${safeName}`;
    const result = await uploadFile('files', path, receiptFile);
    if ('error' in result) {
      toast.error(`영수증 업로드에 실패했습니다: ${result.error}`);
      return null;
    }
    return result.url;
  };

  const registerContractAndMembership = async () => {
    if (!selectedMember) return false;

    const paidDate = new Date(paidAt);
    const startDate = Number.isNaN(paidDate.getTime()) ? new Date() : paidDate;
    const endDate = maxDurationDays > 0
      ? new Date(startDate.getTime() + maxDurationDays * 24 * 60 * 60 * 1000)
      : null;
    const productName = cartItems.map(i => i.name).join(', ');

    const { error: contractError } = await supabase.from('contracts').insert({
      branchId: getBranchId(),
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      productName: productName || null,
      amount: subtotal,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });

    if (contractError) {
      toast.error('결제는 저장됐지만 이용권 등록에 실패했습니다. 관리자 확인이 필요합니다.');
      return false;
    }

    if (endDate) {
      const result = await updateMembershipPeriod(
        selectedMember.id,
        startDate.toISOString(),
        endDate.toISOString(),
        productName || undefined,
      );
      if (!result.success) {
        toast.error(result.message);
        return false;
      }
    }

    return true;
  };

  const executeReceiptRegistration = async () => {
    if (isProcessing || !selectedMember || !isValid) return;
    setIsProcessing(true);

    try {
      const uploadedReceiptUrl = await uploadReceipt();
      if (!uploadedReceiptUrl) return;

      if (pointAmount > 0) {
        const deductResult = await deductPoints(selectedMember.id, pointAmount);
        if (!deductResult.success) {
          toast.error(deductResult.message ?? '포인트 차감에 실패했습니다.');
          return;
        }
      }

      const staffName = getCurrentStaffName();
      const productName = cartItems.map(i => i.name).join(', ');
      // 혼합결제 행을 결제수단별로 집계
      const cardTotal = paymentRows.filter(r => r.method === 'card').reduce((s, r) => s + (r.amount || 0), 0);
      const cashTotal = paymentRows.filter(r => r.method === 'cash').reduce((s, r) => s + (r.amount || 0), 0);
      const transferTotal = paymentRows.filter(r => r.method === 'transfer').reduce((s, r) => s + (r.amount || 0), 0);
      const collectionModeLabel = { full: '현장 전액 등록', deposit: '계약금 등록', balance: '잔액 등록', link: '결제링크 발송' }[collectionMode];
      const rowsSummary = paymentRows
        .filter(r => r.amount > 0)
        .map(r => `  - ${PAY_METHOD_LABEL[r.method]} ${formatNumber(r.amount)}원${r.approvalNo ? ` / 승인 ${r.approvalNo}` : ''}${r.method === 'transfer' && r.depositorName ? ` / 입금자 ${r.depositorName}` : ''}${r.cashReceipt ? ' / 현금영수증' : ''}`)
        .join('\n');
      const receiptMemo = [
        '[현장 영수증 첨부 등록]',
        `내부 승인번호: ${internalApprovalNo}`,
        `수납 방식: ${collectionModeLabel}`,
        `혼합결제 행:\n${rowsSummary || '  - (없음)'}`,
        `포인트 사용액: ${formatNumber(pointAmount)}P`,
        discountAmount > 0 ? `수동 할인: ${formatNumber(discountAmount)}원` : null,
        collectionMode === 'deposit' ? `계약금(당일 수납): ${formatNumber(depositAmount)}원 / 잔액: ${formatNumber(balanceAmount)}원` : null,
        collectionMode === 'deposit' ? `이용권 개시: ${membershipStart === 'immediate' ? '즉시 개시' : '완납 후 개시'} / 잔액 처리: ${balancePlan === 'manual' ? '수기 분할 미수금' : '정기 할부'}` : null,
        `결제일시: ${new Date(paidAt).toISOString()}`,
        `지점 귀속: 결제 ${paymentBranch} / 이용 ${usageBranch} / 매출 ${revenueBranch} / 정산 ${settlementBranch}${incentiveOwner ? ` / 인센티브 ${incentiveOwner}` : ''}`,
        vanResult || vanTerminalId ? `VAN/POS: 단말 ${vanTerminalId || '-'} / 결과 ${vanResult || '-'}` : null,
        `영수증: ${receiptFile?.name ?? '-'} (${uploadedReceiptUrl})`,
        staffName ? `FC: ${staffName}` : null,
        fcMemo.trim() ? `FC 메모: ${fcMemo.trim()}` : null,
      ].filter(Boolean).join('\n');

      const { error } = await supabase.from('sales').insert({
        branchId: getBranchId(),
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        productId: cartItems.length === 1 ? cartItems[0].id : null,
        productName,
        type: cartItems.length === 1 ? cartItems[0].category : 'POS',
        quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        amount: subtotal,
        salePrice: subtotal,
        originalPrice: grossSubtotal,
        discountPrice: discountAmount,
        paymentMethod: cardTotal > 0 ? 'CARD' : transferTotal > 0 ? 'TRANSFER' : 'CASH',
        paymentType: collectionModeLabel,
        card: cardTotal,
        cash: cashTotal + transferTotal,
        mileageUsed: pointAmount,
        saleDate: new Date(paidAt).toISOString(),
        status: collectionMode === 'deposit' && balanceAmount > 0 ? 'PARTIAL' : 'COMPLETED',
        unpaid: balanceAmount,
        durationMonths: maxDurationDays > 0 ? Math.ceil(maxDurationDays / 30) : null,
        receiptIssued: true,
        staffName,
        memo: receiptMemo,
      });

      if (error) {
        toast.error('결제 등록 저장에 실패했습니다.');
        return;
      }

      const contractRegistered = await registerContractAndMembership();
      if (!contractRegistered) return;

      if (paymentRowsTotal > 0) {
        const pointResult = await accruePoints(selectedMember.id, paymentRowsTotal);
        if (pointResult.success && pointResult.accrued > 0) {
          toast.info(`${pointResult.accrued}P 포인트가 적립되었습니다.`);
        }
      }

      setReceiptUrl(uploadedReceiptUrl);
      setShowConfirmModal(false);
      setIsComplete(true);
      toast.success('결제완료와 회원/이용권 등록이 완료되었습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentConfirm = async () => {
    if (!selectedMember) return;
    const dupCheck = await checkDuplicatePayment(selectedMember.id, subtotal);
    if (dupCheck.isDuplicate) {
      setDupMessage(dupCheck.message ?? '최근에 동일한 결제가 있습니다.');
      setShowDupConfirm(true);
      return;
    }
    await executeReceiptRegistration();
  };

  const handlePaymentLinkSend = async () => {
    if (isProcessing || !isValid || !selectedMember) return;
    setIsProcessing(true);
    try {
      setLinkSent(true);
      toast.success(`${selectedMember.name}님에게 결제링크 발송 준비가 완료되었습니다.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCartItems([]);
    setSelectedMember(null);
    setMemberSearch('');
    setCollectionMode('full');
    setPaymentRows([newPaymentRow('card')]);
    setPointAmount(0);
    setDiscountAmount(0);
    setDepositAmount(0);
    setMembershipStart('immediate');
    setBalancePlan('manual');
    setVanTerminalId('');
    setVanResult('');
    setIncentiveOwner('');
    setPaidAt(toDateTimeLocalValue());
    setReceiptFile(null);
    setReceiptUrl(null);
    setFcMemo('');
    setIsComplete(false);
    setShowConfirmModal(false);
    setLinkSent(false);
  };

  const handleReceiptFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setReceiptFile(null);
      return;
    }
    const allowed = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!allowed) {
      toast.error('영수증 파일은 이미지 또는 PDF만 첨부할 수 있습니다.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('영수증 파일은 10MB 이하만 첨부할 수 있습니다.');
      event.target.value = '';
      return;
    }
    setReceiptFile(file);
  };

  if (isComplete) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-surface rounded-xl border border-line shadow-card p-xxl animate-in fade-in zoom-in duration-400">
          <div className="w-20 h-20 bg-accent-light rounded-full flex items-center justify-center text-accent mb-xl">
            <CheckCircle2 size={44} strokeWidth={1.5} />
          </div>
          <h2 className="text-[24px] font-bold text-content mb-sm">결제 등록이 완료되었습니다</h2>
          <p className="text-[14px] text-content-secondary mb-xl text-center leading-relaxed">
            {selectedMember ? `${selectedMember.name} 회원님의 ` : ''}결제완료와 회원/이용권 등록이 함께 반영되었습니다.
          </p>

          <div className="print:block hidden w-full max-w-sm mx-auto mb-4 text-left text-[12px] font-mono border border-gray-300 p-4 rounded">
            <p className="text-center font-bold text-[14px] mb-2">현장 결제 등록 영수증</p>
            <hr className="mb-2" />
            {selectedMember && <p>회원: {selectedMember.name}</p>}
            <p>내부 승인번호: {internalApprovalNo}</p>
            {paymentRows.filter(r => r.amount > 0).map(r => (
              <p key={r.rowId}>{PAY_METHOD_LABEL[r.method]}: {r.amount.toLocaleString()}원</p>
            ))}
            <p>포인트 사용: {pointAmount.toLocaleString()}P</p>
            <p>결제일시: {paidAt}</p>
            <hr className="my-2" />
            {cartItems.map(item => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name} x{item.quantity}</span>
                <span>{(item.price * item.quantity).toLocaleString()}원</span>
              </div>
            ))}
            <hr className="my-2" />
            <div className="flex justify-between font-bold">
              <span>합계</span>
              <span>{subtotal.toLocaleString()}원</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md w-full max-w-sm mb-xl">
            <button
              onClick={() => { toast.info('영수증 인쇄를 시작합니다.'); setTimeout(() => window.print(), 200); }}
              className="flex flex-col items-center justify-center p-lg rounded-xl border border-line bg-surface hover:bg-surface-tertiary transition-all gap-sm"
            >
              <Printer className="text-primary" size={28} strokeWidth={1.5} />
              <span className="text-[13px] font-semibold text-content-secondary">등록 내역 출력</span>
            </button>
            <button
              onClick={() => receiptUrl ? window.open(receiptUrl, '_blank', 'noopener,noreferrer') : toast.info('첨부된 영수증이 없습니다.')}
              className="flex flex-col items-center justify-center p-lg rounded-xl border border-line bg-surface hover:bg-surface-tertiary transition-all gap-sm"
            >
              <FileText className="text-accent" size={28} strokeWidth={1.5} />
              <span className="text-[13px] font-semibold text-content-secondary">영수증 파일 보기</span>
            </button>
          </div>

          <div className="flex gap-md">
            <button
              onClick={handleReset}
              className="px-xl py-sm rounded-button border border-line bg-surface text-content-secondary font-semibold hover:bg-surface-tertiary transition-colors text-[14px]"
            >
              계속 판매하기
            </button>
            <button
              onClick={() => moveToPage(970)}
              className="px-xl py-sm rounded-button bg-primary text-surface font-semibold hover:bg-primary-dark transition-colors text-[14px] shadow-md"
            >
              매출 현황으로
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="결제 처리"
        description="외부 POS/현금 수납 완료 후 영수증을 첨부해 결제와 회원/이용권 등록을 완료합니다."
        actions={
          <button
            onClick={handleReset}
            className="flex items-center gap-xs px-md py-sm bg-surface border border-line text-content-secondary rounded-button text-[13px] font-semibold hover:bg-surface-tertiary transition-colors"
          >
            <RotateCcw size={14} />
            초기화
          </button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-lg">
        <div className="flex-1 space-y-lg">
          <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
            <div className="px-lg py-md border-b border-line bg-surface-secondary/40">
              <h3 className="text-[14px] font-bold text-content flex items-center gap-sm">
                <ShoppingCart className="text-primary" size={16} />
                결제 상품 목록
              </h3>
            </div>
            <div className="divide-y divide-line">
              {cartItems.length > 0 ? cartItems.map(item => (
                <div key={item.id} className="flex items-center justify-between px-lg py-md">
                  <div className="flex items-center gap-md">
                    <StatusBadge variant="secondary">{item.category}</StatusBadge>
                    <span className="text-[14px] font-medium text-content">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-lg">
                    <span className="text-[13px] text-content-tertiary">x{item.quantity}</span>
                    <span className="text-[15px] font-semibold text-content tabular-nums">
                      {formatKRW(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="px-lg py-xl text-center text-[13px] text-content-tertiary">
                  장바구니가 비어 있습니다.
                </div>
              )}
            </div>
            <div className="px-lg py-md bg-surface-secondary/30 border-t border-line flex justify-between items-center">
              <span className="text-[13px] text-content-secondary font-medium">장바구니 최종 합계</span>
              <span className="text-[22px] font-bold text-primary tabular-nums">
                {formatKRW(subtotal)}
              </span>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line shadow-card p-lg">
            <h3 className="text-[14px] font-bold text-content mb-md">
              회원 검색 <span className="text-[12px] font-normal text-state-error ml-xs">필수</span>
            </h3>

            {selectedMember ? (
              <div className="flex items-center justify-between p-md bg-accent-light rounded-xl border border-accent/20">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-surface font-bold text-[14px]">
                    {selectedMember.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-content text-[14px]">{selectedMember.name}</p>
                    <p className="text-[12px] text-content-secondary">{selectedMember.phone}</p>
                    <p className="text-[12px] text-accent font-semibold">
                      보유 포인트: {formatNumber(selectedMember.mileage)} P
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedMember(null); setMemberSearch(''); }}
                  className="text-content-tertiary hover:text-state-error transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
                <input
                  type="text"
                  placeholder="이름 또는 전화번호 검색..."
                  value={memberSearch}
                  onChange={e => handleMemberSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-surface-secondary border border-line rounded-button text-[13px] text-content placeholder:text-content-tertiary focus:border-primary focus:outline-none transition-colors"
                />
                {memberResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-surface border border-line rounded-xl shadow-lg overflow-hidden">
                    {memberResults.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedMember(m); setMemberSearch(m.name); setMemberResults([]); }}
                        className="w-full flex items-center justify-between px-lg py-md hover:bg-surface-secondary transition-colors border-b border-line last:border-0"
                      >
                        <div className="text-left">
                          <p className="text-[14px] font-semibold text-content">{m.name}</p>
                          <p className="text-[12px] text-content-tertiary">{m.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-content-tertiary">보유 포인트</p>
                          <p className="text-[13px] font-bold text-accent tabular-nums">{formatNumber(m.mileage)} P</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 수동 할인 입력 (v1: 자동 적용 없음, 운영자 수동 확정 금액만) */}
          <div className="bg-surface rounded-xl border border-line shadow-card p-lg space-y-md">
            <h3 className="text-[14px] font-bold text-content">수동 할인</h3>
            <p className="text-[11px] text-content-tertiary">
              할인 정책·등급 혜택 자동 적용은 v1 미지원. 운영자가 확정한 할인 금액만 입력합니다.
            </p>
            <label className="block">
              <span className="block text-[12px] font-semibold text-content-secondary mb-xs">할인 금액</span>
              <input
                type="number"
                min={0}
                max={grossSubtotal}
                value={discountAmount || ''}
                onChange={e => setDiscountAmount(Math.min(grossSubtotal, Math.max(0, Number(e.target.value))))}
                className="w-full px-md py-sm border border-line rounded-button text-[14px] text-right tabular-nums bg-surface focus:border-primary focus:outline-none"
                placeholder="0"
              />
            </label>
            <div className="flex justify-between text-[12px] text-content-secondary pt-xs border-t border-line">
              <span>정가 {formatKRW(grossSubtotal)} − 할인 {formatKRW(discountAmount)}</span>
              <span className="font-bold text-primary">= {formatKRW(subtotal)}</span>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[440px] space-y-lg">
          {/* 내부 승인번호 (PAY-01-13) */}
          <div className="bg-surface rounded-xl border border-line shadow-card p-md flex items-center gap-sm">
            <Hash size={16} className="text-primary" />
            <span className="text-[12px] text-content-secondary">내부 승인번호</span>
            <span className="ml-auto text-[13px] font-bold text-content tabular-nums">{internalApprovalNo}</span>
          </div>

          <div className="bg-surface rounded-xl border border-line shadow-card p-lg">
            <h3 className="text-[14px] font-bold text-content mb-md">수납 방식</h3>
            <div className="grid grid-cols-2 gap-sm">
              {([
                { key: 'full', label: '현장 전액 등록', icon: <Upload size={20} strokeWidth={1.5} /> },
                { key: 'deposit', label: '계약금 등록', icon: <CreditCard size={20} strokeWidth={1.5} /> },
                { key: 'balance', label: '잔액 등록', icon: <Banknote size={20} strokeWidth={1.5} /> },
                { key: 'link', label: '결제링크 발송', icon: <Link2 size={20} strokeWidth={1.5} /> },
              ] as { key: CollectionMode; label: string; icon: React.ReactNode }[]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setCollectionMode(opt.key)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-xs py-md rounded-xl border-2 transition-all font-semibold text-[12px]',
                    collectionMode === opt.key
                      ? 'border-primary bg-primary-light text-primary shadow-sm'
                      : 'border-line bg-surface text-content-secondary hover:border-primary/40 hover:bg-surface-secondary'
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
            {collectionMode === 'link' && (
              <p className="mt-md text-[11px] text-content-tertiary">
                결제링크는 전액 결제 전용입니다. 계약금/잔액 결제에는 사용하지 않습니다.
              </p>
            )}
          </div>

          {collectionMode !== 'link' ? (
            <div className="bg-surface rounded-xl border border-line shadow-card p-lg space-y-lg">
              {/* 혼합결제 입력 그리드 (PAY-01-14) */}
              <div>
                <div className="flex items-center justify-between mb-md">
                  <h3 className="text-[14px] font-bold text-content">현장 결제 등록 정보 (혼합결제)</h3>
                </div>
                <p className="text-[11px] text-content-tertiary mb-md">
                  외부 POS/현금/계좌이체 수납 결과를 결제수단별 행으로 등록합니다. 카드 2~3개 분할도 가능합니다.
                </p>
                <div className="space-y-md">
                  {paymentRows.map((row, idx) => (
                    <div key={row.rowId} className="rounded-xl border border-line p-md space-y-sm bg-surface-secondary/30">
                      <div className="flex items-center gap-sm">
                        <span className="text-[12px] font-bold text-content-tertiary w-6">#{idx + 1}</span>
                        <select
                          value={row.method}
                          onChange={e => updatePaymentRow(row.rowId, { method: e.target.value as PayMethod })}
                          className="flex-1 px-sm py-xs border border-line rounded-button text-[13px] bg-surface focus:border-primary focus:outline-none"
                        >
                          <option value="card">카드</option>
                          <option value="cash">현금</option>
                          <option value="transfer">계좌이체</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={row.amount || ''}
                          onChange={e => updatePaymentRow(row.rowId, { amount: Math.max(0, Number(e.target.value)) })}
                          className="w-28 px-sm py-xs border border-line rounded-button text-[13px] text-right tabular-nums bg-surface focus:border-primary focus:outline-none"
                          placeholder="금액"
                        />
                        <button
                          onClick={() => removePaymentRow(row.rowId)}
                          disabled={paymentRows.length <= 1}
                          className="text-content-tertiary hover:text-state-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-sm">
                        <input
                          type="text"
                          value={row.approvalNo}
                          onChange={e => updatePaymentRow(row.rowId, { approvalNo: e.target.value })}
                          className="px-sm py-xs border border-line rounded-button text-[12px] bg-surface focus:border-primary focus:outline-none"
                          placeholder={row.method === 'transfer' ? '이체확인번호' : '외부 승인번호'}
                        />
                        <input
                          type="datetime-local"
                          value={row.approvedAt}
                          onChange={e => updatePaymentRow(row.rowId, { approvedAt: e.target.value })}
                          className="px-sm py-xs border border-line rounded-button text-[12px] bg-surface focus:border-primary focus:outline-none"
                        />
                      </div>
                      {row.method === 'transfer' && (
                        <input
                          type="text"
                          value={row.depositorName}
                          onChange={e => updatePaymentRow(row.rowId, { depositorName: e.target.value })}
                          className={cn(
                            'w-full px-sm py-xs border rounded-button text-[12px] bg-surface focus:outline-none',
                            row.amount > 0 && !row.depositorName.trim() ? 'border-state-error' : 'border-line focus:border-primary',
                          )}
                          placeholder="입금자명 (회원명과 달라도 허용, 필수)"
                        />
                      )}
                      {row.method === 'cash' && (
                        <label className="flex items-center gap-xs text-[12px] text-content-secondary">
                          <input
                            type="checkbox"
                            checked={row.cashReceipt}
                            onChange={e => updatePaymentRow(row.rowId, { cashReceipt: e.target.checked })}
                          />
                          현금영수증 처리
                        </label>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-sm mt-md">
                  <button onClick={() => addPaymentRow('card')} className="flex items-center gap-xs px-sm py-xs rounded-button border border-line text-[12px] text-content-secondary hover:bg-surface-secondary transition-colors">
                    <Plus size={13} /> 카드
                  </button>
                  <button onClick={() => addPaymentRow('cash')} className="flex items-center gap-xs px-sm py-xs rounded-button border border-line text-[12px] text-content-secondary hover:bg-surface-secondary transition-colors">
                    <Plus size={13} /> 현금
                  </button>
                  <button onClick={() => addPaymentRow('transfer')} className="flex items-center gap-xs px-sm py-xs rounded-button border border-line text-[12px] text-content-secondary hover:bg-surface-secondary transition-colors">
                    <Plus size={13} /> 계좌이체
                  </button>
                </div>
              </div>

              {/* VAN/POS 결과 박스 */}
              <div>
                <h3 className="text-[13px] font-bold text-content mb-sm flex items-center gap-xs">
                  <ScanLine size={14} className="text-primary" /> VAN/POS 결과
                </h3>
                <div className="grid grid-cols-2 gap-sm">
                  <input
                    type="text"
                    value={vanTerminalId}
                    onChange={e => setVanTerminalId(e.target.value)}
                    className="px-sm py-xs border border-line rounded-button text-[12px] bg-surface focus:border-primary focus:outline-none"
                    placeholder="단말 ID"
                  />
                  <input
                    type="text"
                    value={vanResult}
                    onChange={e => setVanResult(e.target.value)}
                    className="px-sm py-xs border border-line rounded-button text-[12px] bg-surface focus:border-primary focus:outline-none"
                    placeholder="승인 결과/응답메시지"
                  />
                </div>
              </div>

              {/* 지점 귀속 설정 */}
              <div>
                <h3 className="text-[13px] font-bold text-content mb-sm flex items-center gap-xs">
                  <Building2 size={14} className="text-primary" /> 지점 귀속 설정
                </h3>
                <div className="grid grid-cols-2 gap-sm">
                  {([
                    ['결제지점', paymentBranch, setPaymentBranch],
                    ['이용지점', usageBranch, setUsageBranch],
                    ['매출 귀속', revenueBranch, setRevenueBranch],
                    ['정산 지점', settlementBranch, setSettlementBranch],
                  ] as [string, string, (v: string) => void][]).map(([label, value, setter]) => (
                    <label key={label} className="block">
                      <span className="block text-[11px] font-semibold text-content-tertiary mb-xs">{label}</span>
                      <select
                        value={value}
                        onChange={e => setter(e.target.value)}
                        className="w-full px-sm py-xs border border-line rounded-button text-[12px] bg-surface focus:border-primary focus:outline-none"
                      >
                        {BRANCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <label className="block mt-sm">
                  <span className="block text-[11px] font-semibold text-content-tertiary mb-xs">인센티브 귀속자</span>
                  <input
                    type="text"
                    value={incentiveOwner}
                    onChange={e => setIncentiveOwner(e.target.value)}
                    className="w-full px-sm py-xs border border-line rounded-button text-[12px] bg-surface focus:border-primary focus:outline-none"
                    placeholder="담당 직원명"
                  />
                </label>
              </div>

              {/* 계약금 등록: 당일 수납액 + 이용권 개시 + 잔액 처리 방식 */}
              {collectionMode === 'deposit' && (
                <div className="rounded-xl border border-primary/30 bg-primary-light/30 p-md space-y-md">
                  <h3 className="text-[13px] font-bold text-content">계약금 등록</h3>
                  <label className="block">
                    <span className="block text-[12px] font-semibold text-content-secondary mb-xs">계약금 (당일 수납액)</span>
                    <input
                      type="number"
                      min={0}
                      max={subtotal}
                      value={depositAmount || ''}
                      onChange={e => setDepositAmount(Math.min(subtotal, Math.max(0, Number(e.target.value))))}
                      className="w-full px-md py-sm border border-line rounded-button text-[14px] text-right tabular-nums bg-surface focus:border-primary focus:outline-none"
                      placeholder="0"
                    />
                  </label>
                  <div className="flex justify-between text-[12px] text-content-secondary">
                    <span>잔액</span>
                    <span className="font-bold text-state-error tabular-nums">{formatKRW(balanceAmount)}</span>
                  </div>
                  <div>
                    <span className="block text-[12px] font-semibold text-content-secondary mb-xs">잔액 처리 방식</span>
                    <div className="grid grid-cols-2 gap-sm">
                      {([['manual', '수기 분할 미수금'], ['installment', '정기 할부']] as [BalancePlan, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setBalancePlan(key)}
                          className={cn(
                            'py-xs rounded-button border text-[12px] font-semibold transition-colors',
                            balancePlan === key ? 'border-primary bg-primary-light text-primary' : 'border-line text-content-secondary hover:bg-surface-secondary',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[12px] font-semibold text-content-secondary mb-xs">이용권 개시 옵션</span>
                    <div className="grid grid-cols-2 gap-sm">
                      {([['immediate', '즉시 개시'], ['afterPaid', '완납 후 개시']] as [MembershipStart, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setMembershipStart(key)}
                          className={cn(
                            'py-xs rounded-button border text-[12px] font-semibold transition-colors',
                            membershipStart === key ? 'border-primary bg-primary-light text-primary' : 'border-line text-content-secondary hover:bg-surface-secondary',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-md">
                <label className="block">
                  <span className="block text-[12px] font-semibold text-content-secondary mb-xs">포인트 사용액</span>
                  <input
                    type="number"
                    min={0}
                    disabled={!selectedMember}
                    value={pointAmount || ''}
                    onChange={e => setPointAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-md py-sm border border-line rounded-button text-[14px] text-right tabular-nums bg-surface focus:border-primary focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    placeholder="0"
                  />
                </label>

                <label className="block">
                  <span className="block text-[12px] font-semibold text-content-secondary mb-xs">결제일시</span>
                  <input
                    type="datetime-local"
                    value={paidAt}
                    onChange={e => setPaidAt(e.target.value)}
                    className="w-full px-md py-sm border border-line rounded-button text-[14px] bg-surface focus:border-primary focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="block text-[12px] font-semibold text-content-secondary mb-xs">영수증 파일</span>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleReceiptFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className={cn(
                      'flex items-center gap-sm rounded-xl border-2 border-dashed p-md transition-colors',
                      receiptFile ? 'border-accent bg-accent-light/40' : 'border-line bg-surface-secondary hover:border-primary/50'
                    )}>
                      <FileText size={18} className={receiptFile ? 'text-accent' : 'text-content-tertiary'} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-content">
                          {receiptFile ? receiptFile.name : '이미지 또는 PDF 첨부'}
                        </p>
                        <p className="text-[11px] text-content-tertiary">최대 10MB</p>
                      </div>
                    </div>
                  </div>
                </label>

                <label className="block">
                  <span className="block text-[12px] font-semibold text-content-secondary mb-xs">FC 메모</span>
                  <textarea
                    value={fcMemo}
                    onChange={e => setFcMemo(e.target.value)}
                    rows={3}
                    className="w-full px-md py-sm border border-line rounded-button text-[13px] bg-surface focus:border-primary focus:outline-none resize-none"
                    placeholder="수납 특이사항, 영수증 확인 메모"
                  />
                </label>
              </div>

              {/* 잔액 요약 박스 + 금액 일치 검증 */}
              <div className={cn(
                'rounded-xl border p-md text-[12px] font-semibold',
                amountDiff === 0 ? 'border-state-success/30 bg-state-success/10 text-state-success' : 'border-state-error/30 bg-state-error/10 text-state-error'
              )}>
                <div className="flex justify-between">
                  <span>수납행 합계 + 포인트</span>
                  <span>{formatKRW(collectedAmount)}</span>
                </div>
                <div className="flex justify-between mt-xs">
                  <span>{collectionMode === 'deposit' ? '계약금(당일 수납)' : '최종 결제 금액'}</span>
                  <span>{formatKRW(todayTarget)}</span>
                </div>
                {collectionMode === 'deposit' && (
                  <div className="flex justify-between mt-xs">
                    <span>잔액 ({balancePlan === 'manual' ? '수기 분할' : '정기 할부'})</span>
                    <span>{formatKRW(balanceAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between mt-xs pt-xs border-t border-current/20">
                  <span>검증</span>
                  <span>{amountDiff === 0 ? '금액 일치' : `${formatNumber(Math.abs(amountDiff))}원 ${amountDiff > 0 ? '부족' : '초과'}`}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-line shadow-card p-lg space-y-md">
              <h3 className="text-[14px] font-bold text-content">결제링크 발송</h3>
              <div className="rounded-xl border border-line bg-surface-secondary p-md space-y-xs">
                <div className="flex justify-between text-[13px]">
                  <span className="text-content-secondary">발송 대상</span>
                  <span className="font-semibold text-content">{selectedMember ? `${selectedMember.name} (${selectedMember.phone})` : '회원 미선택'}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-content-secondary">고정 금액</span>
                  <span className="font-bold text-primary">{formatKRW(subtotal)}</span>
                </div>
              </div>
              {linkSent && (
                <div className="rounded-xl border border-state-success/30 bg-state-success/10 p-md text-[12px] font-semibold text-state-success">
                  결제링크 발송 준비 완료
                </div>
              )}
            </div>
          )}

          <div className="bg-surface rounded-xl border border-line shadow-card p-lg space-y-md">
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-content-secondary">최종 합계</span>
              <span className="text-[24px] font-bold text-primary tabular-nums">
                {formatKRW(subtotal)}
              </span>
            </div>

            {validationMessages.length > 0 && (
              <div className="rounded-xl border border-state-error/20 bg-state-error/5 p-md space-y-xs">
                {validationMessages.slice(0, 3).map(message => (
                  <p key={message} className="text-[12px] font-medium text-state-error">{message}</p>
                ))}
              </div>
            )}

            <button
              disabled={!isValid || isProcessing}
              onClick={() => collectionMode === 'link' ? void handlePaymentLinkSend() : setShowConfirmModal(true)}
              className={cn(
                'w-full py-md rounded-button text-[15px] font-bold transition-all flex items-center justify-center gap-sm shadow-md',
                isValid && !isProcessing
                  ? 'bg-primary text-surface hover:bg-primary-dark active:scale-[0.98] shadow-primary/20'
                  : 'bg-surface-tertiary text-content-tertiary cursor-not-allowed'
              )}
            >
              {collectionMode === 'link' ? <Link2 size={18} /> : <Upload size={18} />}
              {collectionMode === 'link' ? '결제링크 발송' : '결제 완료 등록'}
            </button>

            <button
              onClick={() => moveToPage(971)}
              className="w-full py-sm rounded-button border border-line text-[13px] text-content-secondary font-medium hover:bg-surface-secondary transition-colors"
            >
              POS 판매로 돌아가기
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDupConfirm}
        title="중복 결제 경고"
        description={dupMessage + '\n\n계속 진행하시겠습니까?'}
        confirmLabel="계속 진행"
        cancelLabel="취소"
        variant="danger"
        onConfirm={() => {
          setShowDupConfirm(false);
          void executeReceiptRegistration();
        }}
        onCancel={() => setShowDupConfirm(false)}
      />

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md">
          <div className="w-full max-w-md bg-surface rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-xl py-lg border-b border-line flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-content">결제 등록 확인</h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-content-tertiary hover:text-content transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-xl space-y-md">
              <div className="bg-surface-secondary rounded-xl p-md space-y-sm">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-[13px]">
                    <span className="text-content-secondary">{item.name} x{item.quantity}</span>
                    <span className="font-semibold text-content tabular-nums">{formatKRW(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="pt-sm border-t border-line flex justify-between">
                  <span className="text-[14px] font-bold text-content">장바구니 합계</span>
                  <span className="text-[16px] font-bold text-primary tabular-nums">{formatKRW(subtotal)}</span>
                </div>
              </div>

              {[
                ['회원', selectedMember?.name ?? '-'],
                ['내부 승인번호', internalApprovalNo],
                ['수납 방식', { full: '현장 전액 등록', deposit: '계약금 등록', balance: '잔액 등록', link: '결제링크 발송' }[collectionMode]],
                ['혼합결제 수납', paymentRows.filter(r => r.amount > 0).map(r => `${PAY_METHOD_LABEL[r.method]} ${formatNumber(r.amount)}`).join(' / ') || '-'],
                ['포인트 사용액', `${formatNumber(pointAmount)}P`],
                collectionMode === 'deposit' ? ['잔액', formatKRW(balanceAmount)] : null,
                ['결제일시', paidAt ? paidAt.replace('T', ' ') : '-'],
                ['영수증 파일', receiptFile?.name ?? '-'],
              ].filter((x): x is [string, string] => x !== null).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-md text-[13px]">
                  <span className="text-content-secondary">{label}</span>
                  <span className="font-semibold text-content text-right break-all">{value}</span>
                </div>
              ))}
              {fcMemo.trim() && (
                <div className="rounded-xl bg-surface-secondary p-md text-[12px] text-content-secondary whitespace-pre-wrap">
                  {fcMemo.trim()}
                </div>
              )}
            </div>

            <div className="px-xl py-lg border-t border-line flex gap-md">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-sm rounded-button border border-line text-[14px] font-semibold text-content-secondary hover:bg-surface-secondary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handlePaymentConfirm}
                disabled={isProcessing}
                className="flex-[2] py-sm rounded-button bg-primary text-surface text-[14px] font-bold hover:bg-primary-dark transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "등록 중..." : "결제 완료 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
