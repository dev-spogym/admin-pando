
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Info, 
  Search, 
  UserPlus, 
  ShoppingCart, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Signature, 
  ChevronRight, 
  X,
  Edit2,
  Calendar,
  Clock,
  CheckCircle2
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import TabNav from '@/components/TabNav';
import { SearchFilter } from '@/components/SearchFilter';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';

// --- Mock Data ---

const MOCK_PRODUCTS: {
  id: number;
  name: string;
  category: string;
  subCategory: string;
  sport: string;
  period: string;
  count: string;
  cashPrice: number;
  cardPrice: number;
  kiosk: boolean;
  tags: string[];
  stock: number | null;
}[] = [
  {
    id: 1,
    name: '헬스 12개월 (연간 회원권)',
    category: '이용권',
    subCategory: '회원권',
    sport: '헬스',
    period: '12개월',
    count: '무제한',
    cashPrice: 660000,
    cardPrice: 726000,
    kiosk: true,
    tags: ['BRAND'],
    stock: null, // 이용권은 재고 없음
  },
  {
    id: 2,
    name: 'PT 30회 (1:1 개인레슨)',
    category: '이용권',
    subCategory: '수강권',
    sport: 'PT',
    period: '6개월',
    count: '30회',
    cashPrice: 1500000,
    cardPrice: 1650000,
    kiosk: false,
    tags: [],
    stock: 3, // 재고 경고 (5 이하)
  },
  {
    id: 3,
    name: '개인 락커 (대형)',
    category: '대여권',
    subCategory: '락커',
    sport: '기타',
    period: '1개월',
    count: '-',
    cashPrice: 10000,
    cardPrice: 11000,
    kiosk: true,
    tags: [],
    stock: 0, // 재고 없음 (비활성화)
  },
  {
    id: 4,
    name: '운동복 대여',
    category: '대여권',
    subCategory: '운동복',
    sport: '기타',
    period: '1개월',
    count: '무제한',
    cashPrice: 5000,
    cardPrice: 5500,
    kiosk: true,
    tags: [],
    stock: 12,
  },
  {
    id: 5,
    name: '회원권 양도비',
    category: '일반',
    subCategory: '양도비',
    sport: '기타',
    period: '-',
    count: '-',
    cashPrice: 30000,
    cardPrice: 33000,
    kiosk: false,
    tags: [],
    stock: null,
  },
  {
    id: 6,
    name: '필라테스 20회 (그룹)',
    category: '이용권',
    subCategory: '수강권',
    sport: 'G.X',
    period: '3개월',
    count: '20회',
    cashPrice: 400000,
    cardPrice: 440000,
    kiosk: true,
    tags: [],
    stock: 4, // 재고 경고 (5 이하)
  }
];

const MOCK_MEMBERS = [
  { id: 1, name: '김태희', phone: '010-1234-5678', attendanceNo: '1234', mileage: 5000 },
  { id: 2, name: '이병헌', phone: '010-2345-6789', attendanceNo: '2345', mileage: 12000 },
  { id: 3, name: '정우성', phone: '010-3456-7890', attendanceNo: '3456', mileage: 0 },
];

const MOCK_DISCOUNTS = [
  { id: 1, label: '재등록 5% 할인', value: 0.05 },
  { id: 2, label: '지인 동반 10% 할인', value: 0.10 },
  { id: 3, label: '프로모션 20,000원 할인', value: 20000, type: 'fixed' },
];

// --- Sub-components ---

interface CartItem {
  cartId: string;
  id: number;
  name: string;
  category: string;
  subCategory: string;
  sport: string;
  period: string;
  count: string;
  cashPrice: number;
  cardPrice: number;
  kiosk: boolean;
  tags: string[];
  priceType: string;
  startDate: string;
  discount: number;
}

interface MockMember {
  id: number;
  name: string;
  phone: string;
  attendanceNo: string;
  mileage: number;
}

