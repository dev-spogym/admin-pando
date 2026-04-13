'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  User,
  Search,
  CheckCircle2,
  CreditCard,
  FileText,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Info,
  AlertCircle,
  Banknote,
  Coins,
  ArrowRightLeft
} from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/common/DataTable";
import FormSection from "@/components/common/FormSection";
import StatusBadge from "@/components/common/StatusBadge";
import TabNav from "@/components/common/TabNav";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SignaturePad from "@/components/common/SignaturePad";
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { updateMembershipPeriod, accruePoints, checkDuplicatePayment } from '@/lib/businessLogic';
import { uploadFile } from '@/lib/uploadFile';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

type MemberRow = { id: number; name: string; phone: string; status: string; membership: string };
type ProductRow = { id: string; name: string; price: number; duration: number };

const DISCOUNT_TYPES = [
  { value: 'renew', label: '재등록' },
  { value: 'new', label: '신규' },
  { value: 'event', label: '이벤트' },
  { value: 'admin', label: '관리자 재량' },
];

const PAYMENT_METHODS = [
  { id: 'card', label: '카드', icon: CreditCard },
  { id: 'cash', label: '현금', icon: Banknote },
  { id: 'mileage', label: '마일리지', icon: Coins },
  { id: 'transfer', label: '계좌이체', icon: ArrowRightLeft },
];

const STEPS = [
  { id: 1, name: '회원 선택' },
  { id: 2, name: '상품 선택' },
  { id: 3, name: '기간/금액' },
  { id: 4, name: '결제' },
  { id: 5, name: '확인' },
];

