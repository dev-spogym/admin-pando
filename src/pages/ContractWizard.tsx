import React, { useState, useMemo } from 'react';
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
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import FormSection from '@/components/FormSection';
import StatusBadge from '@/components/StatusBadge';
import TabNav from '@/components/TabNav';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';

// Mock Data
const MOCK_MEMBERS = [
  { id: 1, name: '홍길동', phone: '010-1234-5678', status: 'active', membership: '프리미엄 12개월' },
  { id: 2, name: '김영희', phone: '010-2222-3333', status: 'expired', membership: 'GX 3개월' },
  { id: 3, name: '이철수', phone: '010-4444-5555', status: 'hold', membership: 'PT 20회' },
  { id: 4, name: '박민수', phone: '010-8888-9999', status: 'active', membership: '헬스 6개월' },
];

const MOCK_PRODUCTS: Record<string, { id: string; name: string; price: number; duration: number }[]> = {
  facility: [
    { id: 'f1', name: '헬스 12개월 (전지점)', price: 840000, duration: 365 },
    { id: 'f2', name: '헬스 6개월', price: 480000, duration: 180 },
    { id: 'f3', name: '헬스 3개월', price: 270000, duration: 90 },
  ],
  pt: [
    { id: 'p1', name: '1:1 PT 30회', price: 1800000, duration: 180 },
    { id: 'p2', name: '1:1 PT 20회', price: 1300000, duration: 120 },
    { id: 'p3', name: '1:1 PT 10회', price: 700000, duration: 60 },
  ],
  gx: [
    { id: 'g1', name: '요가/필라테스 3개월', price: 350000, duration: 90 },
    { id: 'g2', name: '그룹 사이클 1개월', price: 120000, duration: 30 },
  ],
  option: [
    { id: 'o1', name: '개인 락커 12개월', price: 120000, duration: 365 },
    { id: 'o2', name: '운동복 대여 12개월', price: 60000, duration: 365 },
  ]
};

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
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('facility');

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
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});

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

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return MOCK_MEMBERS;
    return MOCK_MEMBERS.filter(m => m.name.includes(searchQuery) || m.phone.includes(searchQuery));
  }, [searchQuery]);

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
            render: v => (
              <StatusBadge
                variant={v === 'active' ? 'success' : v === 'hold' ? 'warning' : 'error'}
                label={v === 'active' ? '정상' : v === 'hold' ? '홀딩' : '만료'}
              />
            )
          },
          { key: 'membership', header: '보유 상품' },
          {
            key: 'action', header: '', width: 100, align: 'right',
            render: (_, row) => (
              <button
                onClick={() => { setSelectedMember(row); clearStepError(1); }}
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
        <div className="mt-md p-md bg-accent-light border border-accent/30 rounded-xl flex items-center gap-sm">
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
          {MOCK_PRODUCTS[activeCategory].map(p => {
            const already = selectedProducts.find(item => item.id === p.id);
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!already) {
                    setSelectedProducts([...selectedProducts, p]);
                    clearStepError(2);
                  }
                }}
                className={cn(
                  "p-lg border rounded-xl cursor-pointer group bg-surface shadow-card transition-all",
                  already ? "border-accent bg-accent-light" : "border-line hover:border-accent"
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
              </div>
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
          <label className="text-Label text-content-secondary">종료일 (자동 계산)</label>
          <input
            type="date"
            readOnly
            className="w-full p-md bg-surface-secondary rounded-input outline-none opacity-70 cursor-not-allowed"
            value={computedEndDate}
          />
          <p className="text-[11px] text-content-secondary">선택 상품 기간 + 서비스 일수 합산</p>
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
          <label className="text-Label text-content-secondary">할인 유형</label>
          <select
            className="w-full p-md bg-surface-secondary rounded-input outline-none focus:ring-2 focus:ring-accent transition-all"
            value={discountType}
            onChange={e => setDiscountType(e.target.value)}
          >
            <option value="">없음 (할인 없음)</option>
            {DISCOUNT_TYPES.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
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

      <FormSection title="특약 및 메모" columns={1}>
        <div className="space-y-xs">
          <label className="text-Label text-content-secondary">특약 사항</label>
          <textarea
            className="w-full p-md bg-surface-secondary rounded-input outline-none focus:ring-2 focus:ring-accent transition-all min-h-[100px]"
            placeholder="계약 시 별도 협의된 내용을 입력하세요."
            value={contractDetails.memo}
            onChange={e => setContractDetails({ ...contractDetails, memo: e.target.value })}
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
  const renderStep4 = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-xl">
        <FormSection title="결제 수단 선택" columns={1}>
          <div className="grid grid-cols-2 gap-md">
            {PAYMENT_METHODS.map(method => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  "flex items-center gap-md p-lg rounded-xl border-2 transition-all text-left",
                  paymentMethod === method.id
                    ? "border-accent bg-accent-light text-accent"
                    : "border-line bg-surface text-content-secondary hover:border-accent/50"
                )}
              >
                <method.icon size={24} />
                <span className="font-bold">{method.label}</span>
              </button>
            ))}
          </div>
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
        <button className="w-full py-xl bg-accent text-white rounded-button text-Heading-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20">
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
                <span>{{ card: '카드', cash: '현금', mileage: '마일리지', transfer: '계좌이체' }[paymentMethod]}</span>
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
              onClick={() => moveToPage(970)}
              className="px-lg py-md rounded-button border border-line text-content-secondary hover:bg-surface transition-all"
            >
              취소
            </button>
          }
        />

        {/* Step Indicator */}
        <div className="mb-xxl overflow-x-auto py-md">
          <div className="flex items-center justify-between min-w-[600px] px-lg">
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
              onClick={() => setShowCompleteDialog(true)}
              className="flex items-center gap-sm px-[48px] py-lg bg-accent text-white rounded-button font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
            >
              <FileText size={20} /> 계약 완료 확인
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showCompleteDialog}
        title="계약 등록 완료"
        description={`${selectedMember?.name} 회원의 계약이 성공적으로 등록되었습니다.\n회원 상세 페이지로 이동하시겠습니까?`}
        confirmLabel="회원 상세로 이동"
        cancelLabel="목록으로 이동"
        onConfirm={() => moveToPage(985)}
        onCancel={() => moveToPage(967)}
      />
    </AppLayout>
  );
}
