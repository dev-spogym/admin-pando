import React, { useState, useMemo } from 'react';
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

// --- Mock 데이터 (8건 이상) ---
const CATEGORY_TABS = [
  { key: 'all', label: '전체' },
  { key: '이용권', label: '이용권' },
  { key: 'PT', label: 'PT' },
  { key: 'GX', label: 'GX' },
  { key: '기타', label: '기타' },
];

interface Product {
  id: number;
  category: string;
  name: string;
  cashPrice: number;
  cardPrice: number;
  period: string;
  status: '사용' | '미사용';
  kioskExposure: boolean;
  createdAt: string;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1, category: '이용권', name: '헬스 12개월 (연간 회원권)',
    cashPrice: 660000, cardPrice: 726000, period: '12개월',
    status: '사용', kioskExposure: true, createdAt: '2026-01-15',
  },
  {
    id: 2, category: '이용권', name: '헬스 3개월권',
    cashPrice: 297000, cardPrice: 326700, period: '3개월',
    status: '사용', kioskExposure: true, createdAt: '2026-01-20',
  },
  {
    id: 3, category: '이용권', name: '헬스 일일 입장권',
    cashPrice: 10000, cardPrice: 11000, period: '1일',
    status: '미사용', kioskExposure: false, createdAt: '2025-11-30',
  },
  {
    id: 4, category: 'PT', name: '1:1 PT 20회 패키지',
    cashPrice: 1200000, cardPrice: 1320000, period: '90일',
    status: '사용', kioskExposure: false, createdAt: '2025-12-20',
  },
  {
    id: 5, category: 'PT', name: '1:1 PT 10회 패키지',
    cashPrice: 700000, cardPrice: 770000, period: '60일',
    status: '사용', kioskExposure: false, createdAt: '2026-02-01',
  },
  {
    id: 6, category: 'GX', name: '그룹 필라테스 20회',
    cashPrice: 396000, cardPrice: 435600, period: '3개월',
    status: '사용', kioskExposure: true, createdAt: '2026-02-10',
  },
  {
    id: 7, category: 'GX', name: '요가 그룹수업 10회',
    cashPrice: 180000, cardPrice: 198000, period: '2개월',
    status: '사용', kioskExposure: true, createdAt: '2026-02-15',
  },
  {
    id: 8, category: '기타', name: '개인 락커 1개월',
    cashPrice: 10000, cardPrice: 11000, period: '1개월',
    status: '사용', kioskExposure: true, createdAt: '2026-01-05',
  },
  {
    id: 9, category: '기타', name: '운동복 대여 1개월',
    cashPrice: 5000, cardPrice: 5500, period: '1개월',
    status: '사용', kioskExposure: true, createdAt: '2026-01-10',
  },
  {
    id: 10, category: '기타', name: '스포츠 타올',
    cashPrice: 5000, cardPrice: 5500, period: '-',
    status: '미사용', kioskExposure: false, createdAt: '2025-12-01',
  },
];

type SortKey = 'name' | 'cashPrice' | 'category' | 'status' | null;
type SortDir = 'asc' | 'desc';

export default function ProductList() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<{ status: string }>({ status: '' });
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // 키오스크 노출 토글
  const handleKioskToggle = (id: number) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, kioskExposure: !p.kioskExposure } : p))
    );
  };

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
      const matchTab = activeTab === 'all' || item.category === activeTab;
      const matchSearch = item.name.toLowerCase().includes(searchValue.toLowerCase());
      const matchStatus = filterValues.status === '' || item.status === filterValues.status;
      return matchTab && matchSearch && matchStatus;
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
  }, [products, activeTab, searchValue, filterValues, sortKey, sortDir]);

  const confirmDelete = () => {
    if (productToDelete !== null) {
      setProducts(prev => prev.filter(p => p.id !== productToDelete));
      setDeleteDialogOpen(false);
      setProductToDelete(null);
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
      render: (val: string) => <StatusBadge variant="secondary">{val}</StatusBadge>,
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
          onClick={() => moveToPage(987)}
        >
          {val}
        </button>
      ),
    },
    {
      key: 'cashPrice',
      header: (
        <button className="flex items-center cursor-pointer select-none ml-auto" onClick={() => handleSort('cashPrice')}>
          현금가<SortIcon col="cashPrice" />
        </button>
      ),
      width: '130px',
      align: 'right' as const,
      render: (val: number) => (
        <span className="text-[13px] font-medium tabular-nums">₩{val.toLocaleString()}</span>
      ),
    },
    {
      key: 'cardPrice',
      header: '카드가',
      width: '130px',
      align: 'right' as const,
      render: (val: number) => (
        <span className="text-[13px] font-medium tabular-nums">₩{val.toLocaleString()}</span>
      ),
    },
    {
      key: 'period',
      header: '이용기간',
      width: '90px',
      align: 'center' as const,
    },
    {
      key: 'kioskExposure',
      header: '키오스크',
      width: '100px',
      align: 'center' as const,
      render: (val: boolean, row: Product) => (
        <button
          onClick={() => handleKioskToggle(row.id)}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
            val ? 'bg-accent' : 'bg-line'
          )}
          title={val ? '노출 중 (클릭하여 숨김)' : '숨김 (클릭하여 노출)'}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform',
              val ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
      ),
    },
    {
      key: 'status',
      header: (
        <button className="flex items-center cursor-pointer select-none" onClick={() => handleSort('status')}>
          상태<SortIcon col="status" />
        </button>
      ),
      width: '90px',
      align: 'center' as const,
      render: (val: string) => (
        <StatusBadge variant={val === '사용' ? 'mint' : 'default'} dot={val === '사용'}>
          {val}
        </StatusBadge>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '110px',
      align: 'center' as const,
      render: (val: string) => <span className="text-[12px] text-content-tertiary">{val}</span>,
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
            onClick={() => moveToPage(987)}
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
      label: '판매 중', value: products.filter(p => p.status === '사용').length,
      icon: <CheckCircle />, variant: 'mint' as const,
    },
    {
      label: '미판매', value: products.filter(p => p.status === '미사용').length,
      icon: <XCircle />,
    },
    {
      label: '키오스크 노출', value: products.filter(p => p.kioskExposure).length,
      icon: <LayoutGrid />,
    },
  ];

  const tabsWithCount = CATEGORY_TABS.map(tab => ({
    ...tab,
    count: tab.key === 'all'
      ? products.length
      : products.filter(p => p.category === tab.key).length,
  }));

  return (
    <AppLayout>
      <PageHeader
        title="상품 관리"
        description="센터에서 판매하는 이용권, PT, GX 및 기타 상품을 관리합니다."
        actions={
          <button
            onClick={() => moveToPage(987)}
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
          filters={[
            {
              key: 'status',
              label: '사용 상태',
              type: 'select',
              options: [
                { value: '사용', label: '판매 중' },
                { value: '미사용', label: '미판매' },
              ],
            },
          ]}
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
          title={`총 ${filteredData.length}개의 상품`}
          onDownloadExcel={() => alert('엑셀 다운로드를 시작합니다.')}
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
