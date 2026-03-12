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
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
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
  const [activeTab, setActiveTab] = useState('all');
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
      const matchSearch = item.name.toLowerCase().includes(searchValue.toLowerCase());
      return matchTab && matchSearch;
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
      width: '110px',
      render: (val: string) => <StatusBadge variant="secondary">{toCategoryKo(val)}</StatusBadge>,
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
      render: (_: unknown, row: Product) => (
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
      ),
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

  const tabsWithCount = CATEGORY_TABS.map(tab => ({
    ...tab,
    count: tab.key === 'all'
      ? products.length
      : products.filter(p => toCategoryKo(p.category) === tab.key).length,
  }));

  return (
    <AppLayout>
      <PageHeader
        title="상품 관리"
        description="센터에서 판매하는 이용권, PT, GX 및 기타 상품을 관리합니다."
        actions={
          <button
            onClick={() => moveToPage(997)}
            className="flex items-center gap-xs px-md py-sm bg-primary text-surface rounded-button text-[13px] font-bold shadow-sm hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} />
            상품 등록
          </button>
        }
      />

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
        <TabNav tabs={tabsWithCount} activeTab={activeTab} onTabChange={setActiveTab} />
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
    </AppLayout>
  );
}
