import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  CreditCard,
  X,
  Calendar,
  Clock,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import TabNav from '@/components/TabNav';
import StatusBadge from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

interface Product {
  id: number;
  name: string;
  category: string;
  cashPrice: number;
  cardPrice: number;
  period: string;
  count: string;
  productType: string | null;
  kiosk: boolean;
  stock: number | null;
}

// DB 카테고리 영문 → 한글 매핑
const CATEGORY_KO: Record<string, string> = {
  MEMBERSHIP: '이용권', PT: 'PT', GX: 'GX', ETC: '기타',
  '이용권': '이용권', '기타': '기타',
};
const toCategoryKo = (cat: string) => CATEGORY_KO[cat] ?? cat;

// 상품 타입 배지 색상 매핑
const PRODUCT_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  MEMBERSHIP: { label: '회원권', className: 'bg-blue-100 text-blue-700' },
  LESSON:     { label: '수강권', className: 'bg-green-100 text-green-700' },
  RENTAL:     { label: '대여권', className: 'bg-orange-100 text-orange-700' },
  GENERAL:    { label: '일반',   className: 'bg-gray-100 text-gray-600' },
};

const CATEGORY_TABS = [
  { key: '이용권', label: '이용권' },
  { key: 'PT', label: 'PT' },
  { key: 'GX', label: 'GX' },
  { key: '기타', label: '기타' },
];

interface CartItem extends Product {
  cartId: string;
  priceType: 'cash' | 'card';
  quantity: number;
}

// --- 상품 카드 ---
const ProductCard = ({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (p: Product) => void;
}) => {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock !== null && product.stock > 0 && product.stock <= 5;

  return (
    <div
      onClick={() => !isOutOfStock && onAdd(product)}
      className={cn(
        'group relative flex flex-col rounded-xl border bg-surface p-md transition-all',
        isOutOfStock
          ? 'border-line opacity-50 cursor-not-allowed grayscale'
          : 'border-line hover:border-primary hover:shadow-md cursor-pointer'
      )}
    >
      {/* 상품 타입 배지 + 재고 배지 */}
      <div className="flex items-center gap-xs mb-xs flex-wrap">
        {product.productType && PRODUCT_TYPE_BADGE[product.productType] && (
          <span className={cn(
            'text-[10px] font-bold px-xs py-[1px] rounded-full',
            PRODUCT_TYPE_BADGE[product.productType].className
          )}>
            {PRODUCT_TYPE_BADGE[product.productType].label}
          </span>
        )}
        {product.stock !== null && (
          <>
            {isOutOfStock && <StatusBadge variant="error" dot>품절</StatusBadge>}
            {isLowStock && <StatusBadge variant="warning" dot>재고 부족 ({product.stock}개)</StatusBadge>}
            {!isOutOfStock && !isLowStock && <StatusBadge variant="success" dot>재고 {product.stock}개</StatusBadge>}
          </>
        )}
      </div>

      <h4 className="text-[14px] font-semibold text-content mb-xs line-clamp-1">{product.name}</h4>

      <div className="flex flex-col gap-[2px] mb-md text-[12px] text-content-tertiary">
        <div className="flex items-center gap-xs">
          <Calendar size={12} />
          <span>기간: {product.period}</span>
        </div>
        <div className="flex items-center gap-xs">
          <Clock size={12} />
          <span>횟수: {product.count}</span>
        </div>
      </div>

      <div className="mt-auto pt-sm border-t border-line">
        <div className="flex justify-between items-baseline">
          <span className="text-[11px] text-content-tertiary">현금가</span>
          <span className="text-[14px] font-bold text-primary tabular-nums">
            {product.cashPrice.toLocaleString()}원
          </span>
        </div>
        <div className="flex justify-between items-baseline mt-[2px]">
          <span className="text-[11px] text-content-tertiary">카드가</span>
          <span className="text-[12px] font-medium text-content-secondary tabular-nums">
            {product.cardPrice.toLocaleString()}원
          </span>
        </div>
      </div>

      {!isOutOfStock && (
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-surface rounded-full p-sm shadow-md text-primary">
            <Plus size={22} />
          </div>
        </div>
      )}
    </div>
  );
};