const ProductCard = ({ product, onAdd }: { product: typeof MOCK_PRODUCTS[number]; onAdd: (p: typeof MOCK_PRODUCTS[number]) => void }) => {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock !== null && product.stock > 0 && product.stock <= 5;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-card-normal border bg-white p-md shadow-card-soft transition-all",
        isOutOfStock
          ? "border-border-light opacity-50 cursor-not-allowed grayscale"
          : "border-border-light hover:border-primary-coral hover:shadow-md cursor-pointer"
      )}
      onClick={() => { if (!isOutOfStock) onAdd(product); }}
    >
      <div className="flex items-center justify-between mb-sm" >
        <div className="flex gap-xs flex-wrap" >
          <StatusBadge className="bg-bg-main-light-blue text-text-grey-blue" variant="default">
            {product.sport}
          </StatusBadge>
          <StatusBadge variant={product.subCategory === '회원권' ? 'success' : product.subCategory === '수강권' ? 'info' : 'warning'}>
            {product.subCategory}
          </StatusBadge>
          {product.tags.includes('BRAND') && (
            <StatusBadge variant="error" label="BRAND"/>
          )}
        </div>
        <button className="text-text-grey-blue hover:text-primary-coral" >
          <X className="opacity-0 group-hover:opacity-100 transition-opacity" size={16}/>
        </button>
      </div>

      {/* 재고 배지 */}
      {product.stock !== null && (
        <div className="mb-xs">
          {isOutOfStock && (
            <span className="inline-flex items-center gap-xs px-xs py-[2px] rounded-full bg-error/10 text-error text-[10px] font-bold">
              품절
            </span>
          )}
          {isLowStock && (
            <span className="inline-flex items-center gap-xs px-xs py-[2px] rounded-full bg-warning/10 text-warning text-[10px] font-bold">
              재고 부족 ({product.stock}개)
            </span>
          )}
          {!isOutOfStock && !isLowStock && (
            <span className="inline-flex items-center gap-xs px-xs py-[2px] rounded-full bg-success/10 text-success text-[10px] font-bold">
              재고 {product.stock}개
            </span>
          )}
        </div>
      )}

      <h4 className="text-Body-1 font-bold text-text-dark-grey mb-xs line-clamp-1" >{product.name}</h4>

      <div className="flex flex-col gap-1 mb-md" >
        <div className="flex items-center gap-xs text-Label text-text-grey-blue" >
          <Calendar size={14}/>
          <span >기간: {product.period}</span>
        </div>
        <div className="flex items-center gap-xs text-Label text-text-grey-blue" >
          <Clock size={14}/>
          <span >횟수: {product.count}</span>
        </div>
      </div>

      <div className="mt-auto pt-md border-t border-dashed border-border-light" >
        <div className="flex justify-between items-baseline" >
          <span className="text-Label text-text-grey-blue" >현금가</span>
          <span className="text-Body-1 font-bold text-primary-coral" >{product.cashPrice.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between items-baseline mt-xs" >
          <span className="text-Label text-text-grey-blue" >카드가</span>
          <span className="text-Body-2 font-semibold text-text-dark-grey" >{product.cardPrice.toLocaleString()}원</span>
        </div>
      </div>

      {!isOutOfStock && (
        <div className="absolute inset-0 bg-primary-coral/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-card-normal flex items-center justify-center pointer-events-none" >
          <div className="bg-white rounded-full p-sm shadow-md text-primary-coral" >
            <Plus size={24}/>
          </div>
        </div>
      )}

      {isOutOfStock && (
        <div className="absolute inset-0 bg-white/60 rounded-card-normal flex items-center justify-center pointer-events-none" >
          <span className="px-md py-xs bg-error text-white text-Label font-bold rounded-full shadow">품절</span>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

export default function SalesPos() {
  // State: Wizard & UI
  const [activeTab, setActiveTab] = useState('이용권');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: 회원검색, 2: 상품선택, 3: 계약조건, 4: 결제, 5: 서명
  
  // State: Cart & Selection
  const [selectedMember, setSelectedMember] = useState<MockMember | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [memberSearchValue, setMemberSearchValue] = useState('');
  
  // State: Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Derived Data
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter(p => {
      const matchTab = p.category === activeTab;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [activeTab, searchQuery]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.priceType === 'cash' ? item.cashPrice : item.cardPrice), 0);
  }, [cart]);

  // Handlers
  const handleAddToCart = (product: typeof MOCK_PRODUCTS[number]) => {
    if (!selectedMember) {
      alert('먼저 회원을 검색해주세요.');
      return;
    }
    const newItem = {
      ...product,
      cartId: Math.random().toString(36).substr(2, 9),
      priceType: 'cash', // Default price type
      startDate: new Date().toISOString().split('T')[0],
      discount: 0
    };
    setCart([...cart, newItem]);
    if (currentStep < 3) setCurrentStep(3);
  };

  const handleRemoveFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const handleMemberSelect = (member: MockMember) => {
    setSelectedMember(member);
    setMemberSearchValue('');
    setCurrentStep(2);
  };

  const handleNextStep = () => {
    if (currentStep === 4) {
      setShowSignatureModal(true);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handlePaymentStart = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  };

  const handleCompleteContract = () => {
    setShowSignatureModal(false);
    setCurrentStep(5);
    // Success redirect or state
    alert('계약이 완료되었습니다.');
    moveToPage(970); // 매출 현황으로 이동
  };

  return (
    <AppLayout >
      <div className="flex flex-col gap-lg" >
        {/* Page Header */}
        <PageHeader title="매출 상세/결제 (POS)" description="상품 조회 및 현장 결제를 위한 통합 시스템" actions={
            <div className="flex gap-sm">
              <button 
                className="flex items-center gap-xs px-md py-sm bg-bg-soft-peach text-primary-coral hover:bg-primary-coral hover:text-white transition-all rounded-button text-Label font-semibold"
                onClick={() => moveToPage(987)}
              >
                <Plus size={16} />
                상품 생성
              </button>
              <button 
                className="flex items-center gap-xs px-md py-sm border border-error text-error hover:bg-error hover:text-white transition-all rounded-button text-Label font-semibold"
                onClick={() => setIsConfirmOpen(true)}
              >
                <Trash2 size={16} />
                상품 삭제
              </button>
              <button className="p-sm text-text-grey-blue hover:text-secondary-mint transition-colors">
                <Info size={20} />
              </button>
            </div>
          }/>

        {/* 5-Step Wizard Progress */}
        <div className="flex items-center justify-between px-xl py-lg bg-white rounded-card-normal border border-border-light shadow-card-soft" >
          {[
            { step: 1, label: '회원 검색', icon: Search },
            { step: 2, label: '상품 선택', icon: ShoppingCart },
            { step: 3, label: '계약 조건', icon: Edit2 },
            { step: 4, label: '결제 진행', icon: CreditCard },
            { step: 5, label: '전자서명', icon: Signature },
          ].map((item, idx) => (
            <React.Fragment key={item.step}>
              <div className="flex flex-col items-center gap-xs relative" >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  currentStep >= item.step 
                    ? "bg-primary-coral text-white shadow-lg shadow-primary-coral/20" 
                    : "bg-bg-main-light-blue text-text-grey-blue"
                )} >
                  <item.icon size={20}/>
                </div>
                <span className={cn(
                  "text-Label font-bold",
                  currentStep >= item.step ? "text-primary-coral" : "text-text-grey-blue"
                )} >
                  {item.label}
                </span>
                {currentStep > item.step && (
                  <div className="absolute -top-1 -right-1 bg-success text-white rounded-full p-[2px]" >
                    <CheckCircle2 size={12}/>
                  </div>
                )}
              </div>
              {idx < 4 && (
                <div className={cn(
                  "flex-1 h-[2px] mx-md transition-all duration-500",
                  currentStep > item.step ? "bg-primary-coral" : "bg-border-light"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main Content: Split Layout */}
        <div className="flex flex-col lg:flex-row gap-lg" >
          
          {/* Left: Product List (70%) */}
          <div className="flex-1 space-y-lg" >
            {/* Filters & Tabs */}
            <div className="bg-white rounded-card-normal border border-border-light p-md shadow-card-soft" >
              <div className="flex flex-col md:flex-row gap-md justify-between items-center mb-md" >
                <TabNav
                  className="border-none p-0" tabs={[
                    { key: '이용권', label: '이용권', count: MOCK_PRODUCTS.filter(p => p.category === '이용권').length },
                    { key: '대여권', label: '대여권', count: MOCK_PRODUCTS.filter(p => p.category === '대여권').length },
                    { key: '일반', label: '일반', count: MOCK_PRODUCTS.filter(p => p.category === '일반').length },
                  ]} activeTab={activeTab} onTabChange={setActiveTab}/>
                <div className="flex items-center gap-sm w-full md:w-auto" >
                  <div className="relative flex-1 md:w-[240px]" >
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
                    <input
                      className="w-full pl-10 pr-4 py-2 bg-input-bg-light border border-border-light rounded-button text-Body-2 focus:border-secondary-mint outline-none transition-all" type="text" placeholder="상품명 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
                  </div>
                  <select className="bg-white border border-border-light rounded-button px-sm py-2 text-Body-2 text-text-dark-grey outline-none focus:border-secondary-mint" >
                    <option >종목 전체</option>
                    <option >G.X</option>
                    <option >헬스</option>
                    <option >PT</option>
                  </select>
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md h-[calc(100vh-450px)] overflow-y-auto pr-xs scrollbar-hide" >
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} onAdd={handleAddToCart}/>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-xxl gap-md" >
                    <div className="bg-bg-soft-peach p-xl rounded-full text-primary-coral" >
                      <ShoppingCart size={48}/>
                    </div>
                    <p className="text-Body-1 text-text-grey-blue" >해당 카테고리에 등록된 상품이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Cart & Payment Panel (30%) */}
          <div className="w-full lg:w-[400px] flex flex-col gap-lg" >
            
            {/* Member Search Section */}
            <div className="bg-white rounded-card-normal border border-border-light p-lg shadow-card-soft" >
              <h3 className="text-Heading-2 text-text-dark-grey mb-md flex items-center gap-sm" >
                <UserPlus className="text-secondary-mint" size={22}/>
                회원 검색
              </h3>
              
              {selectedMember ? (
                <div className="flex items-center justify-between p-md bg-bg-soft-mint rounded-card-normal border border-secondary-mint/20" >
                  <div className="flex items-center gap-md" >
                    <div className="w-12 h-12 rounded-full bg-secondary-mint flex items-center justify-center text-white font-bold" >
                      {selectedMember.name[0]}
                    </div>
                    <div >
                      <div className="flex items-center gap-xs" >
                        <span className="font-bold text-text-dark-grey" >{selectedMember.name}</span>
                        <StatusBadge variant="info" label={`#${selectedMember.attendanceNo}`}/>
                      </div>
                      <p className="text-Label text-text-grey-blue" >{selectedMember.phone}</p>
                    </div>
                  </div>
                  <button 
                    className="text-text-grey-blue hover:text-error" onClick={() => {
                      setSelectedMember(null);
                      setCart([]);
                      setCurrentStep(1);
                    }}>
                    <X size={20}/>
                  </button>
                </div>
              ) : (
                <div className="space-y-md" >
                  <div className="relative" >
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
                    <input
                      className="w-full pl-10 pr-4 py-3 bg-input-bg-light border border-border-light rounded-button text-Body-2 focus:border-secondary-mint outline-none" type="text" placeholder="이름, 연락처, 출석번호..." value={memberSearchValue} onChange={(e) => setMemberSearchValue(e.target.value)}/>
                  </div>
                  {memberSearchValue.length > 0 && (
                    <div className="absolute z-10 w-[calc(100%-48px)] max-w-[352px] bg-white border border-border-light rounded-card-normal shadow-xl mt-1 overflow-hidden" >
                      {MOCK_MEMBERS.filter(m => m.name.includes(memberSearchValue) || m.phone.includes(memberSearchValue)).map(m => (
                        <div
                          className="p-md hover:bg-bg-main-light-blue cursor-pointer flex justify-between items-center transition-colors border-b border-border-light last:border-0" key={m.id} onClick={() => handleMemberSelect(m)}>
                          <div >
                            <p className="font-bold text-text-dark-grey" >{m.name}</p>
                            <p className="text-Label text-text-grey-blue" >{m.phone}</p>
                          </div>
                          <ChevronRight className="text-text-grey-blue" size={18}/>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-Label text-text-grey-blue text-center" >계약 대상 회원을 먼저 검색해주세요.</p>
                </div>
              )}
            </div>

            {/* Cart Section */}
            <div className="flex-1 bg-white rounded-card-normal border border-border-light flex flex-col shadow-card-soft overflow-hidden min-h-[400px]" >
              <div className="p-lg border-b border-border-light flex justify-between items-center bg-bg-main-light-blue/20" >
                <h3 className="text-Heading-2 text-text-dark-grey flex items-center gap-sm" >
                  <ShoppingCart className="text-primary-coral" size={22}/>
                  결제 상품
                  <span className="text-primary-coral text-Body-1" >({cart.length})</span>
                </h3>
                {cart.length > 0 && (
                  <button className="text-Label text-text-grey-blue hover:text-primary-coral font-semibold" >일괄 변경</button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-md space-y-md" >
                {cart.length > 0 ? (
                  cart.map((item) => (
                    <div className="group relative bg-white border border-border-light rounded-card-normal p-md shadow-sm hover:border-primary-coral/50 transition-all" key={item.cartId}>
                      <div className="flex justify-between items-start mb-sm" >
                        <div className="flex-1" >
                          <StatusBadge className="text-[10px] py-0 mb-xs" variant="default">{item.subCategory}</StatusBadge>
                          <h4 className="font-bold text-text-dark-grey text-Body-2" >{item.name}</h4>
                        </div>
                        <button 
                          className="text-text-grey-blue hover:text-error p-1" onClick={() => handleRemoveFromCart(item.cartId)}>
                          <Trash2 size={16}/>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-md" >
                        <div className="flex flex-col" >
                          <span className="text-[10px] text-text-grey-blue" >시작일</span>
                          <input className="text-Label border-none p-0 outline-none font-semibold text-text-dark-grey" type="date" defaultValue={item.startDate}/>
                        </div>
                        <div className="flex flex-col text-right" >
                          <span className="text-[10px] text-text-grey-blue" >할인</span>
                          <select className="text-Label border-none p-0 outline-none font-semibold text-text-dark-grey appearance-none bg-transparent" >
                            <option >할인 없음</option>
                            {MOCK_DISCOUNTS.map(d => <option key={d.id}>{d.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-sm border-t border-dashed border-border-light" >
                        <div className="flex gap-2" >
                          <button 
                            className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold transition-colors",
                              item.priceType === 'cash' ? "bg-primary-coral text-white" : "bg-bg-main-light-blue text-text-grey-blue"
                            )} onClick={() => {
                              const newCart = cart.map(c => c.cartId === item.cartId ? { ...c, priceType: 'cash' } : c);
                              setCart(newCart);
                            }}>
                            현금
                          </button>
                          <button 
                            className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold transition-colors",
                              item.priceType === 'card' ? "bg-primary-coral text-white" : "bg-bg-main-light-blue text-text-grey-blue"
                            )} onClick={() => {
                              const newCart = cart.map(c => c.cartId === item.cartId ? { ...c, priceType: 'card' } : c);
                              setCart(newCart);
                            }}>
                            카드
                          </button>
                        </div>
                        <span className="font-bold text-text-dark-grey" >
                          {(item.priceType === 'cash' ? item.cashPrice : item.cardPrice).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-sm opacity-50" >
                    <ShoppingCart className="text-text-grey-blue" size={40}/>
                    <p className="text-Body-2" >장바구니가 비어 있습니다.</p>
                  </div>
                )}
              </div>

              {/* Summary & Checkout Button */}
              <div className="p-lg bg-bg-soft-peach/30 border-t border-border-light space-y-md" >
                <div className="flex justify-between items-center" >
                  <span className="text-Body-1 text-text-grey-blue" >총 합계</span>
                  <span className="text-Heading-1 font-bold text-primary-coral" >{totalAmount.toLocaleString()}원</span>
                </div>
                
                <button 
                  className={cn(
                    "w-full py-xl rounded-button text-Heading-2 font-bold transition-all shadow-lg flex items-center justify-center gap-sm",
                    cart.length > 0 
                      ? "bg-primary-coral text-white hover:scale-[1.02] active:scale-[0.98] shadow-primary-coral/30" 
                      : "bg-border-light text-text-grey-blue cursor-not-allowed"
                  )} disabled={cart.length === 0} onClick={handlePaymentStart}>
                  <CreditCard size={24}/>
                  결제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md" >
          <div className="w-full max-w-xl bg-white rounded-modal shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" >
            <div className="p-xl border-b border-border-light flex justify-between items-center bg-bg-soft-mint/30" >
              <h3 className="text-Heading-2 text-text-dark-grey flex items-center gap-sm" >
                <CreditCard className="text-secondary-mint" size={24}/>
                결제 수단 선택
              </h3>
              <button className="text-text-grey-blue hover:text-text-dark-grey" onClick={() => setShowPaymentModal(false)}>
                <X size={24}/>
              </button>
            </div>
            
            <div className="p-xl grid grid-cols-2 gap-md" >
              <PaymentOption icon={<CreditCard size={32} />} label="수기 카드 등록" sub="단말기 없이 번호로 결제" color="coral" onClick={() => { setCurrentStep(4); setShowPaymentModal(false); handleNextStep(); }}/>
              <PaymentOption icon={<CreditCard size={32} />} label="카드 단말기 연동" sub="단말기 태깅 결제" color="mint" onClick={() => { setCurrentStep(4); setShowPaymentModal(false); handleNextStep(); }}/>
              <PaymentOption icon={<Banknote size={32} />} label="계좌이체 / 현금" sub="수동 매출 등록" color="peach" onClick={() => { setCurrentStep(4); setShowPaymentModal(false); handleNextStep(); }}/>
              <PaymentOption icon={<Wallet size={32} />} label="마일리지 결제" sub={`보유: ${selectedMember?.mileage.toLocaleString()} P`} color="blue" onClick={() => { setCurrentStep(4); setShowPaymentModal(false); handleNextStep(); }}/>
            </div>

            <div className="p-lg bg-bg-main-light-blue/20 flex flex-col gap-sm" >
              <div className="flex justify-between items-center" >
                <span className="text-Body-2 text-text-grey-blue" >결제할 총 금액</span>
                <span className="text-Heading-2 font-bold text-primary-coral" >{totalAmount.toLocaleString()}원</span>
              </div>
              <p className="text-Label text-center text-text-grey-blue mt-sm" >결제 방식에 따라 PG 수수료가 발생할 수 있습니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-md" >
          <div className="w-full max-w-2xl bg-white rounded-modal shadow-2xl overflow-hidden" >
            <div className="p-xl border-b border-border-light flex justify-between items-center" >
              <h3 className="text-Heading-2 text-text-dark-grey flex items-center gap-sm" >
                <Signature className="text-primary-coral" size={24}/>
                회원 전자서명
              </h3>
              <button className="text-text-grey-blue hover:text-text-dark-grey" onClick={() => setShowSignatureModal(false)}>
                <X size={24}/>
              </button>
            </div>
            
            <div className="p-xl space-y-lg" >
              <div className="bg-bg-main-light-blue rounded-card-normal p-lg border border-border-light" >
                <h4 className="text-Body-1 font-bold mb-md" >이용 약관 및 개인정보 처리방침 동의</h4>
                <div className="h-[200px] bg-white border border-border-light rounded-button overflow-y-auto p-md text-Body-2 text-text-grey-blue" >
                  [필독] 웰니스 센터 이용 규칙 안내...
                  1. 환불 규정: 이용 개시 후 10% 위약금...
                  2. 양도: 양도비 30,000원 발생...
                  3. 일시 정지: 최대 2회 지원...
                  (생략)
                </div>
                <div className="mt-md flex items-center gap-sm" >
                  <input className="w-5 h-5 accent-primary-coral" type="checkbox" id="agree"/>
                  <label className="text-Body-2 font-semibold" htmlFor="agree">위 모든 내용을 확인했으며 동의합니다.</label>
                </div>
              </div>

              <div className="space-y-sm" >
                <p className="text-Label text-text-grey-blue text-center" >아래 사각형 영역 내에 서명해 주세요.</p>
                <div className="h-[240px] w-full bg-input-bg-light border-2 border-dashed border-border-light rounded-card-normal flex flex-col items-center justify-center relative cursor-crosshair" >
                  <Signature className="text-border-light" size={64}/>
                  <p className="text-Label text-text-grey-blue mt-sm font-bold" >SIGN HERE</p>
                  {/* Signature Pad Area (Placeholder) */}
                </div>
                <div className="flex justify-end gap-sm" >
                  <button className="px-md py-sm text-Label text-text-grey-blue hover:text-primary-coral transition-colors" >지우기</button>
                </div>
              </div>
            </div>

            <div className="p-xl border-t border-border-light flex gap-md" >
              <button 
                className="flex-1 py-lg bg-bg-soft-peach text-primary-coral rounded-button font-bold text-Body-1 hover:bg-primary-coral hover:text-white transition-all" onClick={() => setShowSignatureModal(false)}>
                이전 단계
              </button>
              <button 
                className="flex-1 py-lg bg-primary-coral text-white rounded-button font-bold text-Body-1 shadow-lg shadow-primary-coral/20 hover:scale-[1.02] active:scale-[0.98] transition-all" onClick={handleCompleteContract}>
                계약 완료 및 서명 제출
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog (Sample) */}
      <ConfirmDialog open={isConfirmOpen} title="상품 삭제 확인" description="정말로 선택한 상품을 삭제하시겠습니까? 삭제된 상품은 복구할 수 없습니다." confirmLabel="삭제하기" variant="danger" confirmationText="삭제" onConfirm={() => setIsConfirmOpen(false)} onCancel={() => setIsConfirmOpen(false)}/>
    </AppLayout>
  );
}

// --- Helper Components ---

const PaymentOption = ({ icon, label, sub, color, onClick }: { icon: React.ReactNode; label: string; sub: string; color: 'coral' | 'mint' | 'peach' | 'blue'; onClick: () => void }) => {
  const colors = {
    coral: "bg-bg-soft-peach border-primary-coral/20 text-primary-coral hover:bg-primary-coral hover:text-white",
    mint: "bg-bg-soft-mint border-secondary-mint/20 text-secondary-mint hover:bg-secondary-mint hover:text-white",
    peach: "bg-[#FFF9F0] border-[#FFB347]/20 text-[#FFB347] hover:bg-[#FFB347] hover:text-white",
    blue: "bg-bg-main-light-blue border-information/20 text-information hover:bg-information hover:text-white"
  };

  return (
    <button 
      className={cn(
        "flex flex-col items-center justify-center p-xl rounded-card-normal border transition-all duration-300 gap-md group",
        colors[color]
      )} onClick={onClick}>
      <div className="transition-transform group-hover:scale-110" >
        {icon}
      </div>
      <div className="text-center" >
        <p className="font-bold text-Body-1" >{label}</p>
        <p className="text-[10px] opacity-80 mt-1" >{sub}</p>
      </div>
    </button>
  );
};
