import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Package,
  CheckCircle,
  XCircle,
  LayoutGrid,
  LayoutList,
  X,
  Edit2,
  Save,
  Trash2,
} from 'lucide-react';
import {
  getProductGroups,
  createProductGroup,
  updateProductGroup,
  deleteProductGroup,
  type ProductGroup,
} from '@/api/endpoints/productGroups';
import AppLayout from '@/components/AppLayout';
import { useAuthStore } from '@/stores/authStore';
import { hasFeature } from '@/lib/permissions';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import TabNav from '@/components/TabNav';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/exportExcel';
import ProductDetailPanel, { type ProductRow, type UsageRestrictions } from '@/components/ProductDetailPanel';

// 요일 라벨 (레슨북 스타일 — 월~일 순서)
const DAY_LABELS_ORDERED = [
  { idx: 1, label: '월' },
  { idx: 2, label: '화' },
  { idx: 3, label: '수' },
  { idx: 4, label: '목' },
  { idx: 5, label: '금' },
  { idx: 6, label: '토' },
  { idx: 0, label: '일' },
];

// ─── 상수 ────────────────────────────────────────────────────

// DB 카테고리 영문 → 한글 매핑
const CATEGORY_KO: Record<string, string> = {
  MEMBERSHIP: '이용권', PT: 'PT', GX: 'GX', ETC: '기타', PRODUCT: '기타', SERVICE: '기타',
  '이용권': '이용권', '기타': '기타',
};
const toCategoryKo = (cat: string) => CATEGORY_KO[cat] ?? cat;

// 기본 상품 타입 탭 (동적 분류가 추가됨)
const DEFAULT_TYPE_TABS = [
  { key: 'all',        label: '전체' },
  { key: 'MEMBERSHIP', label: '회원권' },
  { key: 'LESSON',     label: '수강권' },
  { key: 'RENTAL',     label: '대여권' },
  { key: 'GENERAL',    label: '일반' },
];

// 상품 타입 배지 스타일
const PRODUCT_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  MEMBERSHIP: { label: '회원권', className: 'bg-blue-100 text-blue-700' },
  LESSON:     { label: '수강권', className: 'bg-green-100 text-green-700' },
  RENTAL:     { label: '대여권', className: 'bg-orange-100 text-orange-700' },
  GENERAL:    { label: '일반',   className: 'bg-gray-100 text-gray-600' },
};

// 종목 목록
const SPORT_TYPES = ['전체', '헬스', '필라테스', '요가', '수영', '복싱', '크로스핏', '기타'];

const getBranchId = (): number => Number(localStorage.getItem('branchId')) || 1;