// --- 메인 컴포넌트 ---
export default function SalesPos() {
  const [activeTab, setActiveTab] = useState('이용권');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // 상품 목록 로드
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('branchId', getBranchId())
        .eq('isActive', true);
      if (!error && data) {
        setProducts(
          data.map((p: Record<string, unknown>) => ({
            id: p.id as number,
            name: p.name as string,
            category: toCategoryKo(p.category as string),
            // DB의 cashPrice/cardPrice를 우선 사용, 없으면 price로 폴백
            cashPrice: Number(p.cashPrice ?? p.price ?? 0),
            cardPrice: Number(p.cardPrice ?? p.price ?? 0),
            period: p.duration ? String(p.duration) : '-',
            count: p.sessions ? String(p.sessions) : '-',
            productType: (p.productType as string) ?? null,
            kiosk: Boolean(p.kioskVisible ?? false),
            stock: null,
          }))
        );
      }
    };
    fetchProducts();
  }, []);

  // 상품 필터링
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchTab = p.category === activeTab;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [products, activeTab, searchQuery]);

  // 장바구니 합계
  const totalAmount = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum + (item.priceType === 'cash' ? item.cashPrice : item.cardPrice) * item.quantity,
      0
    );
  }, [cart]);

  // 장바구니 추가
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.priceType === 'cash');
      if (existing) {
        return prev.map(item =>
          item.cartId === existing.cartId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          cartId: `${product.id}-${Date.now()}`,
          priceType: 'cash',
          quantity: 1,
        },
      ];
    });
  };

  // 수량 변경
  const handleQuantityChange = (cartId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.cartId === cartId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  // 가격 타입 변경
  const handlePriceType = (cartId: string, type: 'cash' | 'card') => {
    setCart(prev =>
      prev.map(item => (item.cartId === cartId ? { ...item, priceType: type } : item))
    );
  };

  // 삭제
  const handleRemove = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  // 탭별 상품 수
  const tabsWithCount = CATEGORY_TABS.map(tab => ({
    ...tab,
    count: products.filter(p => p.category === tab.key).length,
  }));

  return (
    <AppLayout>
      <PageHeader
        title="POS 판매"
        description="카테고리별 상품을 선택하고 장바구니에 담아 결제로 이동합니다."
        actions={
          <button
            onClick={() => moveToPage(997)}
            className="flex items-center gap-xs px-md py-sm bg-surface border border-line text-content-secondary rounded-button text-[13px] font-semibold hover:bg-surface-tertiary transition-colors"
          >
            <Plus size={15} />
            상품 등록
          </button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-lg">
        {/* 좌측: 상품 그리드 */}
        <div className="flex-1 flex flex-col gap-md">
          {/* 카테고리 탭 + 검색 */}
          <div className="bg-surface rounded-xl border border-line p-md shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-md">
              <TabNav
                className="border-none p-0"
                tabs={tabsWithCount}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
              <div className="relative w-full sm:w-[220px]">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary"
                  size={15}
                />
                <input
                  type="text"
                  placeholder="상품명 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-line rounded-button text-[13px] text-content placeholder:text-content-tertiary focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* 상품 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-md max-h-[calc(100vh-380px)] overflow-y-auto pr-xs scrollbar-hide">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-xxl gap-md text-content-tertiary">
                  <ShoppingCart size={40} strokeWidth={1.5} />
                  <p className="text-[13px]">해당 카테고리에 상품이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 장바구니 사이드바 */}
        <div className="w-full lg:w-[360px] flex flex-col gap-md">
          <div className="bg-surface rounded-xl border border-line shadow-card flex flex-col overflow-hidden">
            {/* 헤더 */}
            <div className="px-lg py-md border-b border-line flex items-center justify-between bg-surface-secondary/40">
              <div className="flex items-center gap-sm">
                <ShoppingCart className="text-primary" size={18} />
                <span className="text-[14px] font-bold text-content">장바구니</span>
                <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[12px] text-content-tertiary hover:text-state-error flex items-center gap-xs transition-colors"
                >
                  <Trash2 size={13} />
                  전체 삭제
                </button>
              )}
            </div>

            {/* 아이템 목록 */}
            <div className="flex-1 overflow-y-auto p-md space-y-sm min-h-[200px] max-h-[400px] scrollbar-hide">
              {cart.length > 0 ? (
                cart.map(item => (
                  <div
                    key={item.cartId}
                    className="bg-surface-secondary border border-line rounded-lg p-sm"
                  >
                    <div className="flex justify-between items-start mb-sm">
                      <div className="flex-1 pr-sm">
                        <p className="text-[13px] font-semibold text-content line-clamp-1">
                          {item.name}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemove(item.cartId)}
                        className="text-content-tertiary hover:text-state-error transition-colors shrink-0"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* 수량 조절 */}
                      <div className="flex items-center gap-xs bg-surface border border-line rounded-full px-sm py-[2px]">
                        <button
                          onClick={() => handleQuantityChange(item.cartId, -1)}
                          className="text-content-secondary hover:text-primary transition-colors w-5 h-5 flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-[13px] font-bold text-content w-5 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.cartId, 1)}
                          className="text-content-secondary hover:text-primary transition-colors w-5 h-5 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>

                      {/* 가격 타입 토글 */}
                      <div className="flex gap-xs">
                        {(['cash', 'card'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => handlePriceType(item.cartId, type)}
                            className={cn(
                              'px-sm py-[2px] rounded text-[11px] font-bold transition-colors',
                              item.priceType === type
                                ? 'bg-primary text-surface'
                                : 'bg-surface-tertiary text-content-secondary'
                            )}
                          >
                            {type === 'cash' ? '현금' : '카드'}
                          </button>
                        ))}
                      </div>

                      <span className="text-[14px] font-bold text-content tabular-nums">
                        {(
                          (item.priceType === 'cash' ? item.cashPrice : item.cardPrice) *
                          item.quantity
                        ).toLocaleString()}
                        원
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-sm text-content-tertiary opacity-50 py-xl">
                  <ShoppingCart size={36} strokeWidth={1.5} />
                  <p className="text-[13px]">장바구니가 비어 있습니다.</p>
                </div>
              )}
            </div>

            {/* 합계 + 결제 버튼 */}
            <div className="p-lg border-t border-line bg-surface-secondary/30 space-y-md">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-content-secondary">총 합계</span>
                <span className="text-[22px] font-bold text-primary tabular-nums">
                  {totalAmount.toLocaleString()}원
                </span>
              </div>
              <button
                disabled={cart.length === 0}
                onClick={() => {
                  // 장바구니 데이터를 sessionStorage에 저장 후 결제 페이지로 이동
                  const cartData = cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    price: item.priceType === 'cash' ? item.cashPrice : item.cardPrice,
                    quantity: item.quantity,
                  }));
                  sessionStorage.setItem('posCart', JSON.stringify(cartData));
                  moveToPage(982);
                }}
                className={cn(
                  'w-full py-md rounded-button text-[15px] font-bold transition-all flex items-center justify-center gap-sm shadow-md',
                  cart.length > 0
                    ? 'bg-primary text-surface hover:bg-primary-dark active:scale-[0.98] shadow-primary/20'
                    : 'bg-surface-tertiary text-content-tertiary cursor-not-allowed'
                )}
              >
                <CreditCard size={18} />
                결제하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
