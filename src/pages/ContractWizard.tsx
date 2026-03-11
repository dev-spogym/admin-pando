
import React, { useState, useMemo } from 'react';
import {
  User,
  Search,
  CheckCircle2,
  CreditCard,
  PenTool,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Info,
  Tag,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import FormSection from '@/components/FormSection';
import SearchFilter from '@/components/SearchFilter';
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

const MOCK_PRODUCTS = {
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

export default function ContractWizard() {
  const [step, setStep] = useState(1);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('facility');
  const [contractDetails, setContractDetails] = useState({
    startDate: new Date().toISOString().split('T')[0],
    serviceDays: 0,
    memo: ''
  });

  // 할인 관련 상태
  const [discountType, setDiscountType] = useState('');
  const [discountRate, setDiscountRate] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [discountError, setDiscountError] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAmountError, setPaymentAmountError] = useState('');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});

  const steps = [
    { id: 1, name: '회원 검색', icon: Search },
    { id: 2, name: '상품 선택', icon: CheckCircle2 },
    { id: 3, name: '계약 조건', icon: Info },
    { id: 4, name: '결제', icon: CreditCard },
    { id: 5, name: '전자서명', icon: PenTool },
  ];

  const totalPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);

  // 할인율 계산 (최대 50%)
  const discountRateNum = Math.min(50, Math.max(0, parseFloat(discountRate) || 0));
  const discountAmount = Math.round(totalPrice * (discountRateNum / 100));
  const finalPrice = totalPrice - discountAmount;

  const handleDiscountRateChange = (value: string) => {
    const num = parseFloat(value) || 0;
    if (num > 50) {
      setDiscountError('최대 할인율은 50%입니다.');
    } else if (num < 0) {
      setDiscountError('할인율은 0% 이상이어야 합니다.');
    } else {
      setDiscountError('');
    }
    setDiscountRate(value);
  };

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
    if (currentStep === 4) {
      const entered = parseFloat(paymentAmount.replace(/,/g, '')) || 0;
      if (entered !== finalPrice) {
        setPaymentAmountError(`결제 금액이 최종가(${finalPrice.toLocaleString()}원)와 일치하지 않습니다.`);
        return false;
      }
    }
    setStepErrors(prev => {
      const next = { ...prev };
      delete next[currentStep];
      return next;
    });
    return true;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    setShowCompleteDialog(true);
  };

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return MOCK_MEMBERS;
    return MOCK_MEMBERS.filter(m => m.name.includes(searchQuery) || m.phone.includes(searchQuery));
  }, [searchQuery]);

  // 결제금액 포맷
  const handlePaymentAmountChange = (value: string) => {
    const raw = value.replace(/[^0-9]/g, '');
    const num = parseInt(raw) || 0;
    setPaymentAmount(num.toLocaleString());
    const entered = num;
    if (entered !== finalPrice) {
      setPaymentAmountError(`최종가(${finalPrice.toLocaleString()}원)와 일치해야 합니다.`);
    } else {
      setPaymentAmountError('');
    }
  };

  // Render Step Content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-lg animate-in fade-in slide-in-from-bottom-4 duration-500" >
            <div className="flex justify-between items-center mb-md" >
              <h2 className="text-Heading 2 text-text-dark-grey" >회원 조회</h2>
              <button
                className="text-Label text-primary-coral font-bold flex items-center gap-xs hover:underline" onClick={() => moveToPage(986)}>
                <Plus size={16}/> 신규 회원 등록
              </button>
            </div>
            <div className="flex gap-sm mb-lg" >
              <div className="relative flex-1" >
                <Search className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={20}/>
                <input
                  className="w-full pl-[44px] pr-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" type="text" placeholder="이름 또는 전화번호로 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
              </div>
            </div>

            {stepErrors[1] && (
              <div className="flex items-center gap-sm text-error text-Body 2 bg-error/5 border border-error/20 rounded-card-normal px-md py-sm" >
                <AlertCircle size={16}/> {stepErrors[1]}
              </div>
            )}

            <DataTable columns={[
                { key: 'name', header: '이름', width: 120 },
                { key: 'phone', header: '연락처', width: 150 },
                {
                  key: 'status',
                  header: '상태',
                  width: 100,
                  render: (v) => (
                    <StatusBadge
                      variant={v === 'active' ? 'success' : v === 'hold' ? 'warning' : 'error'}
                      label={v === 'active' ? '정상' : v === 'hold' ? '홀딩' : '만료'}
                    />
                  )
                },
                { key: 'membership', header: '보유 상품' },
                {
                  key: 'action',
                  header: '',
                  width: 100,
                  align: 'right',
                  render: (_, row) => (
                    <button
                      onClick={() => { setSelectedMember(row); setStepErrors(prev => { const n = {...prev}; delete n[1]; return n; }); }}
                      className={cn(
                        "px-md py-sm rounded-button text-Label transition-all",
                        selectedMember?.id === row.id
                          ? "bg-secondary-mint text-white"
                          : "bg-bg-soft-peach text-primary-coral hover:bg-primary-coral hover:text-white"
                      )}
                    >
                      {selectedMember?.id === row.id ? '선택됨' : '선택'}
                    </button>
                  )
                }
              ]} data={filteredMembers}/>

            {selectedMember && (
              <div className="mt-md flex items-center gap-sm px-md py-sm bg-bg-soft-mint border border-secondary-mint/30 rounded-card-normal" >
                <CheckCircle2 className="text-secondary-mint" size={16}/>
                <span className="text-Body 2 text-text-dark-grey" >
                  <span className="font-bold text-secondary-mint" >{selectedMember.name}</span> 회원이 선택되었습니다.
                </span>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl animate-in fade-in slide-in-from-bottom-4 duration-500" >
            <div className="lg:col-span-2 space-y-lg" >
              {stepErrors[2] && (
                <div className="flex items-center gap-sm text-error text-Body 2 bg-error/5 border border-error/20 rounded-card-normal px-md py-sm" >
                  <AlertCircle size={16}/> {stepErrors[2]}
                </div>
              )}
              <TabNav tabs={[
                  { key: 'facility', label: '시설이용' },
                  { key: 'pt', label: '1:1수업' },
                  { key: 'gx', label: '그룹수업' },
                  { key: 'option', label: '옵션' },
                ]} activeTab={activeCategory} onTabChange={setActiveCategory}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md" >
                {(MOCK_PRODUCTS as any)[activeCategory].map((p: any) => {
                  const already = selectedProducts.find(item => item.id === p.id);
                  return (
                    <div
                      className={cn(
                        "p-lg border rounded-card-normal transition-all cursor-pointer group bg-3 shadow-card-soft",
                        already ? "border-secondary-mint bg-bg-soft-mint" : "border-border-light hover:border-secondary-mint"
                      )} key={p.id} onClick={() => {
                        if (!already) {
                          setSelectedProducts([...selectedProducts, p]);
                          setStepErrors(prev => { const n = {...prev}; delete n[2]; return n; });
                        }
                      }}>
                      <div className="flex justify-between items-start mb-sm" >
                        <h3 className="text-Body 1 font-bold text-text-dark-grey" >{p.name}</h3>
                        {already
                          ? <CheckCircle2 className="text-secondary-mint" size={20}/>
                          : <Plus className="text-text-grey-blue group-hover:text-secondary-mint" size={20}/>
                        }
                      </div>
                      <div className="flex justify-between items-end" >
                        <span className="text-Body 2 text-text-grey-blue" >{p.duration}일</span>
                        <span className="text-Heading 2 text-primary-coral font-bold" >{p.price.toLocaleString()}원</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-bg-soft-peach rounded-card-strong p-xl h-fit sticky top-xl" >
              <h3 className="text-Heading 2 text-text-dark-grey mb-lg flex items-center gap-sm" >
                장바구니 <span className="text-primary-coral text-Body 1" >{selectedProducts.length}</span>
              </h3>
              <div className="space-y-md mb-xl max-h-[400px] overflow-auto pr-sm" >
                {selectedProducts.length === 0 ? (
                  <p className="text-Body 2 text-text-grey-blue py-xl text-center" >상품을 선택해주세요.</p>
                ) : (
                  selectedProducts.map((p, idx) => (
                    <div className="bg-3 p-md rounded-card-normal flex justify-between items-center shadow-sm" key={idx}>
                      <div >
                        <p className="text-Body 2 font-semibold text-text-dark-grey" >{p.name}</p>
                        <p className="text-Label text-primary-coral" >{p.price.toLocaleString()}원</p>
                      </div>
                      <button
                        className="text-text-grey-blue hover:text-error transition-colors" onClick={() => setSelectedProducts(selectedProducts.filter((_, i) => i !== idx))}>
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-primary-coral/20 pt-lg" >
                <div className="flex justify-between items-center mb-md" >
                  <span className="text-Body 1 text-text-dark-grey" >총 합계</span>
                  <span className="text-Heading 2 text-primary-coral font-bold" >{totalPrice.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-xl animate-in fade-in slide-in-from-bottom-4 duration-500" >
            <FormSection title="계약 기본 정보" columns={2}>
              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue" >
                  시작일 <span className="text-error" >*</span>
                </label>
                <input
                  className={cn(
                    "w-full p-md bg-input-bg-light rounded-input outline-none focus:ring-2 focus:ring-secondary-mint transition-all",
                    stepErrors[3] ? "ring-1 ring-error border border-error" : ""
                  )} type="date" value={contractDetails.startDate} onChange={(e) => {
                    setContractDetails({...contractDetails, startDate: e.target.value});
                    if (e.target.value) setStepErrors(prev => { const n = {...prev}; delete n[3]; return n; });
                  }}/>
                {stepErrors[3] && (
                  <p className="text-[12px] text-error flex items-center gap-xs" ><AlertCircle size={12}/>{stepErrors[3]}</p>
                )}
              </div>
              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue" >서비스 일수 추가</label>
                <div className="flex items-center gap-sm" >
                  <input
                    className="flex-1 p-md bg-input-bg-light rounded-input outline-none focus:ring-2 focus:ring-secondary-mint transition-all" type="number" placeholder="0" min="0" value={contractDetails.serviceDays} onChange={(e) => setContractDetails({...contractDetails, serviceDays: parseInt(e.target.value) || 0})}/>
                  <span className="text-Body 2 text-text-grey-blue" >일</span>
                </div>
              </div>
            </FormSection>

            {/* 할인 설정 */}
            <FormSection title="할인 설정" columns={2}>
              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue" >할인 유형</label>
                <select
                  className="w-full p-md bg-input-bg-light rounded-input outline-none focus:ring-2 focus:ring-secondary-mint transition-all" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                  <option value="">없음 (할인 없음)</option>
                  {DISCOUNT_TYPES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue" >
                  할인율 <span className="text-text-grey-blue text-[10px]" >(최대 50%)</span>
                </label>
                <div className="flex items-center gap-sm" >
                  <input
                    className={cn(
                      "flex-1 p-md bg-input-bg-light rounded-input outline-none focus:ring-2 focus:ring-secondary-mint transition-all",
                      discountError ? "ring-1 ring-error border border-error" : ""
                    )} type="number" min="0" max="50" placeholder="0" value={discountRate} disabled={!discountType} onChange={(e) => handleDiscountRateChange(e.target.value)}/>
                  <span className="text-Body 2 text-text-grey-blue" >%</span>
                </div>
                {discountError && (
                  <p className="text-[12px] text-error flex items-center gap-xs" ><AlertCircle size={12}/>{discountError}</p>
                )}
              </div>
              <div className="space-y-xs md:col-span-2" >
                <label className="text-Label text-text-grey-blue" >할인 사유</label>
                <input
                  className="w-full p-md bg-input-bg-light rounded-input outline-none focus:ring-2 focus:ring-secondary-mint transition-all disabled:opacity-50" type="text" placeholder="할인 적용 사유를 입력하세요." value={discountReason} disabled={!discountType} onChange={(e) => setDiscountReason(e.target.value)}/>
              </div>

              {/* 할인 계산 요약 */}
              {discountType && discountRateNum > 0 && (
                <div className="md:col-span-2 bg-bg-soft-peach rounded-card-normal p-lg space-y-sm border border-primary-coral/20" >
                  <div className="flex justify-between text-Body 2" >
                    <span className="text-text-grey-blue" >원가</span>
                    <span className="font-medium" >{totalPrice.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-Body 2 text-error" >
                    <span >할인 ({discountRateNum}%)</span>
                    <span >- {discountAmount.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-Body 1 font-bold border-t border-primary-coral/20 pt-sm" >
                    <span className="text-text-dark-grey" >최종가</span>
                    <span className="text-primary-coral" >{finalPrice.toLocaleString()}원</span>
                  </div>
                </div>
              )}
            </FormSection>

            <FormSection title="특약 및 메모" columns={1}>
              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue" >특약 사항</label>
                <textarea
                  className="w-full p-md bg-input-bg-light rounded-input outline-none focus:ring-2 focus:ring-secondary-mint transition-all min-h-[120px]" placeholder="계약 시 별도 협의된 내용을 입력하세요." value={contractDetails.memo} onChange={(e) => setContractDetails({...contractDetails, memo: e.target.value})}/>
              </div>
            </FormSection>

            <div className="bg-bg-soft-mint p-lg rounded-card-normal border border-secondary-mint/30 flex items-start gap-md" >
              <Info className="text-secondary-mint shrink-0 mt-1" size={20}/>
              <div className="text-Body 2 text-text-dark-grey" >
                <p className="font-bold mb-1" >계약 종료일 자동 계산</p>
                <p >선택하신 상품의 유효기간과 서비스 일수를 합산하여 종료일이 자동으로 계산됩니다.</p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl animate-in fade-in slide-in-from-bottom-4 duration-500" >
            <div className="space-y-xl" >
              <FormSection title="결제 수단 선택" columns={1}>
                <div className="grid grid-cols-2 gap-md" >
                  {[
                    { id: 'card', label: '신용카드', icon: CreditCard },
                    { id: 'cash', label: '현금', icon: User },
                    { id: 'transfer', label: '계좌이체', icon: ChevronRight },
                    { id: 'mileage', label: '마일리지', icon: Plus },
                  ].map((method) => (
                    <button
                      className={cn(
                        "flex items-center gap-md p-lg rounded-card-normal border-2 transition-all text-left",
                        paymentMethod === method.id
                          ? "border-secondary-mint bg-bg-soft-mint text-secondary-mint"
                          : "border-border-light bg-3 text-text-grey-blue hover:border-secondary-mint/50"
                      )} key={method.id} onClick={() => setPaymentMethod(method.id)}>
                      <method.icon size={24}/>
                      <span className="font-bold" >{method.label}</span>
                    </button>
                  ))}
                </div>
              </FormSection>

              <FormSection title="결제 세부 정보" columns={1}>
                <div className="space-y-md" >
                  <div className="flex justify-between py-sm border-b border-border-light" >
                    <span className="text-Body 2 text-text-grey-blue" >상품 합계</span>
                    <span className="text-Body 1 font-medium" >{totalPrice.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between py-sm border-b border-border-light text-error" >
                    <span className="text-Body 2" >할인 적용 ({discountRateNum > 0 ? `${discountRateNum}%` : '없음'})</span>
                    <span className="text-Body 1 font-medium" >- {discountAmount.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between py-md" >
                    <span className="text-Heading 2 text-text-dark-grey" >최종 결제 금액</span>
                    <span className="text-Heading 1 text-primary-coral font-bold" >{finalPrice.toLocaleString()}원</span>
                  </div>
                  {/* 결제금액 확인 입력 */}
                  <div className="space-y-xs pt-sm border-t border-border-light" >
                    <label className="text-Label text-text-grey-blue" >
                      결제 금액 확인 입력 <span className="text-error" >*</span>
                    </label>
                    <div className="relative" >
                      <input
                        className={cn(
                          "w-full p-md bg-input-bg-light rounded-input outline-none focus:ring-2 focus:ring-secondary-mint transition-all pr-[48px]",
                          paymentAmountError ? "ring-1 ring-error border border-error" : ""
                        )} type="text" placeholder={`${finalPrice.toLocaleString()}원 입력`} value={paymentAmount} onChange={(e) => handlePaymentAmountChange(e.target.value)}/>
                      <span className="absolute right-md top-1/2 -translate-y-1/2 text-Body 2 text-text-grey-blue" >원</span>
                    </div>
                    {paymentAmountError && (
                      <p className="text-[12px] text-error flex items-center gap-xs" >
                        <AlertCircle size={12}/>{paymentAmountError}
                      </p>
                    )}
                    {paymentAmount && !paymentAmountError && (
                      <p className="text-[12px] text-secondary-mint flex items-center gap-xs" >
                        <CheckCircle2 size={12}/> 금액이 일치합니다.
                      </p>
                    )}
                  </div>
                </div>
              </FormSection>
            </div>

            <div className="flex flex-col items-center justify-center p-xxl bg-3 rounded-card-strong border-2 border-dashed border-border-light" >
              <div className="w-[80px] h-[80px] bg-bg-soft-mint rounded-full flex items-center justify-center text-secondary-mint mb-lg" >
                <CreditCard size={40}/>
              </div>
              <h3 className="text-Heading 2 text-text-dark-grey mb-sm" >결제 대기 중</h3>
              <p className="text-Body 2 text-text-grey-blue text-center mb-xl" >
                단말기를 통해 결제를 진행하거나,<br />아래 버튼을 눌러 결제 처리를 완료하세요.
              </p>
              <button className="w-full py-xl bg-secondary-mint text-white rounded-button text-Heading 2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-secondary-mint/20" >
                결제 실행하기
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-xl animate-in fade-in slide-in-from-bottom-4 duration-500" >
            {/* 계약 내용 전체 요약 */}
            <div className="bg-3 rounded-card-strong border border-secondary-mint/30 p-xl shadow-card-soft" >
              <h3 className="text-Heading 2 text-text-dark-grey mb-lg flex items-center gap-sm" >
                <CheckCircle2 className="text-secondary-mint" size={24}/> 계약 내용 최종 확인
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl" >
                {/* 회원 정보 */}
                <div className="space-y-sm" >
                  <h4 className="text-Label font-bold text-text-grey-blue uppercase tracking-wider" >회원 정보</h4>
                  <div className="bg-bg-main-light-blue/40 rounded-card-normal p-md space-y-xs" >
                    <div className="flex justify-between text-Body 2" >
                      <span className="text-text-grey-blue" >이름</span>
                      <span className="font-semibold" >{selectedMember?.name}</span>
                    </div>
                    <div className="flex justify-between text-Body 2" >
                      <span className="text-text-grey-blue" >연락처</span>
                      <span >{selectedMember?.phone}</span>
                    </div>
                  </div>
                </div>
                {/* 계약 조건 */}
                <div className="space-y-sm" >
                  <h4 className="text-Label font-bold text-text-grey-blue uppercase tracking-wider" >계약 조건</h4>
                  <div className="bg-bg-main-light-blue/40 rounded-card-normal p-md space-y-xs" >
                    <div className="flex justify-between text-Body 2" >
                      <span className="text-text-grey-blue" >시작일</span>
                      <span >{contractDetails.startDate}</span>
                    </div>
                    <div className="flex justify-between text-Body 2" >
                      <span className="text-text-grey-blue" >서비스 일수</span>
                      <span >{contractDetails.serviceDays}일</span>
                    </div>
                    <div className="flex justify-between text-Body 2" >
                      <span className="text-text-grey-blue" >결제 수단</span>
                      <span >{{card:'신용카드',cash:'현금',transfer:'계좌이체',mileage:'마일리지'}[paymentMethod]}</span>
                    </div>
                  </div>
                </div>
                {/* 상품 목록 */}
                <div className="md:col-span-2 space-y-sm" >
                  <h4 className="text-Label font-bold text-text-grey-blue uppercase tracking-wider" >상품 목록</h4>
                  <div className="bg-bg-main-light-blue/40 rounded-card-normal overflow-hidden" >
                    {selectedProducts.map((p, i) => (
                      <div className={cn("flex justify-between items-center px-md py-sm text-Body 2", i > 0 && "border-t border-border-light")} key={i}>
                        <span >{p.name}</span>
                        <span className="font-semibold text-primary-coral" >{p.price.toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 금액 요약 */}
                <div className="md:col-span-2 space-y-sm" >
                  <h4 className="text-Label font-bold text-text-grey-blue uppercase tracking-wider" >금액 / 할인 내역</h4>
                  <div className="bg-bg-soft-peach rounded-card-normal p-md space-y-sm border border-primary-coral/10" >
                    <div className="flex justify-between text-Body 2" >
                      <span className="text-text-grey-blue" >원가 합계</span>
                      <span >{totalPrice.toLocaleString()}원</span>
                    </div>
                    {discountRateNum > 0 && (
                      <div className="flex justify-between text-Body 2 text-error" >
                        <span >
                          할인 ({DISCOUNT_TYPES.find(d => d.value === discountType)?.label ?? ''} {discountRateNum}%)
                          {discountReason && <span className="text-text-grey-blue ml-xs">— {discountReason}</span>}
                        </span>
                        <span >- {discountAmount.toLocaleString()}원</span>
                      </div>
                    )}
                    <div className="flex justify-between text-Body 1 font-bold border-t border-primary-coral/20 pt-sm" >
                      <span >최종 결제 금액</span>
                      <span className="text-primary-coral text-Heading 2" >{finalPrice.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-3 rounded-card-strong border border-border-light overflow-hidden shadow-card-soft" >
              <div className="bg-bg-main-light-blue p-lg border-b border-border-light flex justify-between items-center" >
                <h3 className="text-Heading 2 text-text-dark-grey" >계약서 미리보기</h3>
                <StatusBadge variant="info" label="전자계약 표준약관 준수"/>
              </div>
              <div className="p-xl space-y-lg min-h-[400px]" >
                <div className="text-center mb-xl" >
                  <h1 className="text-Heading 1 font-bold mb-md underline" >웰니스 센터 이용 계약서</h1>
                  <p className="text-text-grey-blue" >본 계약은 회원과 센터 간의 신뢰를 바탕으로 공정하게 작성되었습니다.</p>
                </div>

                <div className="grid grid-cols-2 gap-xl" >
                  <div className="space-y-md" >
                    <h4 className="font-bold text-text-dark-grey border-l-4 border-primary-coral pl-sm" >갑 (센터 정보)</h4>
                    <div className="text-Body 2 space-y-xs" >
                      <p >상호: 스포짐 종각점</p>
                      <p >대표: 김운영</p>
                      <p >주소: 서울특별시 종로구 종로 1길</p>
                    </div>
                  </div>
                  <div className="space-y-md" >
                    <h4 className="font-bold text-text-dark-grey border-l-4 border-secondary-mint pl-sm" >을 (회원 정보)</h4>
                    <div className="text-Body 2 space-y-xs" >
                      <p >이름: {selectedMember?.name}</p>
                      <p >연락처: {selectedMember?.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-xl" >
                  <h4 className="font-bold text-text-dark-grey mb-md" >계약 상품 내역</h4>
                  <table className="w-full border-collapse" >
                    <thead >
                      <tr className="bg-bg-main-light-blue/50" >
                        <th className="p-md text-left text-Label" >상품명</th>
                        <th className="p-md text-right text-Label" >금액</th>
                      </tr>
                    </thead>
                    <tbody >
                      {selectedProducts.map((p, i) => (
                        <tr className="border-b border-border-light" key={i}>
                          <td className="p-md text-Body 2" >{p.name}</td>
                          <td className="p-md text-right text-Body 2" >{p.price.toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-xl text-Label text-text-grey-blue space-y-xs" >
                  <p >제 1조 (목적) 본 계약은 센터가 제공하는 시설 및 서비스 이용에 관한 사항을 정의함...</p>
                  <p >제 2조 (환불 규정) 공정거래위원회 표준약관 및 소비자 분쟁 해결 기준에 따름...</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center" >
              <div className="w-full max-w-[600px] bg-bg-soft-peach rounded-card-strong p-xl border-2 border-primary-coral/30" >
                <div className="flex justify-between items-center mb-md" >
                  <h3 className="text-Heading 2 text-primary-coral flex items-center gap-sm" >
                    <PenTool size={24}/> 서명 패드
                  </h3>
                  <button className="text-Label text-text-grey-blue hover:text-error" >서명 지우기</button>
                </div>
                <div className="bg-3 h-[200px] rounded-card-normal border border-border-light flex items-center justify-center text-text-grey-blue cursor-crosshair" >
                  <p className="select-none" >여기에 서명해 주세요</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout >
      <div className="max-w-[1200px] mx-auto pb-xxl" >
        <PageHeader title="전자계약 등록" description="회원 선택부터 상품 결제, 전자서명까지 원스톱으로 진행합니다." actions={
            <div className="flex items-center gap-sm">
              <button
                onClick={() => moveToPage(970)}
                className="px-lg py-md rounded-button border border-border-light text-text-grey-blue hover:bg-3 transition-all"
              >
                취소
              </button>
            </div>
          }/>

        {/* Wizard Steps */}
        <div className="mb-xxl overflow-x-auto py-md" >
          <div className="flex items-center justify-between min-w-[800px] px-lg" >
            {steps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-sm relative z-10" >
                  <div
                    className={cn(
                      "w-[48px] h-[48px] rounded-full flex items-center justify-center transition-all duration-300",
                      step === s.id
                        ? "bg-primary-coral text-white shadow-lg shadow-primary-coral/30 scale-110"
                        : step > s.id
                          ? "bg-secondary-mint text-white"
                          : "bg-3 border border-border-light text-text-grey-blue"
                    )} >
                    {step > s.id ? <CheckCircle2 size={24}/> : <s.icon size={24}/>}
                  </div>
                  <span className={cn(
                    "text-Label font-bold transition-colors",
                    step === s.id ? "text-primary-coral" : "text-text-grey-blue"
                  )} >
                    {s.name}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-[2px] bg-border-light mx-sm relative -top-4" >
                    <div
                      className="absolute inset-0 bg-secondary-mint transition-all duration-500" style={{ width: step > s.id ? '100%' : '0%' }}/>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="min-h-[500px]" >
          {renderStepContent()}
        </div>

        {/* Navigation Footer */}
        <div className="mt-xxl pt-xl border-t border-border-light flex justify-between items-center" >
          <button
            className={cn(
              "flex items-center gap-sm px-xl py-lg rounded-button font-bold transition-all",
              step === 1
                ? "text-8 cursor-not-allowed"
                : "text-text-grey-blue hover:bg-3 hover:text-text-dark-grey"
            )} onClick={prevStep} disabled={step === 1}>
            <ChevronLeft size={20}/> 이전
          </button>

          {step < 5 ? (
            <button
              className="flex items-center gap-sm px-[48px] py-lg bg-primary-coral text-white rounded-button font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary-coral/20" onClick={nextStep}>
              다음 단계 <ChevronRight size={20}/>
            </button>
          ) : (
            <button
              className="flex items-center gap-sm px-[48px] py-lg bg-secondary-mint text-white rounded-button font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-secondary-mint/20" onClick={handleComplete}>
              계약 완료 및 서명 확인
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog open={showCompleteDialog} title="계약 등록 완료" description={`${selectedMember?.name} 회원의 전자계약이 성공적으로 등록되었습니다.\n회원 상세 페이지로 이동하시겠습니까?`} confirmLabel="회원 상세로 이동" cancelLabel="목록으로 이동" onConfirm={() => moveToPage(985)} onCancel={() => moveToPage(967)}/>
    </AppLayout>
  );
}