export default function ContractWizard() {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [dupConfirm, setDupConfirm] = useState<{ open: boolean; message: string; onConfirm: () => void }>({
    open: false,
    message: '',
    onConfirm: () => {},
  });
  const [selectedMember, setSelectedMember] = useState<any>(null);
  // UX-12: 회원 선택 후 "다음 단계" 버튼 영역으로 자동 스크롤하기 위한 ref
  const selectedMemberInfoRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('facility');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [products, setProducts] = useState<Record<string, ProductRow[]>>({ facility: [], pt: [], gx: [], option: [] });
  const [staffs, setStaffs] = useState<{ id: number; name: string }[]>([]);
  const [salesStaffId, setSalesStaffId] = useState<number | ''>('');
  const [salesStaffName, setSalesStaffName] = useState<string>('');

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, phone, status, membershipType')
        .eq('branchId', getBranchId());
      if (!error && data) {
        setMembers(data.map((m: Record<string, unknown>) => ({
          id: m.id as number,
          name: m.name as string,
          phone: m.phone as string,
          status: (m.status as string) ?? 'active',
          membership: (m.membershipType as string) ?? '',
        })));
      }
    };

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, duration, category')
        .eq('branchId', getBranchId());
      if (!error && data) {
        const grouped: Record<string, ProductRow[]> = { facility: [], pt: [], gx: [], option: [] };

        // DB category 값 → 탭 키 매핑
        // DB: "MEMBERSHIP" → 탭: "facility" (시설이용)
        // DB: "PT"         → 탭: "pt"       (1:1수업)
        // DB: "GX"         → 탭: "gx"       (그룹수업)
        // DB: 그 외        → 탭: "option"   (옵션)
        const categoryToTab: Record<string, string> = {
          MEMBERSHIP: 'facility',
          PT: 'pt',
          GX: 'gx',
        };

        data.forEach((p: Record<string, unknown>) => {
          const dbCat = ((p.category as string) ?? '').toUpperCase();
          // 매핑된 탭 키가 없으면 "option"으로 분류
          const tabKey = categoryToTab[dbCat] ?? 'option';
          grouped[tabKey].push({
            id: String(p.id),
            name: p.name as string,
            price: Number(p.price ?? 0),
            duration: Number(p.duration ?? 0),
          });
        });
        setProducts(grouped);
      }
    };

    const fetchStaffs = async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name')
        .eq('branchId', getBranchId());
      if (!error && data) {
        setStaffs(data.map((s: Record<string, unknown>) => ({
          id: s.id as number,
          name: s.name as string,
        })));
      }
    };

    fetchMembers();
    fetchProducts();
    fetchStaffs();
  }, []);

  const [contractDetails, setContractDetails] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    serviceDays: 0,
    memo: ''
  });

  const [discountType, setDiscountType] = useState('');
  const [discountRate, setDiscountRate] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [discountError, setDiscountError] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({ card: 0, cash: 0, mileage: 0, transfer: 0 });
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set(['card']));
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [customerSignatureDataUrl, setCustomerSignatureDataUrl] = useState<string | null>(null);
  const [managerSignatureDataUrl, setManagerSignatureDataUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState('');

  const totalPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);
  const discountRateNum = Math.min(50, Math.max(0, parseFloat(discountRate) || 0));
  const discountAmount = Math.round(totalPrice * (discountRateNum / 100));
  const finalPrice = totalPrice - discountAmount;

  // 계약 종료일 자동 계산
  const computedEndDate = useMemo(() => {
    if (!contractDetails.startDate || selectedProducts.length === 0) return '';
    const maxDuration = Math.max(...selectedProducts.map(p => p.duration));
    const start = new Date(contractDetails.startDate);
    start.setDate(start.getDate() + maxDuration + (contractDetails.serviceDays || 0));
    return start.toISOString().split('T')[0];
  }, [contractDetails.startDate, contractDetails.serviceDays, selectedProducts]);

  const handleDiscountRateChange = (value: string) => {
    const num = parseFloat(value) || 0;
    if (num > 50) setDiscountError('최대 할인율은 50%입니다.');
    else if (num < 0) setDiscountError('할인율은 0% 이상이어야 합니다.');
    else setDiscountError('');
    setDiscountRate(value);
  };

  const clearStepError = (s: number) =>
    setStepErrors(prev => { const n = { ...prev }; delete n[s]; return n; });

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1 && !selectedMember) {
      setStepErrors(prev => ({ ...prev, 1: '계약 대상 회원을 선택해주세요.' }));
      return false;
    }
    if (currentStep === 2 && selectedProducts.length === 0) {
      setStepErrors(prev => ({ ...prev, 2: '최소 한 개의 상품을 선택해주세요.' }));
      return false;
    }
    if (currentStep === 3 && !contractDetails.startDate) {
      setStepErrors(prev => ({ ...prev, 3: '계약 시작일을 입력해주세요.' }));
      return false;
    }
    clearStepError(currentStep);
    return true;
  };

  const nextStep = () => { if (validateStep(step) && step < 5) setStep(step + 1); };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  // dataUrl → Blob → File 변환 후 Supabase Storage 업로드
  const uploadSignature = async (dataUrl: string, contractId: number, type: 'customer' | 'manager'): Promise<string | null> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const timestamp = Date.now();
    const fileName = `${contractId}_${type}_${timestamp}.png`;
    const path = `contracts/${getBranchId()}/${fileName}`;
    const file = new File([blob], fileName, { type: 'image/png' });
    const result = await uploadFile('contracts', path, file);
    if ('error' in result) {
      toast.error(`서명 이미지 업로드 실패: ${result.error}`);
      return null;
    }
    return result.url;
  };

  // contracts 테이블에 계약 정보 저장
  const handleContractSave = async () => {
    if (!selectedMember) {
      toast.error('회원을 선택해주세요.');
      return;
    }

    // 서명 유효성 검사
    if (!customerSignatureDataUrl || !managerSignatureDataUrl) {
      setSignatureError('고객 서명과 센터장 서명을 모두 완료해주세요.');
      return;
    }

    // 중복 저장 방지
    if (isSaving) return;
    setIsSaving(true);
    setSignatureError('');

    // 중복 결제 확인 (INSERT 전에 먼저 체크)
    const dupCheck = await checkDuplicatePayment(selectedMember.id, finalPrice);
    if (dupCheck.isDuplicate) {
      setIsSaving(false);
      setDupConfirm({
        open: true,
        message: dupCheck.message ?? '',
        onConfirm: () => {
          setDupConfirm(prev => ({ ...prev, open: false }));
          void doInsert();
        },
      });
      return;
    }

    setIsSaving(false);
    await doInsert();
  };

  // 실제 INSERT + 후처리 로직 (중복 확인 후 호출)
  const doInsert = async () => {
    if (!selectedMember) return;
    setIsSaving(true);

    const paymentMethodMap: Record<string, string> = {
      card: 'CARD',
      cash: 'CASH',
      mileage: 'MILEAGE',
      transfer: 'TRANSFER',
    };

    const productName = selectedProducts.map((p: { name: string }) => p.name).join(', ');
    const tempContractId = Date.now();

    // 서명 이미지 Storage 업로드
    const [customerSigUrl, managerSigUrl] = await Promise.all([
      uploadSignature(customerSignatureDataUrl ?? '', tempContractId, 'customer'),
      uploadSignature(managerSignatureDataUrl ?? '', tempContractId, 'manager'),
    ]);

    if (!customerSigUrl || !managerSigUrl) {
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from('contracts').insert({
      branchId: getBranchId(),
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      productName: productName || null,
      amount: finalPrice,
      startDate: contractDetails.startDate ? new Date(contractDetails.startDate).toISOString() : null,
      endDate: computedEndDate ? new Date(computedEndDate).toISOString() : null,
      signatureUrl: customerSigUrl,
      managerSignatureUrl: managerSigUrl,
      signedAt: new Date().toISOString(),
      status: '서명완료',
      createdAt: new Date().toISOString(),
    });

    if (error) {
      toast.error('계약 저장에 실패했습니다.');
      setIsSaving(false);
      return;
    }

    // 계약에 대응하는 매출 레코드도 함께 저장
    await supabase.from('sales').insert({
      branchId: getBranchId(),
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      productName: productName || null,
      type: '이용권',
      amount: finalPrice,
      originalPrice: totalPrice,
      discountPrice: discountAmount,
      paymentMethod: Array.from(selectedMethods).map(id => paymentMethodMap[id] ?? id.toUpperCase()).join('+') || 'CARD',
      saleDate: new Date().toISOString(),
      status: 'COMPLETED',
      memo: discountReason || null,
      staffId: salesStaffId !== '' ? salesStaffId : null,
      staffName: salesStaffName || null,
    });

    // 결제 후 이용권 시작/종료일 자동 설정 + 회원 상태 ACTIVE로 변경
    if (contractDetails.startDate && computedEndDate) {
      await updateMembershipPeriod(
        selectedMember.id,
        new Date(contractDetails.startDate).toISOString(),
        new Date(computedEndDate).toISOString(),
        productName || undefined,
      );
    }

    // 마일리지 자동 적립 (결제금액의 1%)
    if (!selectedMethods.has('mileage') || selectedMethods.size > 1) {
      const pointResult = await accruePoints(selectedMember.id, finalPrice);
      if (pointResult.success && pointResult.accrued > 0) {
        toast.info(`${pointResult.accrued}P 마일리지가 적립되었습니다.`);
      }
    }

    toast.success('계약이 완료되었습니다.');
    moveToPage(985, { id: selectedMember.id });
    setIsSaving(false);
  };

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    return members.filter(m => m.name.includes(searchQuery) || m.phone.includes(searchQuery));
  }, [searchQuery, members]);

  // ── Step 1: 회원 선택 ──
  const renderStep1 = () => (
    <div className="space-y-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center">
        <h2 className="text-Heading-2 text-content">회원 조회</h2>
        <button
          className="text-Label text-primary font-bold flex items-center gap-xs hover:underline"
          onClick={() => moveToPage(986)}
        >
          <Plus size={16} /> 신규 회원 등록
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={18} />
        <input
          className="w-full pl-[44px] pr-md py-md bg-surface-secondary rounded-input outline-none focus:ring-2 focus:ring-accent transition-all"
          type="text"
          placeholder="이름 또는 전화번호로 검색"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {stepErrors[1] && (
        <div className="flex items-center gap-sm text-state-error text-Body-2 bg-state-error/5 border border-state-error/20 rounded-xl px-md py-sm">
          <AlertCircle size={16} /> {stepErrors[1]}
        </div>
      )}

      <DataTable
        columns={[
          { key: 'name', header: '이름', width: 120 },
          { key: 'phone', header: '연락처', width: 160 },
          {
            key: 'status', header: '상태', width: 100,
            render: v => {
              // 실제 회원 status 값(ACTIVE/EXPIRED/HOLDING/INACTIVE/SUSPENDED)에 따라 배지 표시
              const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
                ACTIVE:    { label: '활성',   variant: 'success' },
                active:    { label: '활성',   variant: 'success' },
                EXPIRED:   { label: '만료',   variant: 'error' },
                expired:   { label: '만료',   variant: 'error' },
                HOLDING:   { label: '홀딩',   variant: 'warning' },
                hold:      { label: '홀딩',   variant: 'warning' },
                INACTIVE:  { label: '미등록', variant: 'default' },
                SUSPENDED: { label: '정지',   variant: 'warning' },
              };
              const info = statusMap[String(v)] ?? { label: String(v), variant: 'default' as const };
              return <StatusBadge variant={info.variant} label={info.label} />;
            }
          },
          { key: 'membership', header: '보유 상품' },
          {
            key: 'action', header: '', width: 100, align: 'right',
            render: (_, row) => (
              <button
                onClick={() => {
                  setSelectedMember(row);
                  clearStepError(1);
                  // UX-12: 선택 후 확인 메시지 영역으로 부드럽게 스크롤
                  setTimeout(() => {
                    selectedMemberInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 50);
                }}
                className={cn(
                  "px-md py-sm rounded-button text-Label transition-all",
                  selectedMember?.id === row.id
                    ? "bg-accent text-white"
                    : "bg-primary-light text-primary hover:bg-primary hover:text-white"
                )}
              >
                {selectedMember?.id === row.id ? '선택됨' : '선택'}
              </button>
            )
          }
        ]}
        data={filteredMembers}
      />

      {selectedMember && (
        <div ref={selectedMemberInfoRef} className="mt-md p-md bg-accent-light border border-accent/30 rounded-xl flex items-center gap-sm">
          <CheckCircle2 className="text-accent" size={16} />
          <span className="text-Body-2 text-content">
            <span className="font-bold text-accent">{selectedMember.name}</span>
            {' '}({selectedMember.phone}) 회원이 선택되었습니다.
          </span>
        </div>
      )}
    </div>
  );

  // ── Step 2: 상품 선택 ──
  const renderStep2 = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="lg:col-span-2 space-y-lg">
        {stepErrors[2] && (
          <div className="flex items-center gap-sm text-state-error text-Body-2 bg-state-error/5 border border-state-error/20 rounded-xl px-md py-sm">
            <AlertCircle size={16} /> {stepErrors[2]}
          </div>
        )}
        <TabNav
          tabs={[
            { key: 'facility', label: '시설이용' },
            { key: 'pt', label: '1:1수업' },
            { key: 'gx', label: '그룹수업' },
            { key: 'option', label: '옵션' },
          ]}
          activeTab={activeCategory}
          onTabChange={setActiveCategory}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {(products[activeCategory] ?? []).map(p => {
            const already = selectedProducts.find(item => item.id === p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={!!already}
                onClick={() => {
                  if (!already) {
                    setSelectedProducts([...selectedProducts, p]);
                    clearStepError(2);
                  }
                }}
                className={cn(
                  "w-full text-left p-lg border rounded-xl group bg-surface shadow-card transition-all",
                  already ? "border-accent bg-accent-light cursor-default" : "border-line hover:border-accent cursor-pointer"
                )}
              >
                <div className="flex justify-between items-start mb-sm">
                  <h3 className="text-Body-1 font-bold text-content">{p.name}</h3>
                  {already
                    ? <CheckCircle2 className="text-accent" size={20} />
                    : <Plus className="text-content-secondary group-hover:text-accent" size={20} />
                  }
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-Body-2 text-content-secondary">{p.duration}일</span>
                  <span className="text-Heading-2 text-primary font-bold">{p.price.toLocaleString()}원</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 장바구니 */}
      <div className="bg-primary-light rounded-xl p-xl h-fit sticky top-xl">
        <h3 className="text-Heading-2 text-content mb-lg flex items-center gap-sm">
          장바구니 <span className="text-primary text-Body-1">{selectedProducts.length}</span>
        </h3>
        <div className="space-y-md mb-xl max-h-[360px] overflow-auto pr-sm">
          {selectedProducts.length === 0 ? (
            <p className="text-Body-2 text-content-secondary py-xl text-center">상품을 선택해주세요.</p>
          ) : (
            selectedProducts.map((p, idx) => (
              <div key={idx} className="bg-surface p-md rounded-xl flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-Body-2 font-semibold text-content">{p.name}</p>
                  <p className="text-Label text-primary">{p.price.toLocaleString()}원</p>
                </div>
                <button
                  className="text-content-secondary hover:text-state-error transition-colors"
                  onClick={() => setSelectedProducts(selectedProducts.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-primary/20 pt-lg">
          <div className="flex justify-between items-center">
            <span className="text-Body-1 text-content">총 합계</span>
            <span className="text-Heading-2 text-primary font-bold">{totalPrice.toLocaleString()}원</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 3: 기간/금액 ──
  const renderStep3 = () => (
    <div className="space-y-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <FormSection title="계약 기간" columns={2}>
        <div className="space-y-xs">
          <label className="text-Label text-content-secondary">
            시작일 <span className="text-state-error">*</span>
          </label>
          <input
            type="date"
            className={cn(
              "w-full p-md bg-surface-secondary rounded-input outline-none focus:ring-2 focus:ring-accent transition-all",
              stepErrors[3] ? "ring-1 ring-state-error" : ""
            )}
            value={contractDetails.startDate}
            onChange={e => {
              setContractDetails({ ...contractDetails, startDate: e.target.value });
              if (e.target.value) clearStepError(3);
            }}
          />
          {stepErrors[3] && (
            <p className="text-[12px] text-state-error flex items-center gap-xs">
              <AlertCircle size={12} />{stepErrors[3]}
            </p>
          )}
        </div>
        <div className="space-y-xs">
          <label className="text-Label text-content-secondary">종료일</label>
          <input
            type="date"
            readOnly
            className="w-full p-md bg-surface-secondary rounded-input outline-none opacity-70 cursor-not-allowed"
            value={computedEndDate}
          />
          <p className="text-[11px] text-content-secondary flex items-center gap-xs">
            <Info size={11} className="shrink-0" />
            시작일 + 상품기간 자동 계산 (직접 수정 불가)
          </p>
        </div>
        <div className="space-y-xs">
          <label className="text-Label text-content-secondary">서비스 일수 추가</label>
          <div className="flex items-center gap-sm">
            <input
              type="number"
              className="flex-1 p-md bg-surface-secondary rounded-input outline-none focus:ring-2 focus:ring-accent transition-all"
              placeholder="0"
              min="0"
              value={contractDetails.serviceDays || ''}
              onChange={e => setContractDetails({ ...contractDetails, serviceDays: parseInt(e.target.value) || 0 })}
            />
            <span className="text-Body-2 text-content-secondary">일</span>
          </div>
        </div>
      </FormSection>

      <FormSection title="할인 설정" columns={2}>
        <div className="space-y-xs">
          <Select
            label="할인 유형"
            value={discountType}
            onChange={v => setDiscountType(v)}
            options={[
              { value: "", label: "없음 (할인 없음)" },
              ...DISCOUNT_TYPES.map(d => ({ value: d.value, label: d.label })),
            ]}
          />
        </div>
        <div className="space-y-xs">
          <label className="text-Label text-content-secondary">
            할인율 <span className="text-content-secondary text-[10px]">(최대 50%)</span>
          </label>
          <div className="flex items-center gap-sm">
            <input
              type="number"
              min="0"
              max="50"
              className={cn(
                "flex-1 p-md bg-surface-secondary rounded-input outline-none focus:ring-2 focus:ring-accent transition-all disabled:opacity-50",
                discountError ? "ring-1 ring-state-error" : ""
              )}
              placeholder="0"
              value={discountRate}
              disabled={!discountType}
              onChange={e => handleDiscountRateChange(e.target.value)}
            />
            <span className="text-Body-2 text-content-secondary">%</span>
          </div>
          {discountError && (
            <p className="text-[12px] text-state-error flex items-center gap-xs">
              <AlertCircle size={12} />{discountError}
            </p>
          )}
        </div>

        <div className="space-y-xs md:col-span-2">
          <label className="text-Label text-content-secondary">할인 사유</label>
          <input
            type="text"
            className="w-full p-md bg-surface-secondary rounded-input outline-none focus:ring-2 focus:ring-accent transition-all disabled:opacity-50"
            placeholder="할인 적용 사유를 입력하세요."
            value={discountReason}
            disabled={!discountType}
            onChange={e => setDiscountReason(e.target.value)}
          />
        </div>

        {discountType && discountRateNum > 0 && (
          <div className="md:col-span-2 bg-primary-light rounded-xl p-lg space-y-sm border border-primary/20">
            <div className="flex justify-between text-Body-2">
              <span className="text-content-secondary">원가</span>
              <span className="font-medium">{totalPrice.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-Body-2 text-state-error">
              <span>할인 ({discountRateNum}%)</span>
              <span>- {discountAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-Body-1 font-bold border-t border-primary/20 pt-sm">
              <span className="text-content">최종가</span>
              <span className="text-primary">{finalPrice.toLocaleString()}원</span>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection title="실적 담당자" columns={1}>
        <div className="space-y-xs">
          <Select
            label="실적 담당자 선택"
            value={String(salesStaffId)}
            onChange={v => {
              const id = v === '' ? '' : Number(v);
              setSalesStaffId(id as number | '');
              setSalesStaffName(staffs.find(s => s.id === Number(v))?.name ?? '');
            }}
            options={[
              { value: '', label: '담당자 없음' },
              ...staffs.map(s => ({ value: String(s.id), label: s.name })),
            ]}
          />
          <p className="text-[11px] text-content-secondary">계약 실적이 귀속될 직원을 선택하세요.</p>
        </div>
      </FormSection>

      <FormSection title="특약 및 메모" columns={1}>
        <div className="space-y-xs">
          <Textarea
            label="특약 사항"
            placeholder="계약 시 별도 협의된 내용을 입력하세요."
            value={contractDetails.memo}
            onChange={e => setContractDetails({ ...contractDetails, memo: e.target.value })}
            rows={4}
          />
        </div>
      </FormSection>

      <div className="bg-accent-light p-md rounded-xl border border-accent/30 flex items-start gap-md">
        <Info className="text-accent shrink-0 mt-1" size={18} />
        <p className="text-Body-2 text-content">
          선택하신 상품의 유효기간과 서비스 일수를 합산하여 종료일이 자동으로 계산됩니다.
        </p>
      </div>
    </div>
  );

  // ── Step 4: 결제 ──
  const paymentTotal = Array.from(selectedMethods).reduce((sum, id) => sum + (paymentAmounts[id] || 0), 0);
  const paymentMatchesLabel = selectedMethods.size === 0
    ? null
    : paymentTotal === finalPrice
      ? '금액이 일치합니다 ✓'
      : '금액 합계가 일치하지 않습니다';
  const paymentMatchesOk = paymentTotal === finalPrice && selectedMethods.size > 0;

  const toggleMethod = (id: string) => {
    setSelectedMethods(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // 선택 해제 시 금액 초기화
        setPaymentAmounts(a => ({ ...a, [id]: 0 }));
      } else {
        next.add(id);
      }
      // 단일 선택이면 기존 paymentMethod도 동기화
      if (next.size === 1) setPaymentMethod([...next][0]);
      return next;
    });
  };

  const renderStep4 = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-xl">
        <FormSection title="결제 수단 선택 (복수 선택 가능)" columns={1}>
          <div className="grid grid-cols-2 gap-md">
            {PAYMENT_METHODS.map(method => (
              <button
                key={method.id}
                onClick={() => toggleMethod(method.id)}
                className={cn(
                  "flex items-center gap-md p-lg rounded-xl border-2 transition-all text-left",
                  selectedMethods.has(method.id)
                    ? "border-accent bg-accent-light text-accent"
                    : "border-line bg-surface text-content-secondary hover:border-accent/50"
                )}
              >
                <method.icon size={24} />
                <span className="font-bold">{method.label}</span>
              </button>
            ))}
          </div>

          {/* 선택된 수단별 금액 입력 */}
          {selectedMethods.size > 0 && (
            <div className="mt-md space-y-sm">
              {PAYMENT_METHODS.filter(m => selectedMethods.has(m.id)).map(method => (
                <div key={method.id} className="flex items-center gap-md">
                  <span className="text-Body-2 text-content-secondary w-[72px] shrink-0">{method.label}</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      value={paymentAmounts[method.id] || ''}
                      onChange={e => setPaymentAmounts(a => ({ ...a, [method.id]: Number(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full border border-line rounded-lg px-md py-sm text-Body-1 text-right pr-[32px] focus:outline-none focus:border-accent"
                    />
                    <span className="absolute right-md top-1/2 -translate-y-1/2 text-Body-2 text-content-secondary">원</span>
                  </div>
                </div>
              ))}

              {/* 합계 검증 */}
              <div className="pt-sm border-t border-line flex justify-between items-center">
                <span className="text-Body-2 text-content-secondary">입력 합계</span>
                <span className="text-Body-1 font-bold">{paymentTotal.toLocaleString()}원</span>
              </div>
              {paymentMatchesLabel && (
                <p className={cn("text-Body-2 font-medium text-right", paymentMatchesOk ? "text-green-600" : "text-state-error")}>
                  {paymentMatchesLabel}
                </p>
              )}
            </div>
          )}
        </FormSection>

        <FormSection title="결제 금액" columns={1}>
          <div className="space-y-md">
            <div className="flex justify-between py-sm border-b border-line">
              <span className="text-Body-2 text-content-secondary">상품 합계</span>
              <span className="text-Body-1 font-medium">{totalPrice.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between py-sm border-b border-line text-state-error">
              <span className="text-Body-2">할인 ({discountRateNum > 0 ? `${discountRateNum}%` : '없음'})</span>
              <span className="text-Body-1 font-medium">- {discountAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between py-md">
              <span className="text-Heading-2 text-content">최종 결제 금액</span>
              <span className="text-Heading-1 text-primary font-bold">{finalPrice.toLocaleString()}원</span>
            </div>
          </div>
        </FormSection>
      </div>

      <div className="flex flex-col items-center justify-center p-xxl bg-surface rounded-xl border-2 border-dashed border-line">
        <div className="w-[80px] h-[80px] bg-accent-light rounded-full flex items-center justify-center text-accent mb-lg">
          <CreditCard size={40} />
        </div>
        <h3 className="text-Heading-2 text-content mb-sm">결제 대기 중</h3>
        <p className="text-Body-2 text-content-secondary text-center mb-xl">
          단말기를 통해 결제를 진행하거나,<br />아래 버튼을 눌러 결제 처리를 완료하세요.
        </p>
        <button
          onClick={nextStep}
          className="w-full py-xl bg-accent text-white rounded-button text-Heading-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
        >
          결제 실행하기
        </button>
      </div>
    </div>
  );

  // ── Step 5: 확인 ──
  const renderStep5 = () => (
    <div className="space-y-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-accent-light border border-accent/30 rounded-xl p-lg flex items-center gap-md">
        <CheckCircle2 className="text-accent shrink-0" size={24} />
        <div>
          <p className="text-Body-1 font-bold text-content">계약 내용을 최종 확인해주세요.</p>
          <p className="text-Body-2 text-content-secondary">모든 내용이 정확한지 확인 후 완료 버튼을 누르세요.</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-line p-xl shadow-card">
        <h3 className="text-Heading-2 text-content mb-lg">계약 내용 요약</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
          {/* 회원 정보 */}
          <div className="space-y-sm">
            <h4 className="text-Label font-bold text-content-secondary uppercase tracking-wider">회원 정보</h4>
            <div className="bg-surface-secondary/40 rounded-xl p-md space-y-xs">
              <div className="flex justify-between text-Body-2">
                <span className="text-content-secondary">이름</span>
                <span className="font-semibold">{selectedMember?.name}</span>
              </div>
              <div className="flex justify-between text-Body-2">
                <span className="text-content-secondary">연락처</span>
                <span>{selectedMember?.phone}</span>
              </div>
            </div>
          </div>

          {/* 계약 조건 */}
          <div className="space-y-sm">
            <h4 className="text-Label font-bold text-content-secondary uppercase tracking-wider">계약 조건</h4>
            <div className="bg-surface-secondary/40 rounded-xl p-md space-y-xs">
              <div className="flex justify-between text-Body-2">
                <span className="text-content-secondary">시작일</span>
                <span>{contractDetails.startDate}</span>
              </div>
              <div className="flex justify-between text-Body-2">
                <span className="text-content-secondary">종료일</span>
                <span>{computedEndDate || '-'}</span>
              </div>
              <div className="flex justify-between text-Body-2">
                <span className="text-content-secondary">결제 수단</span>
                <span>{Array.from(selectedMethods).map(id => ({ card: '카드', cash: '현금', mileage: '마일리지', transfer: '계좌이체' }[id] ?? id)).join(' + ')}</span>
              </div>
            </div>
          </div>

          {/* 상품 목록 */}
          <div className="md:col-span-2 space-y-sm">
            <h4 className="text-Label font-bold text-content-secondary uppercase tracking-wider">상품 목록</h4>
            <div className="bg-surface-secondary/40 rounded-xl overflow-hidden">
              {selectedProducts.map((p, i) => (
                <div key={i} className={cn("flex justify-between items-center px-md py-sm text-Body-2", i > 0 && "border-t border-line")}>
                  <span>{p.name}</span>
                  <span className="font-semibold text-primary">{p.price.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          </div>

          {/* 금액 요약 */}
          <div className="md:col-span-2 space-y-sm">
            <h4 className="text-Label font-bold text-content-secondary uppercase tracking-wider">금액 내역</h4>
            <div className="bg-primary-light rounded-xl p-md space-y-sm border border-primary/10">
              <div className="flex justify-between text-Body-2">
                <span className="text-content-secondary">원가 합계</span>
                <span>{totalPrice.toLocaleString()}원</span>
              </div>
              {discountRateNum > 0 && (
                <div className="flex justify-between text-Body-2 text-state-error">
                  <span>할인 ({DISCOUNT_TYPES.find(d => d.value === discountType)?.label ?? ''} {discountRateNum}%)</span>
                  <span>- {discountAmount.toLocaleString()}원</span>
                </div>
              )}
              <div className="flex justify-between text-Body-1 font-bold border-t border-primary/20 pt-sm">
                <span>최종 결제 금액</span>
                <span className="text-primary text-Heading-2">{finalPrice.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 전자서명 */}
      <div className="bg-surface rounded-xl border border-line p-xl shadow-card space-y-xl">
        <div>
          <h3 className="text-Heading-2 text-content mb-sm">전자서명</h3>
          <p className="text-Body-2 text-content-secondary">
            위 계약 내용에 동의하며 고객과 센터장이 각각 서명합니다.
          </p>
        </div>

        {signatureError && (
          <div className="flex items-center gap-sm text-state-error text-Body-2 bg-state-error/5 border border-state-error/20 rounded-xl px-md py-sm">
            <AlertCircle size={16} /> {signatureError}
          </div>
        )}

        {/* 고객 서명 */}
        <div className="space-y-sm">
          <div className="flex items-center gap-sm">
            <span className="text-Body-1 font-bold text-content">고객 서명</span>
            {customerSignatureDataUrl && (
              <span className="text-[12px] text-state-success font-semibold flex items-center gap-xs">
                <CheckCircle2 size={14} /> 서명 완료
              </span>
            )}
          </div>
          <SignaturePad
            onSign={(dataUrl) => {
              setCustomerSignatureDataUrl(dataUrl);
              setSignatureError('');
            }}
            height={180}
          />
        </div>

        {/* 센터장 서명 */}
        <div className="space-y-sm">
          <div className="flex items-center gap-sm">
            <span className="text-Body-1 font-bold text-content">센터장 서명</span>
            {managerSignatureDataUrl && (
              <span className="text-[12px] text-state-success font-semibold flex items-center gap-xs">
                <CheckCircle2 size={14} /> 서명 완료
              </span>
            )}
          </div>
          <SignaturePad
            onSign={(dataUrl) => {
              setManagerSignatureDataUrl(dataUrl);
              setSignatureError('');
            }}
            height={180}
          />
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto pb-xxl">
        <PageHeader
          title="전자계약 등록"
          description="회원 선택부터 상품 결제, 확인까지 5단계로 진행합니다."
          actions={
            <button
              onClick={() => {
                if (step > 1 || selectedMember || selectedProducts.length > 0) {
                  if (!window.confirm('작성 중인 내용이 있습니다. 정말 취소하시겠습니까?')) return;
                }
                moveToPage(970);
              }}
              className="px-lg py-md rounded-button border border-line text-content-secondary hover:bg-surface transition-all"
            >
              취소
            </button>
          }
        />

        {/* Step Indicator */}
        {/* 모바일: 컴팩트 표시 */}
        <div className="mb-xxl md:hidden flex items-center gap-sm px-lg py-md">
          <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center font-bold text-Body-1 bg-primary text-white shadow-lg shadow-primary/30">
            {step}
          </div>
          <span className="text-Body-2 font-bold text-primary">
            {step}/{STEPS.length} {STEPS[step - 1].name}
          </span>
          <div className="flex-1 h-[4px] bg-line rounded-full ml-sm">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
        {/* 데스크톱: 풀 step indicator */}
        <div className="mb-xxl hidden md:block py-md">
          <div className="flex items-center justify-between px-lg">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-sm relative z-10">
                  <div className={cn(
                    "w-[44px] h-[44px] rounded-full flex items-center justify-center font-bold text-Body-1 transition-all duration-300",
                    step === s.id
                      ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110"
                      : step > s.id
                        ? "bg-accent text-white"
                        : "bg-surface border border-line text-content-secondary"
                  )}>
                    {step > s.id ? <CheckCircle2 size={22} /> : s.id}
                  </div>
                  <span className={cn(
                    "text-Label font-bold transition-colors whitespace-nowrap",
                    step === s.id ? "text-primary" : step > s.id ? "text-accent" : "text-content-secondary"
                  )}>
                    {s.name}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-[2px] bg-line mx-sm relative -top-4">
                    <div
                      className="absolute inset-0 bg-accent transition-all duration-500"
                      style={{ width: step > s.id ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[500px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="mt-xxl pt-xl border-t border-line flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className={cn(
              "flex items-center gap-sm px-xl py-lg rounded-button font-bold transition-all",
              step === 1
                ? "text-content-secondary cursor-not-allowed opacity-40"
                : "text-content-secondary hover:bg-surface hover:text-content"
            )}
          >
            <ChevronLeft size={20} /> 이전
          </button>

          {step < 5 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-sm px-[48px] py-lg bg-primary text-white rounded-button font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
            >
              다음 단계 <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleContractSave}
              disabled={isSaving}
              className="flex items-center gap-sm px-[48px] py-lg bg-accent text-white rounded-button font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={20} /> {isSaving ? "저장 중..." : "계약 완료 확인"}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dupConfirm.open}
        title="중복 결제 감지"
        description={dupConfirm.message + '\n계속 진행하시겠습니까?'}
        confirmLabel="진행"
        cancelLabel="취소"
        onConfirm={dupConfirm.onConfirm}
        onCancel={() => setDupConfirm(prev => ({ ...prev, open: false }))}
      />
    </AppLayout>
  );
}
