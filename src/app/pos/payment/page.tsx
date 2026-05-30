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
  ChevronRight,
  RotateCcw,
  Upload,
  Link2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { moveToPage } from '@/internal';
import { supabase } from '@/lib/supabase';
import { checkDuplicatePayment, accruePoints, updateMembershipPeriod } from '@/lib/businessLogic';
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

const createInternalApprovalNo = () => `CRM-${Date.now().toString().slice(-8)}`;

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

type CollectionMode = 'receipt' | 'link';
type PaymentMethod = 'card' | 'cash' | 'transfer';
type CashReceiptType = 'income' | 'expense';

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: '카드',
  cash: '현금',
  transfer: '계좌이체',
};

const PAYMENT_METHOD_CODE: Record<PaymentMethod, string> = {
  card: 'CARD',
  cash: 'CASH',
  transfer: 'TRANSFER',
};

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

interface PaymentLine {
  itemKey: string;
  method: PaymentMethod;
  amount: number;
  approvalNo: string;
  terminalId: string;
  externalTransactionId: string;
  bankPayerName: string;
  transferConfirmNo: string;
  cashReceiptIssued: boolean;
  cashReceiptType: CashReceiptType;
  cashReceiptIdentifier: string;
}

const getCartLineKey = (item: CartItem, index: number) => `${item.id}-${index}`;

const createPaymentLine = (itemKey: string, amount: number): PaymentLine => ({
  itemKey,
  method: 'card',
  amount,
  approvalNo: '',
  terminalId: '',
  externalTransactionId: '',
  bankPayerName: '',
  transferConfirmNo: '',
  cashReceiptIssued: false,
  cashReceiptType: 'income',
  cashReceiptIdentifier: '',
});

