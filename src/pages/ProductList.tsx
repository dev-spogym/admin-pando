import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  CheckCircle,
  XCircle,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Save,
  X,
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
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { SearchFilter } from '@/components/SearchFilter';
import TabNav from '@/components/TabNav';
import ConfirmDialog from '@/components/ConfirmDialog';
import { moveToPage } from '@/internal';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/exportExcel';

// DB 카테고리 영문 → 한글 매핑
const CATEGORY_KO: Record<string, string> = {
  MEMBERSHIP: '이용권', PT: 'PT', GX: 'GX', ETC: '기타',
  '이용권': '이용권', '기타': '기타',
};
const toCategoryKo = (cat: string) => CATEGORY_KO[cat] ?? cat;

// 상품 타입 탭 (productType 기준)
const PRODUCT_TYPE_TABS = [
  { key: 'all',        label: '전체' },
  { key: 'MEMBERSHIP', label: '회원권' },
  { key: 'LESSON',     label: '수강권' },
  { key: 'RENTAL',     label: '대여권' },
  { key: 'GENERAL',    label: '일반' },
];

// 상품 타입 배지 스타일
const PRODUCT_TYPE_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'mint' | 'info' | 'warning' | 'error'; className: string }> = {
  MEMBERSHIP: { label: '회원권', variant: 'info',      className: 'bg-blue-100 text-blue-700' },
  LESSON:     { label: '수강권', variant: 'mint',      className: 'bg-green-100 text-green-700' },
  RENTAL:     { label: '대여권', variant: 'warning',   className: 'bg-orange-100 text-orange-700' },
  GENERAL:    { label: '일반',   variant: 'secondary', className: 'bg-gray-100 text-gray-600' },
};

// 종목 목록
const SPORT_TYPES = ['전체', '헬스', '필라테스', '요가', '수영', '복싱', '크로스핏', '기타'];

// 카테고리 탭 (하위 호환 유지)
const CATEGORY_TABS = [
  { key: 'all', label: '전체' },
  { key: '이용권', label: '이용권' },
  { key: 'PT', label: 'PT' },
  { key: 'GX', label: 'GX' },
  { key: '기타', label: '기타' },
];

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  cashPrice: number | null;
  cardPrice: number | null;
  productType: string | null;
  totalCount: number | null;
  kioskVisible: boolean | null;
  sportType: string | null;
  tag: string | null;
  duration: number | null;
  sessions: number | null;
  description: string | null;
  isActive: boolean;
  branchId: number;
  createdAt?: string;
}

type SortKey = 'name' | 'price' | 'category' | null;
type SortDir = 'asc' | 'desc';