// ─── 컴포넌트 ────────────────────────────────────────────────
export default function ProductList() {
  const authUser = useAuthStore((s) => s.user);
  const canEditProduct = hasFeature(authUser?.role ?? '', 'productEdit', authUser?.isSuperAdmin);

  // 최상위 탭: "상품 목록" / "분류 관리"
  const [mainTab, setMainTab] = useState<'products' | 'groups'>('products');

  // ── 분류 관리 상태 ──────────────────────────────────────────
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', sortOrder: 0, isActive: true });
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupSaving, setGroupSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    const { data } = await getProductGroups();
    if (data) setGroups(data);
    setGroupsLoading(false);
  }, []);

  useEffect(() => {
    if (mainTab === 'groups') fetchGroups();
  }, [mainTab, fetchGroups]);

  const handleGroupSave = async () => {
    if (!groupForm.name.trim()) { toast.error('분류명을 입력하세요.'); return; }
    setGroupSaving(true);
    if (editingGroupId !== null) {
      const { error } = await updateProductGroup(editingGroupId, groupForm);
      if (error) { toast.error('수정에 실패했습니다.'); } else { toast.success('분류가 수정되었습니다.'); }
    } else {
      const { error } = await createProductGroup(groupForm);
      if (error) { toast.error('등록에 실패했습니다.'); } else { toast.success('분류가 등록되었습니다.'); }
    }
    setGroupForm({ name: '', sortOrder: 0, isActive: true });
    setEditingGroupId(null);
    setGroupSaving(false);
    fetchGroups();
  };

  const handleGroupDelete = async (id: number) => {
    if (!window.confirm('이 분류를 삭제하시겠습니까?')) return;
    const { error } = await deleteProductGroup(id);
    if (error) { toast.error('삭제에 실패했습니다.'); } else { toast.success('분류가 삭제되었습니다.'); fetchGroups(); }
  };

  // ── 상품 목록 상태 ──────────────────────────────────────────
  const [activeTypeTab, setActiveTypeTab] = useState('all');
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [sportFilter, setSportFilter] = useState('전체');
  const [searchValue, setSearchValue] = useState('');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);

  // 동적 카테고리 목록 (product_groups + 실제 상품에서 추출)
  const dynamicCategories = useMemo(() => {
    // product_groups에서 가져온 분류 + 실제 상품의 카테고리 합집합
    const fromGroups = groups.filter(g => g.isActive).map(g => g.name);
    const fromProducts = [...new Set(products.map(p => toCategoryKo(p.category)))];
    const all = [...new Set([...fromGroups, ...fromProducts])].filter(Boolean);
    return all;
  }, [groups, products]);

  // 마스터-디테일 패널 상태
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [isNewMode, setIsNewMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('branchId', getBranchId())
      .order('id');
    if (!error && data) {
      setProducts((data as unknown as ProductRow[]).map(p => ({
        ...p,
        price: Number(p.price),
        cashPrice: p.cashPrice != null ? Number(p.cashPrice) : null,
        cardPrice: p.cardPrice != null ? Number(p.cardPrice) : null,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchGroups(); // 동적 카테고리용
  }, [fetchProducts, fetchGroups]);

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    return products.filter(item => {
      const matchTypeTab = activeTypeTab === 'all' || item.productType === activeTypeTab;
      const matchCategory = activeCategoryTab === 'all' || toCategoryKo(item.category) === activeCategoryTab;
      const matchSport = sportFilter === '전체' || item.sportType === sportFilter;
      const matchSearch = item.name.toLowerCase().includes(searchValue.toLowerCase());
      return matchTypeTab && matchCategory && matchSport && matchSearch;
    });
  }, [products, activeTypeTab, activeCategoryTab, sportFilter, searchValue]);

  // 행 클릭 → 상세 패널 열기
  const handleRowClick = (product: ProductRow) => {
    setSelectedProduct(product);
    setIsNewMode(false);
    setPanelOpen(true);
  };

  // "+ 상품 등록" 클릭 → 신규 폼 패널 열기
  const handleNewProduct = () => {
    setSelectedProduct(null);
    setIsNewMode(true);
    setPanelOpen(true);
  };

  // 패널 닫기
  const handlePanelClose = () => {
    setPanelOpen(false);
    setSelectedProduct(null);
    setIsNewMode(false);
  };

  // 저장 성공 콜백: 목록 새로고침 + 저장된 상품 선택 유지
  const handleSave = async (savedId: number) => {
    await fetchProducts();
    // 저장된 상품을 새로 로드된 목록에서 찾아 선택 유지
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', savedId)
      .single();
    if (data) {
      const updated: ProductRow = {
        ...(data as ProductRow),
        price: Number(data.price),
        cashPrice: data.cashPrice != null ? Number(data.cashPrice) : null,
        cardPrice: data.cardPrice != null ? Number(data.cardPrice) : null,
      };
      setSelectedProduct(updated);
      setIsNewMode(false);
    }
  };

  // 삭제 성공 콜백
  const handleDelete = () => {
    handlePanelClose();
    fetchProducts();
  };

  // 통계
  const activeCount = products.filter(p => p.isActive).length;
  const inactiveCount = products.filter(p => !p.isActive).length;
  const categoryCount = new Set(products.map(p => p.category)).size;

  const statItems = [
    { label: '전체 상품', value: products.length, icon: <Package />, variant: 'peach' as const },
    { label: '활성 상품', value: activeCount, icon: <CheckCircle />, variant: 'mint' as const },
    { label: '비활성', value: inactiveCount, icon: <XCircle /> },
    { label: '카테고리 수', value: categoryCount, icon: <LayoutGrid /> },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="상품 관리"
        description="센터에서 판매하는 이용권, PT, GX 및 기타 상품을 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            {/* 메인 탭 토글 */}
            <div className="flex rounded-lg border border-line overflow-hidden">
              {([
                { key: 'products', label: '상품 목록', icon: <LayoutList size={14} /> },
                { key: 'groups',   label: '분류 관리', icon: <LayoutGrid size={14} /> },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setMainTab(t.key)}
                  className={cn(
                    'flex items-center gap-xs px-md py-sm text-[13px] font-semibold transition-colors',
                    mainTab === t.key
                      ? 'bg-primary text-surface'
                      : 'bg-surface text-content-secondary hover:bg-surface-secondary'
                  )}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
            {/* 상품 등록 버튼 (상품 목록 탭에서만) */}
            {mainTab === 'products' && canEditProduct && (
              <button
                onClick={handleNewProduct}
                className="flex items-center gap-xs px-md py-sm bg-primary text-surface rounded-button text-[13px] font-bold shadow-sm hover:bg-primary-dark transition-colors"
              >
                <Plus size={15} />
                상품 등록
              </button>
            )}
            {/* 엑셀 다운로드 */}
            {mainTab === 'products' && (
              <button
                onClick={() => {
                  const cols = [
                    { key: 'category', header: '카테고리' },
                    { key: 'name', header: '상품명' },
                    { key: 'price', header: '가격' },
                    { key: 'duration', header: '이용기간' },
                    { key: 'sessions', header: '세션' },
                    { key: 'isActive', header: '상태' },
                  ];
                  exportToExcel(filteredData as unknown as Record<string, unknown>[], cols, { filename: '상품목록' });
                  toast.success(`${filteredData.length}건 엑셀 다운로드 완료`);
                }}
                className="flex items-center gap-xs px-md py-sm border border-line bg-surface text-content-secondary rounded-button text-[13px] hover:bg-surface-secondary transition-colors"
              >
                Excel
              </button>
            )}
          </div>
        }
      />

      {/* ── 분류 관리 탭 ─────────────────────────────────────── */}
      {mainTab === 'groups' && (
        <div className="space-y-lg">
          {/* 분류 등록/수정 폼 */}
          <div className="bg-surface rounded-xl border border-line p-lg">
            <h3 className="text-[14px] font-bold text-content mb-md">
              {editingGroupId !== null ? '분류 수정' : '분류 등록'}
            </h3>
            <div className="flex flex-wrap gap-md items-end">
              <div className="flex flex-col gap-xs min-w-[200px]">
                <label className="text-[11px] font-medium text-content-secondary">분류명 *</label>
                <input
                  className="px-sm py-[6px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                  placeholder="분류명 입력"
                  value={groupForm.name}
                  onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-xs min-w-[100px]">
                <label className="text-[11px] font-medium text-content-secondary">정렬순서</label>
                <input
                  type="number"
                  className="px-sm py-[6px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                  value={groupForm.sortOrder}
                  onChange={e => setGroupForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-xs">
                <label className="text-[12px] font-medium text-content-secondary">활성</label>
                <button
                  type="button"
                  onClick={() => setGroupForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', groupForm.isActive ? 'bg-accent' : 'bg-line')}
                >
                  <span className={cn('inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform', groupForm.isActive ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </div>
              <div className="flex gap-sm">
                <button
                  onClick={handleGroupSave}
                  disabled={groupSaving}
                  className="flex items-center gap-xs px-md py-[6px] bg-primary text-surface rounded-lg text-[13px] font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  <Save size={14} />{editingGroupId !== null ? '수정 저장' : '등록'}
                </button>
                {editingGroupId !== null && (
                  <button
                    onClick={() => { setEditingGroupId(null); setGroupForm({ name: '', sortOrder: 0, isActive: true }); }}
                    className="flex items-center gap-xs px-md py-[6px] border border-line text-content-secondary rounded-lg text-[13px] hover:bg-surface-secondary transition-colors"
                  >
                    <X size={14} />취소
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 분류 목록 */}
          <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
            {groupsLoading ? (
              <div className="flex items-center justify-center py-xl">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-xl text-[13px] text-content-secondary">등록된 분류가 없습니다.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-surface-secondary">
                  <tr>
                    {['분류명', '정렬순서', '상태', ''].map(h => (
                      <th key={h} className="px-md py-sm text-[11px] font-semibold text-content-secondary text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-light">
                  {groups.map(g => (
                    <tr key={g.id} className="hover:bg-surface-secondary transition-colors">
                      <td className="px-md py-sm text-[13px] text-content font-medium">{g.name}</td>
                      <td className="px-md py-sm text-[13px] text-content-secondary">{g.sortOrder}</td>
                      <td className="px-md py-sm">
                        <span className={cn('text-[11px] font-semibold px-xs py-[2px] rounded-full', g.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                          {g.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-md py-sm">
                        <div className="flex items-center gap-xs justify-end">
                          <button
                            className="p-xs text-content-tertiary hover:text-accent transition-colors"
                            onClick={() => { setEditingGroupId(g.id); setGroupForm({ name: g.name, sortOrder: g.sortOrder, isActive: g.isActive }); }}
                          ><Edit2 size={14} /></button>
                          <button
                            className="p-xs text-content-tertiary hover:text-state-error transition-colors"
                            onClick={() => handleGroupDelete(g.id)}
                          ><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── 상품 목록 탭 (마스터-디테일) ─────────────────────── */}
      {mainTab === 'products' && (
        <>
          {/* 통계 요약 */}
          <div className="mb-xl grid grid-cols-2 lg:grid-cols-4 gap-md">
            {statItems.map((stat, idx) => (
              <StatCard
                key={idx}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                variant={stat.variant}
              />
            ))}
          </div>

          {/* 필터 바 */}
          <div className="mb-md space-y-md">
            {/* 상품 타입 탭 */}
            <TabNav
              tabs={DEFAULT_TYPE_TABS.map(tab => ({
                ...tab,
                count: tab.key === 'all'
                  ? products.length
                  : products.filter(p => p.productType === tab.key).length,
              }))}
              activeTab={activeTypeTab}
              onTabChange={val => { setActiveTypeTab(val); handlePanelClose(); }}
            />

            {/* 동적 카테고리 분류 탭 (레슨북 스타일: 자유롭게 추가 가능) */}
            {dynamicCategories.length > 0 && (
              <div className="flex items-center gap-[6px] flex-wrap">
                <span className="text-[11px] text-content-tertiary font-medium mr-xs">분류:</span>
                <button
                  onClick={() => setActiveCategoryTab('all')}
                  className={cn(
                    'px-sm py-[3px] rounded-full text-[11px] font-semibold transition-colors',
                    activeCategoryTab === 'all'
                      ? 'bg-content text-surface'
                      : 'bg-surface border border-line text-content-secondary hover:bg-surface-secondary'
                  )}
                >
                  전체
                </button>
                {dynamicCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategoryTab(activeCategoryTab === cat ? 'all' : cat)}
                    className={cn(
                      'px-sm py-[3px] rounded-full text-[11px] font-semibold transition-colors',
                      activeCategoryTab === cat
                        ? 'bg-content text-surface'
                        : 'bg-surface border border-line text-content-secondary hover:bg-surface-secondary'
                    )}
                  >
                    {cat}
                    <span className="ml-[3px] text-[10px] opacity-70">
                      {products.filter(p => toCategoryKo(p.category) === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 종목 + 검색 */}
            <div className="flex items-center gap-sm flex-wrap">
              {SPORT_TYPES.map(sport => (
                <button
                  key={sport}
                  onClick={() => setSportFilter(sport)}
                  className={cn(
                    'px-sm py-xs rounded-button text-[12px] font-semibold transition-colors',
                    sportFilter === sport
                      ? 'bg-primary text-surface'
                      : 'bg-surface border border-line text-content-secondary hover:bg-surface-secondary'
                  )}
                >
                  {sport}
                </button>
              ))}
              <div className="ml-auto relative">
                <Search size={14} className="absolute left-sm top-1/2 -translate-y-1/2 text-content-tertiary" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  placeholder="상품명 검색"
                  className="pl-7 pr-sm py-[6px] border border-line rounded-lg text-[13px] bg-surface focus:outline-none focus:border-primary w-[200px] transition-colors"
                />
                {searchValue && (
                  <button
                    onClick={() => setSearchValue('')}
                    className="absolute right-sm top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 마스터-디테일 컨테이너 */}
          <div className="flex gap-0 rounded-xl border border-line bg-surface shadow-card overflow-hidden" style={{ minHeight: '520px' }}>

            {/* ── 좌측: 상품 목록 (마스터) ── */}
            <div className={cn(
              'flex flex-col transition-all duration-200',
              panelOpen ? 'w-[55%] border-r border-line' : 'w-full'
            )}>
              {/* 목록 헤더 */}
              <div className="px-lg py-sm border-b border-line bg-surface-secondary flex items-center justify-between">
                <span className="text-[12px] font-semibold text-content-secondary">
                  총 {filteredData.length}개 상품
                </span>
                <span className="text-[11px] text-content-tertiary">행을 클릭하면 상세가 표시됩니다</span>
              </div>

              {/* 테이블 */}
              <div className="overflow-x-auto flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-xl">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-xl gap-sm text-content-secondary">
                    <Package size={36} className="text-line" />
                    <p className="text-[14px]">상품이 없습니다.</p>
                    {canEditProduct && (
                      <button
                        onClick={handleNewProduct}
                        className="flex items-center gap-xs text-[13px] text-primary font-semibold hover:underline"
                      >
                        <Plus size={14} /> 첫 상품 등록하기
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead className="bg-surface-secondary sticky top-0 z-10">
                      <tr>
                        <th className="px-sm py-[6px] text-[10px] font-semibold text-content-secondary text-left">상품명</th>
                        <th className="px-sm py-[6px] text-[10px] font-semibold text-content-secondary text-right">현금가</th>
                        <th className="px-sm py-[6px] text-[10px] font-semibold text-content-secondary text-right">카드가</th>
                        <th className="px-sm py-[6px] text-[10px] font-semibold text-content-secondary text-center">기간</th>
                        <th className="px-sm py-[6px] text-[10px] font-semibold text-content-secondary text-center">횟수</th>
                        {/* 레슨북 스타일: 요일별 이용 가능 ✓/✗ */}
                        {!panelOpen && DAY_LABELS_ORDERED.map(d => (
                          <th key={d.idx} className="px-[2px] py-[6px] text-[10px] font-semibold text-content-secondary text-center w-[24px]">
                            {d.label}
                          </th>
                        ))}
                        {!panelOpen && (
                          <th className="px-sm py-[6px] text-[10px] font-semibold text-content-secondary text-center">시간</th>
                        )}
                        <th className="px-sm py-[6px] text-[10px] font-semibold text-content-secondary text-center">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-light">
                      {filteredData.map(product => {
                        const isSelected = selectedProduct?.id === product.id && panelOpen;
                        return (
                          <tr
                            key={product.id}
                            onClick={() => handleRowClick(product)}
                            className={cn(
                              'cursor-pointer transition-colors group',
                              isSelected
                                ? 'bg-primary/5 border-l-2 border-l-primary'
                                : 'hover:bg-surface-secondary border-l-2 border-l-transparent'
                            )}
                          >
                            {/* 상품명 + 타입 배지 + 분류 */}
                            <td className="px-sm py-[5px]">
                              <div className="flex items-center gap-[4px]">
                                {product.productType && PRODUCT_TYPE_BADGE[product.productType] && (
                                  <span className={cn(
                                    'text-[9px] font-bold px-[4px] py-[1px] rounded shrink-0',
                                    PRODUCT_TYPE_BADGE[product.productType].className
                                  )}>
                                    {PRODUCT_TYPE_BADGE[product.productType].label}
                                  </span>
                                )}
                                <span className={cn(
                                  'text-[12px] font-semibold truncate',
                                  isSelected ? 'text-primary' : 'text-content group-hover:text-primary'
                                )}>
                                  {product.name}
                                </span>
                              </div>
                            </td>
                            {/* 현금가 */}
                            <td className="px-sm py-[5px] text-right">
                              <span className="text-[12px] font-medium tabular-nums text-content">
                                {product.cashPrice != null ? `₩${Number(product.cashPrice).toLocaleString()}` : `₩${Number(product.price).toLocaleString()}`}
                              </span>
                            </td>
                            {/* 카드가 */}
                            <td className="px-sm py-[5px] text-right">
                              <span className="text-[12px] tabular-nums text-content-secondary">
                                {product.cardPrice != null ? `₩${Number(product.cardPrice).toLocaleString()}` : '-'}
                              </span>
                            </td>
                            {/* 기간 */}
                            <td className="px-sm py-[5px] text-center text-[11px] text-content-secondary">
                              {product.duration != null ? `${product.duration}일` : '-'}
                            </td>
                            {/* 횟수 */}
                            <td className="px-sm py-[5px] text-center text-[11px] text-content-secondary">
                              {product.sessions != null ? `${product.sessions}회` : '-'}
                            </td>
                            {/* 레슨북 스타일: 요일별 ✓/✗ */}
                            {!panelOpen && (() => {
                              const ur = (product as any).usage_restrictions as UsageRestrictions | null | undefined;
                              const days = ur?.availableDays;
                              const hasDayRestriction = days && days.length > 0 && days.length < 7;
                              return DAY_LABELS_ORDERED.map(d => (
                                <td key={d.idx} className="px-[4px] py-sm text-center">
                                  {!hasDayRestriction ? (
                                    <span className="text-[11px] text-green-500 font-bold">✓</span>
                                  ) : days!.includes(d.idx) ? (
                                    <span className="text-[11px] text-green-500 font-bold">✓</span>
                                  ) : (
                                    <span className="text-[11px] text-red-400 font-bold">✗</span>
                                  )}
                                </td>
                              ));
                            })()}
                            {/* 이용 가능 시간 */}
                            {!panelOpen && (() => {
                              const ur = (product as any).usage_restrictions as UsageRestrictions | null | undefined;
                              const hasTime = ur?.availableTimeStart && ur?.availableTimeEnd;
                              return (
                                <td className="px-sm py-sm text-center text-[11px] text-content-secondary whitespace-nowrap">
                                  {hasTime ? `${ur!.availableTimeStart}~${ur!.availableTimeEnd}` : '전체'}
                                </td>
                              );
                            })()}
                            {/* 상태 */}
                            <td className="px-md py-sm text-center">
                              <StatusBadge variant={product.isActive ? 'mint' : 'default'} dot={product.isActive}>
                                {product.isActive ? '사용' : '미사용'}
                              </StatusBadge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ── 우측: 상세/편집 패널 (디테일) ── */}
            {panelOpen && (
              <div className="w-[45%] flex flex-col bg-gray-50 min-h-[500px]">
                <ProductDetailPanel
                  product={isNewMode ? null : selectedProduct}
                  isNew={isNewMode}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onClose={handlePanelClose}
                />
              </div>
            )}

            {/* 패널 닫혀있을 때 안내 메시지 (데이터 있고, 캔에딧일 때) */}
            {!panelOpen && !loading && filteredData.length > 0 && (
              <div className="hidden" /> /* 안내 없음 — 행 클릭으로 충분 */
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