export default function PosPayment() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberResults, setMemberResults] = useState<Member[]>([]);

  const [collectionMode, setCollectionMode] = useState<CollectionMode>('receipt');
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [paidAt, setPaidAt] = useState(toDateTimeLocalValue());
  const [internalApprovalNo, setInternalApprovalNo] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [fcMemo, setFcMemo] = useState('');

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

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const paymentLineByKey = useMemo(
    () => new Map(paymentLines.map(line => [line.itemKey, line])),
    [paymentLines],
  );
  const cartPaymentLines = useMemo(
    () => cartItems.map((item, index) => {
      const itemKey = getCartLineKey(item, index);
      const fixedAmount = item.price * item.quantity;
      const storedLine = paymentLineByKey.get(itemKey);
      return {
        item,
        itemKey,
        line: storedLine
          ? { ...storedLine, amount: fixedAmount }
          : createPaymentLine(itemKey, fixedAmount),
      };
    }),
    [cartItems, paymentLineByKey],
  );
  const paymentAmount = paymentLines.reduce((sum, line) => sum + line.amount, 0);
  const amountDiff = subtotal - paymentAmount;
  const maxDurationDays = Math.max(0, ...cartItems.map(item => Number(item.durationDays ?? 0)));
  const paymentBreakdown = paymentLines.reduce(
    (acc, line) => {
      acc[line.method] += line.amount;
      return acc;
    },
    { card: 0, cash: 0, transfer: 0 } as Record<PaymentMethod, number>,
  );
  const activePaymentMethods = Array.from(new Set(paymentLines.filter(line => line.amount > 0).map(line => line.method)));
  const paymentMethodSummary = activePaymentMethods.length === 0
    ? '-'
    : activePaymentMethods.map(method => PAYMENT_METHOD_LABEL[method]).join(' + ');
  const paymentMethodCode = activePaymentMethods.length === 1 && activePaymentMethods[0]
      ? PAYMENT_METHOD_CODE[activePaymentMethods[0]]
      : 'MIXED';
  const anyCashReceiptIssued = paymentLines.some(line => line.cashReceiptIssued);

  useEffect(() => {
    setPaymentLines(prev => {
      const previousByKey = new Map(prev.map(line => [line.itemKey, line]));
      return cartItems.map((item, index) => {
        const itemKey = getCartLineKey(item, index);
        const fixedAmount = item.price * item.quantity;
        const previous = previousByKey.get(itemKey);
        return previous
          ? { ...previous, amount: fixedAmount }
          : createPaymentLine(itemKey, fixedAmount);
      });
    });
  }, [cartItems]);

  useEffect(() => {
    setInternalApprovalNo(prev => {
      if (cartItems.length === 0) return '';
      return prev || createInternalApprovalNo();
    });
  }, [cartItems.length]);

  const updatePaymentLine = (itemKey: string, patch: Partial<PaymentLine>) => {
    const allowedPatch = { ...patch };
    delete allowedPatch.amount;
    setPaymentLines(prev => prev.map(line => (
      line.itemKey === itemKey ? { ...line, ...allowedPatch } : line
    )));
  };

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

    if (cartItems.length > 0 && !internalApprovalNo) messages.push('CRM 내부 승인번호를 생성 중입니다.');
    if (!receiptFile) messages.push('영수증 파일을 첨부해주세요.');
    if (!paidAt) messages.push('결제일시를 입력해주세요.');
    if (paymentLines.length !== cartItems.length) messages.push('상품별 결제 행을 확인해주세요.');
    cartPaymentLines.forEach(({ item, line }) => {
      const rowLabel = item.name;
      if (line.amount !== item.price * item.quantity) messages.push(`${rowLabel} 결제금액이 상품금액과 일치하지 않습니다.`);
      if (line.amount > 0 && line.method === 'card' && !line.approvalNo.trim()) {
        messages.push(`${rowLabel} 카드 승인번호를 입력해주세요.`);
      }
      if (line.amount > 0 && line.method === 'transfer' && !line.bankPayerName.trim()) {
        messages.push(`${rowLabel} 계좌이체 입금자명을 입력해주세요.`);
      }
      if (line.amount > 0 && line.method === 'transfer' && !line.transferConfirmNo.trim()) {
        messages.push(`${rowLabel} 이체확인번호를 입력해주세요.`);
      }
      if (line.amount > 0 && (line.method === 'cash' || line.method === 'transfer') && line.cashReceiptIssued && !line.cashReceiptIdentifier.trim()) {
        messages.push(`${rowLabel} 현금영수증 식별번호를 입력해주세요.`);
      }
    });
    if (paymentAmount < 0) messages.push('상품별 결제금액은 0원 이상이어야 합니다.');
    if (paymentAmount !== subtotal) messages.push('상품별 결제금액 합계가 장바구니 합계와 일치해야 합니다.');
    return messages;
  }, [cartItems.length, cartPaymentLines, collectionMode, internalApprovalNo, paidAt, paymentAmount, paymentLines.length, receiptFile, selectedMember, subtotal]);

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

      const staffName = getCurrentStaffName();
      const productName = cartItems.map(i => i.name).join(', ');
      const paymentLineMemo = cartPaymentLines.map(({ item, line }) => {
        const details = [
          `${item.name} x${item.quantity}`,
          PAYMENT_METHOD_LABEL[line.method],
          `${formatNumber(line.amount)}원`,
          line.method === 'card' ? `카드 승인번호 ${line.approvalNo.trim()}` : null,
          line.terminalId.trim() ? `단말 ID ${line.terminalId.trim()}` : null,
          line.externalTransactionId.trim() ? `외부 거래번호 ${line.externalTransactionId.trim()}` : null,
          line.method === 'transfer' ? `입금자명 ${line.bankPayerName.trim()}` : null,
          line.method === 'transfer' ? `이체확인번호 ${line.transferConfirmNo.trim()}` : null,
          line.method === 'cash' || line.method === 'transfer'
            ? `현금영수증 ${line.cashReceiptIssued ? `${line.cashReceiptType === 'income' ? '소득공제' : '지출증빙'} / ${line.cashReceiptIdentifier.trim() || '-'}` : '미처리'}`
            : null,
        ].filter(Boolean);
        return details.join(' | ');
      });
      const receiptMemo = [
        '[현장 영수증 첨부 등록]',
        `CRM 내부 승인번호: ${internalApprovalNo}`,
        `결제수단: ${paymentMethodSummary}`,
        `상품별 결제금액 합계: ${formatNumber(paymentAmount)}원`,
        `상품별 결제수단: ${paymentLineMemo.join('\n')}`,
        `결제일시: ${new Date(paidAt).toISOString()}`,
        `영수증: ${receiptFile?.name ?? '-'} (${uploadedReceiptUrl})`,
        staffName ? `FC: ${staffName}` : null,
        fcMemo.trim() ? `FC 메모: ${fcMemo.trim()}` : null,
      ].filter(Boolean).join('\n');

      const { data: saleRow, error } = await supabase.from('sales').insert({
        branchId: getBranchId(),
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        productId: cartItems.length === 1 ? cartItems[0].id : null,
        productName,
        type: cartItems.length === 1 ? cartItems[0].category : 'POS',
        quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        amount: subtotal,
        salePrice: subtotal,
        originalPrice: subtotal,
        discountPrice: 0,
        paymentMethod: paymentMethodCode,
        paymentType: '영수증 첨부 등록',
        card: paymentBreakdown.card,
        cash: paymentBreakdown.cash + paymentBreakdown.transfer,
        mileageUsed: 0,
        approvalNo: internalApprovalNo,
        saleDate: new Date(paidAt).toISOString(),
        status: 'COMPLETED',
        unpaid: 0,
        durationMonths: maxDurationDays > 0 ? Math.ceil(maxDurationDays / 30) : null,
        receiptIssued: anyCashReceiptIssued,
        staffName,
        memo: receiptMemo,
      }).select('id').single();

      if (error) {
        toast.error('결제 등록 저장에 실패했습니다.');
        return;
      }

      const saleId = Number(saleRow?.id);
      if (!saleId) {
        toast.error('결제 등록 번호를 확인할 수 없습니다.');
        return;
      }

      const paymentLineRows: Array<Record<string, string | number | boolean | null>> = cartPaymentLines
        .filter(({ line }) => line.amount > 0)
        .map(({ item, itemKey, line }) => ({
          saleId,
          branchId: getBranchId(),
          memberId: selectedMember.id,
          productId: item.id,
          productName: item.name,
          itemKey,
          lineType: 'PAYMENT',
          method: PAYMENT_METHOD_CODE[line.method],
          amount: line.amount,
          refundedAmount: 0,
          approvalNo: line.method === 'card' ? line.approvalNo.trim() : null,
          terminalId: line.terminalId.trim() || null,
          externalTransactionId: line.externalTransactionId.trim() || null,
          bankPayerName: line.method === 'transfer' ? line.bankPayerName.trim() || null : null,
          transferConfirmNo: line.method === 'transfer' ? line.transferConfirmNo.trim() || null : null,
          cashReceiptIssued: line.cashReceiptIssued,
          cashReceiptType: line.cashReceiptIssued ? line.cashReceiptType : null,
          cashReceiptIdentifier: line.cashReceiptIssued ? line.cashReceiptIdentifier.trim() || null : null,
          memo: `${internalApprovalNo} / ${item.name}`,
        }));

      if (paymentLineRows.length > 0) {
        const { error: lineError } = await supabase.from('sale_payment_lines').insert(paymentLineRows);
        if (lineError) {
          toast.error(`상품별 결제 행 저장에 실패했습니다: ${lineError.message}`);
          return;
        }
      }

      const contractRegistered = await registerContractAndMembership();
      if (!contractRegistered) return;

      if (paymentAmount > 0) {
        const pointResult = await accruePoints(selectedMember.id, paymentAmount);
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
      toast.info(`${selectedMember.name}님 결제링크는 V2/후속 발송 준비 상태로 표시되었습니다.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCartItems([]);
    setSelectedMember(null);
    setMemberSearch('');
    setCollectionMode('receipt');
    setPaymentLines([]);
    setPaidAt(toDateTimeLocalValue());
    setInternalApprovalNo('');
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
            <p>CRM 내부 승인번호: {internalApprovalNo}</p>
            <p>결제수단: {paymentMethodSummary}</p>
            <p>상품별 결제금액 합계: {paymentAmount.toLocaleString()}원</p>
            <p>결제일시: {paidAt}</p>
            <hr className="my-2" />
            {cartPaymentLines.map(({ item, line, itemKey }) => (
              <div key={itemKey} className="space-y-1">
                <div className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{line.amount.toLocaleString()}원</span>
                </div>
                <p>{PAYMENT_METHOD_LABEL[line.method]}{line.method === 'card' ? ` / 승인번호 ${line.approvalNo}` : ''}{line.method === 'transfer' ? ` / ${line.bankPayerName} / ${line.transferConfirmNo}` : ''}</p>
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
        </div>

        <div className="w-full lg:w-[420px] space-y-lg">
          <div className="bg-surface rounded-xl border border-line shadow-card p-lg">
            <h3 className="text-[14px] font-bold text-content mb-md">수납 방식</h3>
            <div className="grid grid-cols-2 gap-md">
              {([
                { key: 'receipt', label: '영수증 등록', icon: <Upload size={22} strokeWidth={1.5} /> },
                { key: 'link', label: '결제링크 발송', icon: <Link2 size={22} strokeWidth={1.5} />, scope: 'V2/후속' },
              ] as { key: CollectionMode; label: string; icon: React.ReactNode; scope?: string }[]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setCollectionMode(opt.key)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-sm py-lg rounded-xl border-2 transition-all font-semibold text-[13px]',
                    opt.scope
                      ? collectionMode === opt.key
                        ? 'border-red-400 bg-red-50 text-red-700 shadow-sm'
                        : 'border-red-200 bg-red-50/50 text-red-600 hover:border-red-300 hover:bg-red-50'
                      : collectionMode === opt.key
                        ? 'border-primary bg-primary-light text-primary shadow-sm'
                        : 'border-line bg-surface text-content-secondary hover:border-primary/40 hover:bg-surface-secondary'
                  )}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                  {opt.scope && (
                    <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      {opt.scope}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {collectionMode === 'receipt' ? (
            <div className="bg-surface rounded-xl border border-line shadow-card p-lg space-y-lg">
              <div className="space-y-md">
                <label className="block">
                  <span className="block text-[12px] font-semibold text-content-secondary mb-xs">CRM 내부 승인번호</span>
                  <input
                    type="text"
                    value={internalApprovalNo}
                    readOnly
                    placeholder="상품 선택 후 자동 발급"
                    className="w-full px-md py-sm border border-line rounded-button text-[14px] bg-surface-secondary text-content-secondary focus:outline-none"
                  />
                </label>

                <div className="space-y-md">
                  <div className="flex items-center justify-between gap-md">
                    <h3 className="text-[14px] font-bold text-content">상품별 결제수단</h3>
                    <span className="text-[11px] font-semibold text-content-tertiary">상품 1개당 결제수단 1개</span>
                  </div>

                  {cartPaymentLines.length > 0 ? cartPaymentLines.map(({ item, itemKey, line }) => (
                    <div key={itemKey} className="rounded-xl border border-line bg-surface-secondary/30 p-md space-y-md">
                      <div className="flex items-start justify-between gap-md">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-content">{item.name}</p>
                          <p className="text-[11px] text-content-tertiary">
                            {item.category} · x{item.quantity} · 상품금액 {formatKRW(item.price * item.quantity)}
                          </p>
                        </div>
                        <StatusBadge variant="secondary">{PAYMENT_METHOD_LABEL[line.method]}</StatusBadge>
                      </div>

                      <div className="rounded-xl border border-line bg-surface p-md">
                        <div className="flex items-center justify-between gap-md">
                          <span className="text-[12px] font-semibold text-content-secondary">결제금액</span>
                          <span className="text-[18px] font-bold text-content tabular-nums">{formatKRW(line.amount)}</span>
                        </div>
                        <p className="mt-xs text-[11px] font-medium text-content-tertiary">
                          상품 행 금액은 고정입니다. 금액을 나누지 않고 결제수단만 선택합니다.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-sm">
                        {([
                          { key: 'card', label: '카드', icon: <CreditCard size={18} strokeWidth={1.5} /> },
                          { key: 'cash', label: '현금', icon: <Banknote size={18} strokeWidth={1.5} /> },
                          { key: 'transfer', label: '계좌이체', icon: <Banknote size={18} strokeWidth={1.5} /> },
                        ] as { key: PaymentMethod; label: string; icon: React.ReactNode }[]).map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => updatePaymentLine(itemKey, { method: opt.key })}
                            className={cn(
                              'flex min-h-[68px] flex-col items-center justify-center gap-xs rounded-xl border-2 px-2 text-[12px] font-semibold transition-all',
                              line.method === opt.key
                                ? 'border-primary bg-primary-light text-primary shadow-sm'
                                : 'border-line bg-surface text-content-secondary hover:border-primary/40 hover:bg-surface-secondary'
                            )}
                          >
                            {opt.icon}
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {line.method === 'card' && (
                        <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
                          <label className="block">
                            <span className="block text-[12px] font-semibold text-content-secondary mb-xs">카드 승인번호</span>
                            <input
                              type="text"
                              value={line.approvalNo}
                              onChange={e => updatePaymentLine(itemKey, { approvalNo: e.target.value })}
                              className="w-full px-md py-sm border border-line rounded-button text-[14px] bg-surface focus:border-primary focus:outline-none"
                              placeholder="승인번호"
                            />
                          </label>
                          <label className="block">
                            <span className="block text-[12px] font-semibold text-content-secondary mb-xs">단말 ID</span>
                            <input
                              type="text"
                              value={line.terminalId}
                              onChange={e => updatePaymentLine(itemKey, { terminalId: e.target.value })}
                              className="w-full px-md py-sm border border-line rounded-button text-[14px] bg-surface focus:border-primary focus:outline-none"
                              placeholder="선택"
                            />
                          </label>
                          <label className="block">
                            <span className="block text-[12px] font-semibold text-content-secondary mb-xs">외부 거래번호</span>
                            <input
                              type="text"
                              value={line.externalTransactionId}
                              onChange={e => updatePaymentLine(itemKey, { externalTransactionId: e.target.value })}
                              className="w-full px-md py-sm border border-line rounded-button text-[14px] bg-surface focus:border-primary focus:outline-none"
                              placeholder="선택"
                            />
                          </label>
                        </div>
                      )}

                      {line.method === 'transfer' && (
                        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                          <label className="block">
                            <span className="block text-[12px] font-semibold text-content-secondary mb-xs">계좌이체 입금자명</span>
                            <input
                              type="text"
                              value={line.bankPayerName}
                              onChange={e => updatePaymentLine(itemKey, { bankPayerName: e.target.value })}
                              className="w-full px-md py-sm border border-line rounded-button text-[14px] bg-surface focus:border-primary focus:outline-none"
                              placeholder="실제 입금자명"
                            />
                          </label>
                          <label className="block">
                            <span className="block text-[12px] font-semibold text-content-secondary mb-xs">이체확인번호</span>
                            <input
                              type="text"
                              value={line.transferConfirmNo}
                              onChange={e => updatePaymentLine(itemKey, { transferConfirmNo: e.target.value })}
                              className="w-full px-md py-sm border border-line rounded-button text-[14px] bg-surface focus:border-primary focus:outline-none"
                              placeholder="이체확인번호"
                            />
                          </label>
                        </div>
                      )}

                      {(line.method === 'cash' || line.method === 'transfer') && (
                        <div className="rounded-xl border border-line bg-surface p-md space-y-md">
                          <label className="flex items-center justify-between gap-md">
                            <span className="text-[12px] font-semibold text-content-secondary">현금영수증 처리</span>
                            <button
                              type="button"
                              onClick={() => updatePaymentLine(itemKey, { cashReceiptIssued: !line.cashReceiptIssued })}
                              className={cn(
                                'rounded-full px-3 py-1 text-[12px] font-bold transition-colors',
                                line.cashReceiptIssued ? 'bg-primary text-white' : 'bg-surface border border-line text-content-secondary'
                              )}
                            >
                              {line.cashReceiptIssued ? '처리' : '미처리'}
                            </button>
                          </label>
                          {line.cashReceiptIssued && (
                            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                              <label className="block">
                                <span className="block text-[12px] font-semibold text-content-secondary mb-xs">발행 유형</span>
                                <select
                                  value={line.cashReceiptType}
                                  onChange={e => updatePaymentLine(itemKey, { cashReceiptType: e.target.value as CashReceiptType })}
                                  className="w-full px-md py-sm border border-line rounded-button text-[14px] bg-surface focus:border-primary focus:outline-none"
                                >
                                  <option value="income">소득공제</option>
                                  <option value="expense">지출증빙</option>
                                </select>
                              </label>
                              <label className="block">
                                <span className="block text-[12px] font-semibold text-content-secondary mb-xs">식별번호</span>
                                <input
                                  type="text"
                                  value={line.cashReceiptIdentifier}
                                  onChange={e => updatePaymentLine(itemKey, { cashReceiptIdentifier: e.target.value })}
                                  className="w-full px-md py-sm border border-line rounded-button text-[14px] bg-surface focus:border-primary focus:outline-none"
                                  placeholder="휴대폰/사업자번호"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="rounded-xl border border-line bg-surface-secondary p-md text-center text-[12px] text-content-tertiary">
                      결제 상품을 먼저 담아주세요.
                    </div>
                  )}
                </div>

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

              <div className={cn(
                'rounded-xl border p-md text-[12px] font-semibold',
                amountDiff === 0 ? 'border-state-success/30 bg-state-success/10 text-state-success' : 'border-state-error/30 bg-state-error/10 text-state-error'
              )}>
                <div className="flex justify-between">
                  <span>상품별 결제금액 합계</span>
                  <span>{formatKRW(paymentAmount)}</span>
                </div>
                <div className="flex justify-between mt-xs">
                  <span>장바구니 합계</span>
                  <span>{formatKRW(subtotal)}</span>
                </div>
                <div className="flex justify-between mt-xs pt-xs border-t border-current/20">
                  <span>검증</span>
                  <span>{amountDiff === 0 ? '금액 일치' : `${formatNumber(Math.abs(amountDiff))}원 ${amountDiff > 0 ? '부족' : '초과'}`}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 rounded-xl border border-red-200 shadow-card p-lg space-y-md">
              <div className="flex items-center justify-between gap-md">
                <h3 className="text-[14px] font-bold text-red-800">결제링크 발송</h3>
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                  V2/후속
                </span>
              </div>
              <p className="rounded-xl border border-red-200 bg-white/70 p-md text-[12px] font-medium leading-relaxed text-red-700">
                PG 결제링크, webhook 자동 반영, 자동 만료 알림은 V1 확정 범위가 아닙니다. 현재 화면에서는 퍼블리싱 비교와 발송 준비 상태만 표시합니다.
              </p>
              <div className="rounded-xl border border-red-200 bg-white p-md space-y-xs">
                <div className="flex justify-between text-[13px]">
                  <span className="text-red-700/80">발송 대상</span>
                  <span className="font-semibold text-red-950">{selectedMember ? `${selectedMember.name} (${selectedMember.phone})` : '회원 미선택'}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-red-700/80">고정 금액</span>
                  <span className="font-bold text-red-700">{formatKRW(subtotal)}</span>
                </div>
              </div>
              {linkSent && (
                <div className="rounded-xl border border-red-200 bg-white p-md text-[12px] font-semibold text-red-700">
                  V2/후속 결제링크 발송 준비 상태로 표시되었습니다.
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
                isValid && !isProcessing && collectionMode === 'link'
                  ? 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] shadow-red-600/20'
                  : isValid && !isProcessing
                  ? 'bg-primary text-surface hover:bg-primary-dark active:scale-[0.98] shadow-primary/20'
                  : 'bg-surface-tertiary text-content-tertiary cursor-not-allowed'
              )}
            >
              {collectionMode === 'link' ? <Link2 size={18} /> : <Upload size={18} />}
              {collectionMode === 'link' ? 'V2/후속 결제링크 표시' : '결제 완료 등록'}
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
                {cartPaymentLines.map(({ item, line, itemKey }) => (
                  <div key={itemKey} className="space-y-1 text-[13px]">
                    <div className="flex justify-between gap-md">
                      <span className="text-content-secondary">{item.name} x{item.quantity}</span>
                      <span className="font-semibold text-content tabular-nums">{formatKRW(line.amount)}</span>
                    </div>
                    <div className="flex justify-between gap-md text-[11px] text-content-tertiary">
                      <span>{PAYMENT_METHOD_LABEL[line.method]}</span>
                      <span className="text-right">
                        {line.method === 'card' && `승인번호 ${line.approvalNo}`}
                        {line.method === 'transfer' && `${line.bankPayerName} / ${line.transferConfirmNo}`}
                        {line.method === 'cash' && (line.cashReceiptIssued ? '현금영수증 처리' : '현금영수증 미처리')}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="pt-sm border-t border-line flex justify-between">
                  <span className="text-[14px] font-bold text-content">장바구니 합계</span>
                  <span className="text-[16px] font-bold text-primary tabular-nums">{formatKRW(subtotal)}</span>
                </div>
              </div>

              {[
                ['회원', selectedMember?.name ?? '-'],
                ['CRM 내부 승인번호', internalApprovalNo || '-'],
                ['결제수단', paymentMethodSummary],
                ['상품별 결제금액 합계', formatKRW(paymentAmount)],
                ['결제일시', paidAt ? paidAt.replace('T', ' ') : '-'],
                ['영수증 파일', receiptFile?.name ?? '-'],
              ].map(([label, value]) => (
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