export default function ProductList() {
  const authUser = useAuthStore((s) => s.user);
  const canEditProduct = hasFeature(authUser?.role ?? '', 'productEdit', authUser?.isSuperAdmin);

  // 최상위 탭: "상품 목록" / "분류 관리"
  const [mainTab, setMainTab] = useState<'products' | 'groups'>('products');

  // 분류 관리 상태
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', sortOrder: 0, isActive: true });
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupSaving, setGroupSaving] = useState(false);

  const fetchGroups = async () => {
    setGroupsLoading(true);
    const { data } = await getProductGroups();
    if (data) setGroups(data);
    setGroupsLoading(false);
  };

  useEffect(() => {
    if (mainTab === 'groups') fetchGroups();
  }, [mainTab]);

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

  const [activeTab, setActiveTab] = useState('all');
  const [activeTypeTab, setActiveTypeTab] = useState('all');
  const [sportFilter, setSportFilter] = useState('전체');
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<{ status: string }>({ status: '' });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const branchId = Number(localStorage.getItem('branchId')) || 1;

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('branchId', branchId)
      .eq('isActive', true)
      .order('id');
    if (!error && data) {
      setProducts(data.map(p => ({ ...p, price: Number(p.price) })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 정렬
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={13} className="text-content-tertiary ml-xs inline" />;
    return sortDir === 'asc'
      ? <ArrowUp size={13} className="text-primary ml-xs inline" />
      : <ArrowDown size={13} className="text-primary ml-xs inline" />;
  };

  // 필터 + 정렬
  const filteredData = useMemo(() => {
    let data = products.filter(item => {
      const matchTab = activeTab === 'all' || toCategoryKo(item.category) === activeTab;
      // 상품 타입 탭 필터
      const matchTypeTab = activeTypeTab === 'all' || item.productType === activeTypeTab;
      // 종목 필터
      const matchSport = sportFilter === '전체' || item.sportType === sportFilter;
      const matchSearch = item.name.toLowerCase().includes(searchValue.toLowerCase());
      return matchTab && matchTypeTab && matchSport && matchSearch;
    });
    if (sortKey) {
      data = [...data].sort((a, b) => {
        const aVal = a[sortKey as keyof Product];
        const bVal = b[sortKey as keyof Product];
        let cmp = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          cmp = aVal.localeCompare(bVal, 'ko');
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return data;
  }, [products, activeTab, searchValue, sortKey, sortDir]);

  const confirmDelete = async () => {
    if (productToDelete !== null) {
      await supabase.from('products').update({ isActive: false }).eq('id', productToDelete);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    }
  };

  // 테이블 컬럼
  const columns = [
    {
      key: 'category',
      header: (
        <button className="flex items-center cursor-pointer select-none" onClick={() => handleSort('category')}>
          카테고리<SortIcon col="category" />
        </button>
      ),
      width: '130px',
      render: (val: string, row: Product) => (
        <div className="flex items-center gap-xs flex-wrap">
          <StatusBadge variant="secondary">{toCategoryKo(val)}</StatusBadge>
          {row.productType && PRODUCT_TYPE_BADGE[row.productType] && (
            <span className={cn(
              'text-[10px] font-bold px-xs py-[1px] rounded-full',
              PRODUCT_TYPE_BADGE[row.productType].className
            )}>
              {PRODUCT_TYPE_BADGE[row.productType].label}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: (
        <button className="flex items-center cursor-pointer select-none" onClick={() => handleSort('name')}>
          상품명<SortIcon col="name" />
        </button>
      ),
      render: (val: string) => (
        <button
          className="text-[14px] font-semibold text-content hover:text-primary transition-colors text-left"
          onClick={() => moveToPage(997)}
        >
          {val}
        </button>
      ),
    },
    {
      key: 'price',
      header: (
        <button className="flex items-center cursor-pointer select-none ml-auto" onClick={() => handleSort('price')}>
          가격<SortIcon col="price" />
        </button>
      ),
      width: '130px',
      align: 'right' as const,
      render: (val: number) => (
        <span className="text-[13px] font-medium tabular-nums">₩{Number(val).toLocaleString()}</span>
      ),
    },
    {
      key: 'duration',
      header: '이용기간',
      width: '90px',
      align: 'center' as const,
      render: (val: number | null) => val != null ? `${val}일` : '-',
    },
    {
      key: 'sessions',
      header: '세션',
      width: '80px',
      align: 'center' as const,
      render: (val: number | null) => val != null ? `${val}회` : '-',
    },
    {
      key: 'isActive',
      header: '상태',
      width: '90px',
      align: 'center' as const,
      render: (val: boolean) => (
        <StatusBadge variant={val ? 'mint' : 'default'} dot={val}>
          {val ? '사용' : '미사용'}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'center' as const,
      render: (_: unknown, row: Product) => canEditProduct ? (
        <div className="flex items-center justify-center gap-xs">
          <button
            className="p-xs text-content-tertiary hover:text-accent transition-colors"
            onClick={() => moveToPage(997, { id: row.id })}
            title="수정"
          >
            <Edit2 size={15} />
          </button>
          <button
            className="p-xs text-content-tertiary hover:text-state-error transition-colors"
            onClick={() => { setProductToDelete(row.id); setDeleteDialogOpen(true); }}
            title="삭제"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : null,
    },
  ];

  const statItems = [
    {
      label: '전체 상품', value: products.length,
      icon: <Package />, variant: 'peach' as const,
    },
    {
      label: '활성 상품', value: products.filter(p => p.isActive).length,
      icon: <CheckCircle />, variant: 'mint' as const,
    },
    {
      label: '비활성', value: products.filter(p => !p.isActive).length,
      icon: <XCircle />,
    },
    {
      label: '카테고리 수', value: new Set(products.map(p => p.category)).size,
      icon: <LayoutGrid />,
    },
  ];

  // CATEGORY_TABS는 하위 호환용으로 유지 (현재 타입 탭으로 대체됨)

  return (
    <AppLayout>
      <PageHeader
        title="상품 관리"
        description="센터에서 판매하는 이용권, PT, GX 및 기타 상품을 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            {/* 탭 토글 */}
            <div className="flex rounded-lg border border-line overflow-hidden">
              {([
                { key: 'products', label: '상품 목록' },
                { key: 'groups', label: '분류 관리' },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setMainTab(t.key)}
                  className={cn(
                    'px-md py-sm text-[13px] font-semibold transition-colors',
                    mainTab === t.key ? 'bg-primary text-surface' : 'bg-surface text-content-secondary hover:bg-surface-secondary'
                  )}
                >{t.label}</button>
              ))}
            </div>
            {mainTab === 'products' && canEditProduct && (
              <button
                onClick={() => moveToPage(997)}
                className="flex items-center gap-xs px-md py-sm bg-primary text-surface rounded-button text-[13px] font-bold shadow-sm hover:bg-primary-dark transition-colors"
              >
                <Plus size={16} />
                상품 등록
              </button>
            )}
          </div>
        }
      />

      {/* 분류 관리 탭 */}
      {mainTab === 'groups' && (
        <div className="space-y-lg">
          {/* 분류 등록/수정 폼 */}
          <div className="bg-surface rounded-xl border border-line p-lg">
            <h3 className="text-[14px] font-bold text-content mb-md">{editingGroupId !== null ? '분류 수정' : '분류 등록'}</h3>
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

      {/* 상품 목록 탭 */}
      {mainTab === 'products' && <>

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

      {/* 필터 */}
      <div className="mb-lg space-y-md">
        {/* 상품 타입 탭 (MEMBERSHIP/LESSON/RENTAL/GENERAL) */}
        <TabNav
          tabs={PRODUCT_TYPE_TABS.map(tab => ({
            ...tab,
            count: tab.key === 'all'
              ? products.length
              : products.filter(p => p.productType === tab.key).length,
          }))}
          activeTab={activeTypeTab}
          onTabChange={setActiveTypeTab}
        />

        {/* 종목 필터 */}
        <div className="flex items-center gap-xs flex-wrap">
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
        </div>

        <SearchFilter
          searchPlaceholder="상품명으로 검색하세요"
          searchValue={searchValue}
          onSearchChange={val => setSearchValue(val)}
          filters={[]}
          filterValues={filterValues}
          onFilterChange={(key, val) => setFilterValues(prev => ({ ...prev, [key]: val }))}
          onReset={() => {
            setSearchValue('');
            setFilterValues({ status: '' });
            setActiveTab('all');
            setActiveTypeTab('all');
            setSportFilter('전체');
            setSortKey(null);
          }}
        />
      </div>

      {/* 상품 목록 */}
      <div className="rounded-xl bg-surface border border-line shadow-card overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          title={`총 ${filteredData.length}개의 상품`}
          onDownloadExcel={() => {
            const exportColumns = [
              { key: 'category', header: '카테고리' },
              { key: 'name', header: '상품명' },
              { key: 'price', header: '가격' },
              { key: 'duration', header: '이용기간' },
              { key: 'sessions', header: '세션' },
              { key: 'isActive', header: '상태' },
            ];
            exportToExcel(filteredData as unknown as Record<string, unknown>[], exportColumns, { filename: '상품목록' });
            toast.success(`${filteredData.length}건 엑셀 다운로드 완료`);
          }}
          pagination={{ page: 1, pageSize: 10, total: filteredData.length }}
        />
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="상품 삭제"
        description="정말로 이 상품을 삭제하시겠습니까? 삭제된 상품은 복구할 수 없습니다."
        confirmLabel="삭제하기"
        cancelLabel="취소"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
      </>}
    </AppLayout>
  );
}
