import React, { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  ShoppingCart, 
  User, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  ArrowRightLeft, 
  RotateCcw,
  CheckCircle2,
  Printer,
  MessageSquare,
  ChevronRight,
  X,
  PlusCircle,
  MinusCircle,
  Tag,
  Gift
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import StatusBadge from "@/components/StatusBadge";
import { moveToPage } from "@/internal";

// --- Mock Data ---

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "membership", label: "이용권" },
  { key: "lesson", label: "수강권" },
  { key: "locker", label: "락커" },
  { key: "etc", label: "기타상품" },
];

const PRODUCTS = [
  { id: 1, category: "membership", name: "헬스 3개월권", price: 330000, salePrice: 297000, stock: null, image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop" },
  { id: 2, category: "membership", name: "헬스 12개월권", price: 1320000, salePrice: 660000, stock: null, image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=300&fit=crop" },
  { id: 3, category: "lesson", name: "1:1 PT 10회", price: 880000, salePrice: 800000, stock: 5, image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop" },
  { id: 4, category: "lesson", name: "1:1 PT 30회", price: 2640000, salePrice: 2100000, stock: 2, image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&h=300&fit=crop" },
  { id: 5, category: "lesson", name: "그룹 필라테스 20회", price: 440000, salePrice: 396000, stock: null, image: "https://images.unsplash.com/photo-1518611012118-2960c8bad48d?w=400&h=300&fit=crop" },
  { id: 6, category: "locker", name: "개인 락커 1개월", price: 22000, salePrice: 20000, stock: 15, image: "https://images.unsplash.com/photo-1520694478166-daafe99c1d96?w=400&h=300&fit=crop" },
  { id: 7, category: "etc", name: "스포츠 타올", price: 5500, salePrice: 5000, stock: 48, image: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=400&h=300&fit=crop" },
  { id: 8, category: "etc", name: "프로틴 쉐이크", price: 4500, salePrice: 4000, stock: 102, image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop" },
];

const MEMBERS = [
  { id: 1, name: "홍길동", phone: "010-1234-5678", mileage: 12500 },
  { id: 2, name: "김철수", phone: "010-8765-4321", mileage: 3400 },
  { id: 3, name: "이영희", phone: "010-5555-6666", mileage: 0 },
];

// --- Sub Components ---

const ProductCard = ({ product, onAdd }: { product: any; onAdd: (p: any) => void }) => {
  return (
    <button
      className="group flex flex-col bg-2 rounded-3 border border-default overflow-hidden hover:border-0 hover:shadow-2 transition-all text-left" onClick={() => onAdd(product)}>
      <div className="relative h-32 w-full bg-3" >
        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={product.image} alt={product.name}/>
        {product.stock !== null && (
          <div className="absolute top-2 right-2" >
            <StatusBadge variant={product.stock < 5 ? "error" : "success"} dot={true}>
              재고 {product.stock}
            </StatusBadge>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1" >
        <h4 className="text-Section-Title text-5 truncate leading-1.4" >{product.name}</h4>
        <div className="flex items-center justify-between" >
          <div className="flex flex-col" >
            <span className="text-Data-Monospace-Tabular text-7 line-through text-[11px]" >₩{product.price.toLocaleString()}</span>
            <span className="text-Data-Monospace-Tabular text-0 font-bold text-16" >₩{product.salePrice.toLocaleString()}</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-0/10 flex items-center justify-center text-0 group-hover:bg-0 group-hover:text-2 transition-colors" >
            <Plus size={16} strokeWidth={2}/>
          </div>
        </div>
      </div>
    </button>
  );
};

// --- Main View ---

export default function PosPayment() {
  const [activeTab, setActiveTab] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [mileageToUse, setMileageToUse] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [isMixedPaymentModalOpen, setIsMixedPaymentModalOpen] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "transfer" | "mixed">("card");
  
  // Mixed Payment States
  const [mixedCard, setMixedCard] = useState(0);
  const [mixedCash, setMixedCash] = useState(0);
  const [mixedTransfer, setMixedTransfer] = useState(0);

  // Cart Logic
  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setMileageToUse(0);
    setCashReceived(0);
  };

  // Calculations
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0), [cart]);
  const vat = Math.floor(subtotal * 0.1);
  const totalAmount = subtotal + vat;
  const finalAmount = Math.max(0, totalAmount - mileageToUse);
  const changeAmount = Math.max(0, cashReceived - finalAmount);

  // Filtering
  const filteredProducts = PRODUCTS.filter(p => {
    const matchesTab = activeTab === "all" || p.category === activeTab;
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const memberSearchResults = useMemo(() => {
    if (!memberSearch) return [];
    return MEMBERS.filter(m => 
      m.name.includes(memberSearch) || m.phone.includes(memberSearch)
    );
  }, [memberSearch]);

  const handlePaymentConfirm = () => {
    // API Call Mock
    console.log("Processing payment...", {
      memberId: selectedMember?.id,
      items: cart,
      totalAmount: finalAmount,
      method: paymentMethod,
      mileageUsed: mileageToUse
    });
    
    setIsSuccessState(true);
  };

  const resetPos = () => {
    clearCart();
    setSelectedMember(null);
    setMemberSearch("");
    setIsSuccessState(false);
    setPaymentMethod("card");
  };

  // Mixed Payment Logic
  useEffect(() => {
    if (isMixedPaymentModalOpen) {
      setMixedCard(finalAmount);
      setMixedCash(0);
      setMixedTransfer(0);
    }
  }, [isMixedPaymentModalOpen, finalAmount]);

  const mixedTotal = mixedCard + mixedCash + mixedTransfer;
  const isMixedMatched = mixedTotal === finalAmount;

  if (isSuccessState) {
    return (
      <AppLayout >
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-2 rounded-card-strong shadow-2 p-xxl border border-default animate-in fade-in zoom-in duration-500" >
          <div className="w-20 h-20 bg-12/10 rounded-full flex items-center justify-center text-12 mb-xl" >
            <CheckCircle2 size={48} strokeWidth={1.5}/>
          </div>
          <h2 className="text-KPI-Large text-5 mb-4 font-bold" >결제가 완료되었습니다</h2>
          <p className="text-Body-Primary-KR text-6 mb-10 text-center leading-1.7 break-keep" >
            홍길동 회원님의 결제가 정상적으로 처리되었습니다.<br />
            영수증 및 계약서를 발송하시겠습니까?
          </p>
          
          <div className="grid grid-cols-2 gap-6 w-full max-w-md mb-10" >
            <button className="flex flex-col items-center justify-center p-6 rounded-3 border border-default hover:border-0 hover:bg-4 transition-all gap-2 group" >
              <Printer className="text-0 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5}/>
              <span className="text-13px font-500 text-5" >영수증 출력</span>
            </button>
            <button className="flex flex-col items-center justify-center p-6 rounded-3 border border-default hover:border-12 hover:bg-12/5 transition-all gap-2 group" >
              <MessageSquare className="text-12 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5}/>
              <span className="text-13px font-500 text-5" >문자 영수증 발송</span>
            </button>
          </div>

          <div className="flex gap-4" >
            <button
              className="px-8 py-3 rounded-2 bg-3 text-5 font-500 hover:bg-4 transition-colors" onClick={resetPos}>
              계속 판매하기
            </button>
            <button
              className="px-8 py-3 rounded-2 bg-0 text-2 font-500 hover:bg-0/90 transition-all shadow-md shadow-0/20 flex items-center gap-2" onClick={() => moveToPage(977)}>
              전자계약 이동
              <ChevronRight size={18} strokeWidth={1.5}/>
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout >
      <div className="flex flex-col h-[calc(100vh-140px)] bg-1" >
        <div className="px-6 py-4" >
          <PageHeader title="POS 결제 (현장판매)" description="현장에서 상품 및 이용권을 즉시 판매하고 결제합니다." actions={
              <button 
                onClick={() => {
                  if (confirm("모든 정보를 초기화하시겠습니까?")) {
                    resetPos();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-2 border border-default rounded-2 text-12px font-500 text-6 hover:text-14 hover:border-14 transition-all shadow-sm"
              >
                <RotateCcw size={14} strokeWidth={1.5} />
                전체 초기화
              </button>
            }/>
        </div>

        <div className="flex flex-1 gap-6 px-6 pb-6 overflow-hidden" >
          {/* Left: Product Selection (60%) */}
          <div className="flex-[0.6] flex flex-col gap-6 bg-2 rounded-3 border border-default p-6 overflow-hidden shadow-1" >
            <div className="flex flex-col gap-6" >
              {/* Member Search */}
              <div className="relative" >
                <div className="flex items-center bg-3 rounded-2 px-4 py-3 border border-default focus-within:border-0 focus-within:ring-2 focus-within:ring-0/20 transition-all" >
                  <User className="text-7 mr-3" size={18} strokeWidth={1.5}/>
                  <input
                    className="bg-transparent border-none outline-none w-full text-Body-Primary-KR text-5 placeholder:text-7" type="text" placeholder="회원 이름 또는 전화번호 뒷자리 검색..." value={memberSearch} onChange={(e) => {
                      setMemberSearch(e.target.value);
                      if (selectedMember) setSelectedMember(null);
                    }}/>
                  {selectedMember && (
                    <button className="text-7 hover:text-14" onClick={() => { setSelectedMember(null); setMemberSearch(""); }}>
                      <X size={18} strokeWidth={1.5}/>
                    </button>
                  )}
                </div>

                {/* Member Search Results Dropdown */}
                {!selectedMember && memberSearch && memberSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-2 border border-default rounded-3 shadow-4 max-h-60 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200" >
                    {memberSearchResults.map(m => (
                      <button
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-4 transition-colors border-b border-default last:border-0" key={m.id} onClick={() => {
                          setSelectedMember(m);
                          setMemberSearch(m.name);
                        }}>
                        <div className="flex items-center gap-4" >
                          <div className="w-10 h-10 rounded-full bg-0/10 flex items-center justify-center text-0 font-bold" >
                            {m.name[0]}
                          </div>
                          <div className="flex flex-col text-left" >
                            <span className="text-Body-Primary-KR font-600 text-5" >{m.name}</span>
                            <span className="text-12px text-6 font-monospace" >{m.phone}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end" >
                          <span className="text-11px uppercase tracking-wider text-7" >보유 마일리지</span>
                          <span className="text-Data-Monospace-Tabular font-bold text-12" >{m.mileage.toLocaleString()} P</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category & Search */}
              <div className="flex items-center justify-between gap-6 border-b border-default pb-2" >
                <TabNav
                  className="border-b-0" tabs={CATEGORIES} activeTab={activeTab} onTabChange={setActiveTab}/>
                <div className="flex items-center bg-3 rounded-full px-4 py-2 border border-default focus-within:border-0 focus-within:ring-2 focus-within:ring-0/20 transition-all" >
                  <Search className="text-7 mr-2" size={16} strokeWidth={1.5}/>
                  <input
                    className="bg-transparent border-none outline-none w-32 md:w-48 text-13px text-5 placeholder:text-7" type="text" placeholder="상품명 검색" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}/>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide" >
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pb-6" >
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAdd={addToCart}/>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-7" >
                    <Search className="mb-4 opacity-10" size={64} strokeWidth={1}/>
                    <p className="text-Body-Primary-KR" >검색 결과가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Cart & Payment (40%) */}
          <div className="flex-[0.4] flex flex-col gap-6" >
            {/* Cart Section */}
            <div className="flex-1 flex flex-col bg-2 rounded-3 border border-default shadow-1 overflow-hidden" >
              <div className="px-6 py-4 border-b border-default flex items-center justify-between bg-3/50" >
                <div className="flex items-center gap-2" >
                  <ShoppingCart className="text-0" size={20} strokeWidth={1.5}/>
                  <h3 className="text-Section-Title text-5" >장바구니</h3>
                  <div className="bg-0/10 text-0 text-11px font-bold px-2 py-0.5 rounded-full" >{cart.length}</div>
                </div>
                <button className="text-12px font-500 text-6 hover:text-14 flex items-center gap-1 transition-colors" onClick={clearCart}>
                  <Trash2 size={14} strokeWidth={1.5}/>
                  전체삭제
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 scrollbar-hide" >
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-7 opacity-30" >
                    <ShoppingCart className="mb-4" size={48} strokeWidth={1}/>
                    <p className="text-13px" >선택된 상품이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3" >
                    {cart.map(item => (
                      <div className="p-4 bg-2 border border-default rounded-2 hover:shadow-sm transition-all flex flex-col gap-3" key={item.id}>
                        <div className="flex justify-between" >
                          <span className="text-Body-Primary-KR font-600 text-5" >{item.name}</span>
                          <button className="text-7 hover:text-14 transition-colors" onClick={() => removeFromCart(item.id)}>
                            <X size={16} strokeWidth={1.5}/>
                          </button>
                        </div>
                        <div className="flex items-center justify-between" >
                          <div className="flex items-center gap-3 bg-3 rounded-full px-2 py-1 border border-default" >
                            <button className="text-6 hover:text-0 transition-colors" onClick={() => updateQuantity(item.id, -1)}>
                              <MinusCircle size={18} strokeWidth={1.5}/>
                            </button>
                            <span className="text-Data-Monospace-Tabular font-bold min-w-[20px] text-center text-5" >{item.quantity}</span>
                            <button className="text-6 hover:text-0 transition-colors" onClick={() => updateQuantity(item.id, 1)}>
                              <PlusCircle size={18} strokeWidth={1.5}/>
                            </button>
                          </div>
                          <span className="text-Data-Monospace-Tabular font-bold text-5" >₩{(item.salePrice * item.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Member Mini Card */}
              {selectedMember && (
                <div className="m-4 p-4 bg-12/5 rounded-3 border border-12/20 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300" >
                  <div className="flex items-center gap-3" >
                    <div className="w-8 h-8 rounded-full bg-12 text-2 flex items-center justify-center font-bold text-xs" >
                      {selectedMember.name[0]}
                    </div>
                    <div className="flex flex-col" >
                      <span className="text-13px font-bold text-5" >{selectedMember.name}</span>
                      <span className="text-11px text-6 font-monospace" >보유: {selectedMember.mileage.toLocaleString()} P</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-12/10 px-2 py-1 rounded-full" >
                    <div className="w-1.5 h-1.5 rounded-full bg-12 animate-pulse" />
                    <span className="text-11px font-bold text-12" >회원 적용됨</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Panel */}
            <div className="bg-5 rounded-3 p-6 text-2 shadow-lg flex flex-col gap-6" >
              <div className="space-y-3 border-b border-2/10 pb-6" >
                <div className="flex justify-between text-12px text-2/60 font-monospace" >
                  <span >공급가액</span>
                  <span >₩{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-12px text-2/60 font-monospace" >
                  <span >부가세 (10%)</span>
                  <span >₩{vat.toLocaleString()}</span>
                </div>
                {mileageToUse > 0 && (
                  <div className="flex justify-between text-12px text-12 font-bold font-monospace" >
                    <span >마일리지 사용</span>
                    <span >- ₩{mileageToUse.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2" >
                  <span className="text-14px font-600 text-2/80" >최종 결제 금액</span>
                  <span className="text-KPI-Large font-800 text-0 italic tabular-nums tracking-tighter" >₩{finalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Mileage Use Input */}
              {selectedMember && (
                <div className="flex items-center gap-3" >
                  <div className="flex-1 relative" >
                    <input
                      className="w-full bg-2/10 border border-2/20 rounded-2 px-4 py-3 text-2 text-14px font-monospace outline-none focus:border-0 transition-all placeholder:text-2/30" type="number" placeholder="마일리지 사용" value={mileageToUse || ""} onChange={(e) => setMileageToUse(Math.min(selectedMember.mileage, Number(e.target.value)))}/>
                    <Gift className="absolute right-3 top-3 text-2/40" size={16} strokeWidth={1.5}/>
                  </div>
                  <button
                    className="px-4 py-3 bg-12 text-2 rounded-2 text-12px font-bold hover:bg-12/90 transition-colors shadow-sm" onClick={() => setMileageToUse(Math.min(selectedMember.mileage, totalAmount))}>
                    전액
                  </button>
                </div>
              )}

              {/* Payment Methods */}
              <div className="grid grid-cols-2 gap-3" >
                <button
                  className={cn(
                    "flex items-center justify-center gap-2 py-4 rounded-3 border transition-all group",
                    paymentMethod === "card" 
                      ? "bg-0 border-0 text-2 shadow-md shadow-0/40" 
                      : "bg-2/5 border-2/10 text-2/60 hover:bg-2/10 hover:text-2"
                  )} onClick={() => setPaymentMethod("card")}>
                  <CreditCard size={18} strokeWidth={1.5}/>
                  <span className="text-13px font-bold" >신용카드</span>
                </button>
                <button
                  className={cn(
                    "flex items-center justify-center gap-2 py-4 rounded-3 border transition-all",
                    paymentMethod === "cash" 
                      ? "bg-12 border-12 text-2 shadow-md shadow-12/40" 
                      : "bg-2/5 border-2/10 text-2/60 hover:bg-2/10 hover:text-2"
                  )} onClick={() => setPaymentMethod("cash")}>
                  <Banknote size={18} strokeWidth={1.5}/>
                  <span className="text-13px font-bold" >현금</span>
                </button>
                <button
                  className={cn(
                    "flex items-center justify-center gap-2 py-4 rounded-3 border transition-all",
                    paymentMethod === "transfer" 
                      ? "bg-15 border-15 text-2 shadow-md shadow-15/40" 
                      : "bg-2/5 border-2/10 text-2/60 hover:bg-2/10 hover:text-2"
                  )} onClick={() => setPaymentMethod("transfer")}>
                  <ArrowRightLeft size={18} strokeWidth={1.5}/>
                  <span className="text-13px font-bold" >계좌이체</span>
                </button>
                <button
                  className={cn(
                    "flex items-center justify-center gap-2 py-4 rounded-3 border transition-all",
                    paymentMethod === "mixed" 
                      ? "bg-13 border-13 text-5 shadow-md shadow-13/40" 
                      : "bg-2/5 border-2/10 text-2/60 hover:bg-2/10 hover:text-2"
                  )} onClick={() => {
                    setPaymentMethod("mixed");
                    setIsMixedPaymentModalOpen(true);
                  }}>
                  <Tag size={18} strokeWidth={1.5}/>
                  <span className="text-13px font-bold" >혼합결제</span>
                </button>
              </div>

              {/* Cash Change Calc (Only for Cash Payment) */}
              {paymentMethod === "cash" && (
                <div className="space-y-3 bg-1/5 p-4 rounded-3 border border-2/5" >
                  <div className="flex justify-between items-center" >
                    <span className="text-12px text-2/60" >받은 금액</span>
                    <input
                      className="bg-transparent border-b border-2/40 text-right font-bold text-Data-Monospace-Tabular outline-none w-32 focus:border-12 transition-colors placeholder:text-2/20" type="number" value={cashReceived || ""} onChange={(e) => setCashReceived(Number(e.target.value))}/>
                  </div>
                  <div className="flex justify-between items-center text-12" >
                    <span className="text-12px font-bold" >거스름돈</span>
                    <span className="text-18px font-black font-monospace" >₩{changeAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                className={cn(
                  "w-full py-5 rounded-card-strong text-18px font-800 transition-all flex items-center justify-center gap-2 mt-2",
                  cart.length === 0 
                    ? "bg-2/10 text-2/20 cursor-not-allowed" 
                    : "bg-0 text-2 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-0/30"
                )} disabled={cart.length === 0} onClick={handlePaymentConfirm}>
                {cart.length === 0 ? "상품을 선택해주세요" : `₩${finalAmount.toLocaleString()} 결제하기`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mixed Payment Modal */}
      {isMixedPaymentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-6" >
          <div className="w-full max-w-md bg-2 rounded-4 shadow-5 animate-in zoom-in duration-300 overflow-hidden" >
            <div className="bg-3 p-8 border-b border-default flex justify-between items-center" >
              <div >
                <h3 className="text-Page-Title text-5 font-bold" >혼합 결제 설정</h3>
                <p className="text-13px text-6 mt-1" >결제 수단별 금액을 나누어 입력하세요.</p>
              </div>
              <button className="text-7 hover:text-14 transition-colors" onClick={() => setIsMixedPaymentModalOpen(false)}>
                <X size={24} strokeWidth={1.5}/>
              </button>
            </div>
            
            <div className="p-8 space-y-6" >
              <div className="space-y-4" >
                <div className="flex items-center gap-4" >
                  <div className="w-10 h-10 rounded-full bg-0/10 text-0 flex items-center justify-center flex-shrink-0" >
                    <CreditCard size={20} strokeWidth={1.5}/>
                  </div>
                  <div className="flex-1" >
                    <label className="text-11px font-600 uppercase tracking-wider text-7 block mb-1.5" >신용카드 금액</label>
                    <input
                      className="w-full bg-3 border-none rounded-2 px-4 py-2.5 text-Data-Monospace-Tabular font-bold outline-none focus:ring-2 focus:ring-0/20 transition-all" type="number" value={mixedCard || ""} onChange={(e) => setMixedCard(Number(e.target.value))}/>
                  </div>
                </div>

                <div className="flex items-center gap-4" >
                  <div className="w-10 h-10 rounded-full bg-12/10 text-12 flex items-center justify-center flex-shrink-0" >
                    <Banknote size={20} strokeWidth={1.5}/>
                  </div>
                  <div className="flex-1" >
                    <label className="text-11px font-600 uppercase tracking-wider text-7 block mb-1.5" >현금 금액</label>
                    <input
                      className="w-full bg-3 border-none rounded-2 px-4 py-2.5 text-Data-Monospace-Tabular font-bold outline-none focus:ring-2 focus:ring-12/20 transition-all" type="number" value={mixedCash || ""} onChange={(e) => setMixedCash(Number(e.target.value))}/>
                  </div>
                </div>

                <div className="flex items-center gap-4" >
                  <div className="w-10 h-10 rounded-full bg-15/10 text-15 flex items-center justify-center flex-shrink-0" >
                    <ArrowRightLeft size={20} strokeWidth={1.5}/>
                  </div>
                  <div className="flex-1" >
                    <label className="text-11px font-600 uppercase tracking-wider text-7 block mb-1.5" >계좌이체 금액</label>
                    <input
                      className="w-full bg-3 border-none rounded-2 px-4 py-2.5 text-Data-Monospace-Tabular font-bold outline-none focus:ring-2 focus:ring-15/20 transition-all" type="number" value={mixedTransfer || ""} onChange={(e) => setMixedTransfer(Number(e.target.value))}/>
                  </div>
                </div>
              </div>

              <div className={cn(
                "p-6 rounded-3 border flex flex-col items-center gap-2 transition-all shadow-sm",
                isMixedMatched ? "bg-12/5 border-12 text-12" : "bg-14/5 border-14 text-14"
              )} >
                <span className="text-10px uppercase font-800 tracking-widest opacity-60" >Total Matched Status</span>
                <div className="flex items-center gap-2" >
                  <span className="text-KPI-Large font-800 tabular-nums" >₩{mixedTotal.toLocaleString()}</span>
                  <span className="text-14px opacity-60" >/ ₩{finalAmount.toLocaleString()}</span>
                </div>
                {!isMixedMatched && (
                  <p className="text-12px font-500 animate-pulse" >금액 합계가 결제 금액과 일치하지 않습니다.</p>
                )}
              </div>
            </div>

            <div className="p-8 bg-3 flex gap-4" >
              <button
                className="flex-1 py-3 rounded-2 bg-2 border border-default text-5 font-600 hover:bg-4 transition-all" onClick={() => setIsMixedPaymentModalOpen(false)}>
                취소
              </button>
              <button
                className={cn(
                  "flex-[2] py-3 rounded-2 font-800 text-2 transition-all shadow-md",
                  isMixedMatched ? "bg-0 hover:scale-[1.02] shadow-0/30" : "bg-8 cursor-not-allowed"
                )} disabled={!isMixedMatched} onClick={() => setIsMixedPaymentModalOpen(false)}>
                설정 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
