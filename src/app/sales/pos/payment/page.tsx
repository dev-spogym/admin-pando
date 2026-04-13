import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  X,
  CreditCard,
  Banknote,
  Wallet,
  ArrowRightLeft,
  CheckCircle2,
  Printer,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { moveToPage } from '@/internal';
import { supabase } from '@/lib/supabase';
import { checkDuplicatePayment, deductPoints, accruePoints } from '@/lib/businessLogic';

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

type PaymentMethod = 'card' | 'cash' | 'mileage' | 'mixed';

interface MixedAmount {
  card: number;
  cash: number;
  mileage: number;
}

interface CartItem {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
}

interface Member {
  id: number;
  name: string;
  phone: string;
  mileage: number;
}

export default function PosPayment() {
  // 장바구니 (sessionStorage에서 복원)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem('posCart');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CartItem[];
        setCartItems(parsed);
        sessionStorage.removeItem('posCart');
      } catch {
        // 파싱 실패 시 무시
      }
    }
  }, []);

  // 회원 검색
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberResults, setMemberResults] = useState<Member[]>([]);

  // 결제수단
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // 복합결제 금액 분배
  const [mixedAmount, setMixedAmount] = useState<MixedAmount>({ card: 0, cash: 0, mileage: 0 });

  // 확인 모달 / 완료 상태
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 중복 결제 경고 다이얼로그
  const [showDupConfirm, setShowDupConfirm] = useState(false);
  const [dupMessage, setDupMessage] = useState('');

  // 회원 검색 (supabase)
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
          mileage: (m.mileage as number) ?? 0,
        }))
      );
    }
  };

  // 금액 계산
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 결제 검증
  const isValid = useMemo(() => {
    if (cartItems.length === 0) return false;
    if (paymentMethod === 'mileage') {
      if (!selectedMember) return false;
      if (selectedMember.mileage < subtotal) return false;
    }
    if (paymentMethod === 'mixed') {
      const total = mixedAmount.card + mixedAmount.cash + mixedAmount.mileage;
      if (total !== subtotal) return false;
      if (mixedAmount.mileage > 0 && !selectedMember) return false;
    }
    return true;
  }, [cartItems, paymentMethod, selectedMember, mixedAmount, subtotal]);

  // 중복 결제 확인 후 실제 결제 처리
  const executePayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 결제수단 → DB enum 매핑 (CARD, CASH, TRANSFER, MILEAGE)
      const paymentMethodMap: Record<PaymentMethod, string> = {
        card: 'CARD',
        cash: 'CASH',
        mileage: 'MILEAGE',
        mixed: 'CARD', // 복합결제는 CARD로 저장 (memo에 상세 기록)
      };

      // 복합결제 메모 생성
      const mixedMemo =
        paymentMethod === 'mixed'
          ? `복합결제 - 카드: ${mixedAmount.card.toLocaleString()}원, 현금: ${mixedAmount.cash.toLocaleString()}원, 마일리지: ${mixedAmount.mileage.toLocaleString()}P`
          : null;

      // 마일리지 결제 시 차감
      if (selectedMember && (paymentMethod === 'mileage' || (paymentMethod === 'mixed' && mixedAmount.mileage > 0))) {
        const mileageToDeduct = paymentMethod === 'mileage' ? subtotal : mixedAmount.mileage;
        const deductResult = await deductPoints(selectedMember.id, mileageToDeduct);
        if (!deductResult.success) {
          toast.error(deductResult.message ?? '마일리지 차감에 실패했습니다.');
          return;
        }
      }

      const { error } = await supabase.from('sales').insert({
        branchId: getBranchId(),
        memberId: selectedMember?.id ?? null,
        memberName: selectedMember?.name ?? '비회원',
        type: 'POS',
        productName: cartItems.map(i => i.name).join(', '),
        amount: subtotal,
        salePrice: subtotal,
        originalPrice: subtotal,
        paymentMethod: paymentMethodMap[paymentMethod],
        card: paymentMethod === 'card' ? subtotal : (paymentMethod === 'mixed' ? mixedAmount.card : 0),
        cash: paymentMethod === 'cash' ? subtotal : (paymentMethod === 'mixed' ? mixedAmount.cash : 0),
        saleDate: new Date().toISOString(),
        status: 'COMPLETED',
        memo: mixedMemo,
      });

      if (error) {
        toast.error('결제 저장에 실패했습니다.');
        return;
      }

      // 마일리지 자동 적립 (마일리지 결제 제외, 결제금액의 1%)
      if (selectedMember && paymentMethod !== 'mileage') {
        const pointResult = await accruePoints(selectedMember.id, subtotal);
        if (pointResult.success && pointResult.accrued > 0) {
          toast.info(`${pointResult.accrued}P 마일리지가 적립되었습니다.`);
        }
      }

      setShowConfirmModal(false);
      setIsComplete(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentConfirm = async () => {
    // 중복 결제 확인
    if (selectedMember) {
      const dupCheck = await checkDuplicatePayment(selectedMember.id, subtotal);
      if (dupCheck.isDuplicate) {
        setDupMessage(dupCheck.message ?? '최근에 동일한 결제가 있습니다.');
        setShowDupConfirm(true);
        return;
      }
    }
    await executePayment();
  };

  const handleReset = () => {
    setSelectedMember(null);
    setMemberSearch('');
    setPaymentMethod('card');
    setMixedAmount({ card: 0, cash: 0, mileage: 0 });
    setIsComplete(false);
    setShowConfirmModal(false);
  };

  // 복합결제 금액 자동 분배 (카드에 나머지 할당)
  const handleMixedChange = (field: keyof MixedAmount, val: number) => {
    setMixedAmount(prev => ({ ...prev, [field]: Math.max(0, val) }));
  };

  const mixedTotal = mixedAmount.card + mixedAmount.cash + mixedAmount.mileage;
  const mixedDiff = subtotal - mixedTotal;

  // --- 결제 완료 화면 ---
  if (isComplete) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-surface rounded-xl border border-line shadow-card p-xxl animate-in fade-in zoom-in duration-400">
          <div className="w-20 h-20 bg-accent-light rounded-full flex items-center justify-center text-accent mb-xl">
            <CheckCircle2 size={44} strokeWidth={1.5} />
          </div>
          <h2 className="text-[24px] font-bold text-content mb-sm">결제가 완료되었습니다</h2>
          <p className="text-[14px] text-content-secondary mb-xl text-center leading-relaxed">
            {selectedMember ? `${selectedMember.name} 회원님의 ` : ''}결제가 정상적으로 처리되었습니다.
          </p>

          <div className="grid grid-cols-2 gap-md w-full max-w-sm mb-xl">
            <button
              onClick={() => toast.info('영수증 출력을 시작합니다.')}
              className="flex flex-col items-center justify-center p-lg rounded-xl border border-line bg-surface hover:bg-surface-tertiary transition-all gap-sm"
            >
              <Printer className="text-primary" size={28} strokeWidth={1.5} />
              <span className="text-[13px] font-semibold text-content-secondary">영수증 출력</span>
            </button>
            <button
              onClick={() => toast.info('문자 영수증을 발송합니다.')}
              className="flex flex-col items-center justify-center p-lg rounded-xl border border-line bg-surface hover:bg-surface-tertiary transition-all gap-sm"
            >
              <ChevronRight className="text-accent" size={28} strokeWidth={1.5} />
              <span className="text-[13px] font-semibold text-content-secondary">문자 발송</span>
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
        description="상품 내역을 확인하고 결제수단을 선택하여 결제를 완료합니다."
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
        {/* 좌측: 상품 요약 + 회원 검색 */}
        <div className="flex-1 space-y-lg">

          {/* UI-049 결제 요약 */}
          <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
            <div className="px-lg py-md border-b border-line bg-surface-secondary/40">
              <h3 className="text-[14px] font-bold text-content flex items-center gap-sm">
                <ShoppingCart className="text-primary" size={16} />
                결제 상품 목록
              </h3>
            </div>
            <div className="divide-y divide-line">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center justify-between px-lg py-md">
                  <div className="flex items-center gap-md">
                    <StatusBadge variant="secondary">{item.category}</StatusBadge>
                    <span className="text-[14px] font-medium text-content">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-lg">
                    <span className="text-[13px] text-content-tertiary">x{item.quantity}</span>
                    <span className="text-[15px] font-semibold text-content tabular-nums">
                      ₩{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-lg py-md bg-surface-secondary/30 border-t border-line flex justify-between items-center">
              <span className="text-[13px] text-content-secondary font-medium">총 결제 금액</span>
              <span className="text-[22px] font-bold text-primary tabular-nums">
                ₩{subtotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* UI-051 회원 검색 */}
          <div className="bg-surface rounded-xl border border-line shadow-card p-lg">
            <h3 className="text-[14px] font-bold text-content mb-md">
              회원 검색 <span className="text-[12px] font-normal text-content-tertiary ml-xs">(마일리지 사용 시 필수)</span>
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
                      마일리지: {selectedMember.mileage.toLocaleString()} P
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
                        onClick={() => { setSelectedMember(m); setMemberSearch(m.name); }}
                        className="w-full flex items-center justify-between px-lg py-md hover:bg-surface-secondary transition-colors border-b border-line last:border-0"
                      >
                        <div className="text-left">
                          <p className="text-[14px] font-semibold text-content">{m.name}</p>
                          <p className="text-[12px] text-content-tertiary">{m.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-content-tertiary">보유 마일리지</p>
                          <p className="text-[13px] font-bold text-accent tabular-nums">{m.mileage.toLocaleString()} P</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 결제수단 선택 + 결제 버튼 */}
        <div className="w-full lg:w-[380px] space-y-lg">

          {/* UI-050 결제수단 선택 */}
          <div className="bg-surface rounded-xl border border-line shadow-card p-lg">
            <h3 className="text-[14px] font-bold text-content mb-md">결제수단 선택</h3>

            <div className="grid grid-cols-2 gap-md">
              {(
                [
                  { key: 'card', label: '카드', icon: <CreditCard size={22} strokeWidth={1.5} /> },
                  { key: 'cash', label: '현금', icon: <Banknote size={22} strokeWidth={1.5} /> },
                  { key: 'mileage', label: '마일리지', icon: <Wallet size={22} strokeWidth={1.5} /> },
                  { key: 'mixed', label: '복합결제', icon: <ArrowRightLeft size={22} strokeWidth={1.5} /> },
                ] as { key: PaymentMethod; label: string; icon: React.ReactNode }[]
              ).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setPaymentMethod(opt.key)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-sm py-lg rounded-xl border-2 transition-all font-semibold text-[13px]',
                    paymentMethod === opt.key
                      ? 'border-primary bg-primary-light text-primary shadow-sm'
                      : 'border-line bg-surface text-content-secondary hover:border-primary/40 hover:bg-surface-secondary'
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 복합결제 금액 분배 */}
            {paymentMethod === 'mixed' && (
              <div className="mt-lg space-y-md p-md bg-surface-secondary rounded-xl border border-line">
                <p className="text-[12px] font-semibold text-content-secondary">결제수단별 금액 입력</p>
                {(
                  [
                    { key: 'card', label: '카드', icon: <CreditCard size={14} /> },
                    { key: 'cash', label: '현금', icon: <Banknote size={14} /> },
                    { key: 'mileage', label: '마일리지', icon: <Wallet size={14} />, disabled: !selectedMember },
                  ] as { key: keyof MixedAmount; label: string; icon: React.ReactNode; disabled?: boolean }[]
                ).map(field => (
                  <div key={field.key} className="flex items-center gap-sm">
                    <div className="flex items-center gap-xs text-content-tertiary w-[70px] text-[12px]">
                      {field.icon}
                      {field.label}
                    </div>
                    <input
                      type="number"
                      min={0}
                      disabled={field.disabled}
                      value={mixedAmount[field.key] || ''}
                      onChange={e => handleMixedChange(field.key, Number(e.target.value))}
                      placeholder="0"
                      className="flex-1 px-sm py-xs border border-line rounded-button text-[13px] text-right tabular-nums bg-surface focus:border-primary focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    <span className="text-[12px] text-content-tertiary">원</span>
                  </div>
                ))}
                <div className={cn(
                  'flex justify-between items-center pt-sm border-t border-line text-[12px] font-semibold',
                  mixedDiff === 0 ? 'text-state-success' : 'text-state-error'
                )}>
                  <span>합계 {mixedTotal.toLocaleString()}원</span>
                  <span>{mixedDiff === 0 ? '금액 일치' : `${Math.abs(mixedDiff).toLocaleString()}원 ${mixedDiff > 0 ? '부족' : '초과'}`}</span>
                </div>
              </div>
            )}

            {/* 마일리지 결제 안내 */}
            {paymentMethod === 'mileage' && (
              <div className="mt-md p-md bg-surface-secondary rounded-xl border border-line">
                {selectedMember ? (
                  <div className="space-y-xs">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-content-secondary">보유 마일리지</span>
                      <span className="font-bold text-accent tabular-nums">{selectedMember.mileage.toLocaleString()} P</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-content-secondary">결제 금액</span>
                      <span className="font-bold text-content tabular-nums">₩{subtotal.toLocaleString()}</span>
                    </div>
                    {selectedMember.mileage < subtotal && (
                      <p className="text-[12px] text-state-error font-semibold mt-xs">
                        마일리지가 부족합니다. (부족: {(subtotal - selectedMember.mileage).toLocaleString()}P)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] text-content-tertiary">마일리지 결제는 회원 검색 후 이용 가능합니다.</p>
                )}
              </div>
            )}
          </div>

          {/* UI-052 결제 확인 버튼 */}
          <div className="bg-surface rounded-xl border border-line shadow-card p-lg space-y-md">
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-content-secondary">최종 결제 금액</span>
              <span className="text-[24px] font-bold text-primary tabular-nums">
                ₩{subtotal.toLocaleString()}
              </span>
            </div>

            <button
              disabled={!isValid}
              onClick={() => setShowConfirmModal(true)}
              className={cn(
                'w-full py-md rounded-button text-[15px] font-bold transition-all flex items-center justify-center gap-sm shadow-md',
                isValid
                  ? 'bg-primary text-surface hover:bg-primary-dark active:scale-[0.98] shadow-primary/20'
                  : 'bg-surface-tertiary text-content-tertiary cursor-not-allowed'
              )}
            >
              <CreditCard size={18} />
              결제 확인
            </button>

            <button
              onClick={() => moveToPage(982)}
              className="w-full py-sm rounded-button border border-line text-[13px] text-content-secondary font-medium hover:bg-surface-secondary transition-colors"
            >
              이전으로 돌아가기
            </button>
          </div>
        </div>
      </div>

      {/* 중복 결제 경고 다이얼로그 */}
      <ConfirmDialog
        open={showDupConfirm}
        title="중복 결제 경고"
        description={dupMessage + '\n\n계속 진행하시겠습니까?'}
        confirmLabel="계속 진행"
        cancelLabel="취소"
        variant="danger"
        onConfirm={() => {
          setShowDupConfirm(false);
          void executePayment();
        }}
        onCancel={() => setShowDupConfirm(false)}
      />

      {/* UI-052 결제 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md">
          <div className="w-full max-w-md bg-surface rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-xl py-lg border-b border-line flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-content">결제 확인</h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-content-tertiary hover:text-content transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-xl space-y-md">
              {/* 요약 */}
              <div className="bg-surface-secondary rounded-xl p-md space-y-sm">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-[13px]">
                    <span className="text-content-secondary">{item.name} x{item.quantity}</span>
                    <span className="font-semibold text-content tabular-nums">₩{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-sm border-t border-line flex justify-between">
                  <span className="text-[14px] font-bold text-content">합계</span>
                  <span className="text-[16px] font-bold text-primary tabular-nums">₩{subtotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between text-[13px]">
                <span className="text-content-secondary">결제수단</span>
                <span className="font-semibold text-content">
                  {{ card: '카드', cash: '현금', mileage: '마일리지', mixed: '복합결제' }[paymentMethod]}
                </span>
              </div>
              {selectedMember && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-content-secondary">회원</span>
                  <span className="font-semibold text-content">{selectedMember.name}</span>
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
                {isProcessing ? "처리 중..." : "결제 완료"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
