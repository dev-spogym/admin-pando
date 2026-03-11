import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  CheckCircle,
  XCircle,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
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

// --- Mock Data ---
const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'facility', label: '시설이용' },
  { key: 'pt', label: '1:1수업' },
  { key: 'group', label: '그룹수업' },
  { key: 'option', label: '옵션' },
];

const INITIAL_PRODUCTS = [
  {
    id: 1,
    category: '시설이용',
    categoryKey: 'facility',
    subCategory: '헬스',
    name: '헬스 12개월 (연간회원권)',
    cashPrice: 600000,
    cardPrice: 660000,
    period: '12개월',
    kioskExposure: true,
    status: '사용',
    createdAt: '2026-01-15',
  },
  {
    id: 2,
    category: '시설이용',
    categoryKey: 'facility',
    subCategory: '골프',
    name: '골프 3개월 패키지',
    cashPrice: 450000,
    cardPrice: 495000,
    period: '3개월',
    kioskExposure: true,
    status: '사용',
    createdAt: '2026-02-01',
  },
  {
    id: 3,
    category: '1:1수업',
    categoryKey: 'pt',
    subCategory: 'PT',
    name: 'PT 20회 (바디프로필반)',
    cashPrice: 1200000,
    cardPrice: 1320000,
    period: '90일',
    kioskExposure: false,
    status: '사용',
    createdAt: '2025-12-20',
  },
  {
    id: 4,
    category: '그룹수업',
    categoryKey: 'group',
    subCategory: '그룹필라테스',
    name: '그룹필라테스 24회',
    cashPrice: 480000,
    cardPrice: 528000,
    period: '6개월',
    kioskExposure: true,
    status: '사용',
    createdAt: '2026-02-10',
  },
  {
    id: 5,
    category: '옵션',
    categoryKey: 'option',
    subCategory: '개인락카',
    name: '개인락카 1개월',
    cashPrice: 10000,
    cardPrice: 11000,
    period: '1개월',
    kioskExposure: true,
    status: '사용',
    createdAt: '2026-01-05',
  },
  {
    id: 6,
    category: '시설이용',
    categoryKey: 'facility',
    subCategory: '헬스',
    name: '헬스 일일입장권',
    cashPrice: 20000,
    cardPrice: 22000,
    period: '1일',
    kioskExposure: true,
    status: '미사용',
    createdAt: '2025-11-30',
  },
];

type SortKey = 'name' | 'cashPrice' | 'category' | 'status' | null;
type SortDir = 'asc' | 'desc';

export default function ProductList() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState({ status: '' });
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // --- 정렬 핸들러 ---
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={14} className="text-text-grey-blue/50 ml-xs inline" />;
    return sortDir === 'asc'
      ? <ArrowUp size={14} className="text-primary-coral ml-xs inline" />
      : <ArrowDown size={14} className="text-primary-coral ml-xs inline" />;
  };

  // --- Handlers ---
  const handleSearch = (value: string) => setSearchValue(value);
  const handleFilterChange = (key: string, value: any) => setFilterValues(prev => ({ ...prev, [key]: value }));
  const handleReset = () => { setSearchValue(''); setFilterValues({ status: '' }); setActiveTab('all'); setSortKey(null); };
  const handleDeleteClick = (id: number) => { setProductToDelete(id); setDeleteDialogOpen(true); };
  const confirmDelete = () => {
    if (productToDelete !== null) {
      setProducts(prev => prev.filter(p => p.id !== productToDelete));
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // --- Filtered & Sorted Data ---
  const filteredData = useMemo(() => {
    let data = products.filter(item => {
      const matchTab = activeTab === 'all' || item.categoryKey === activeTab;
      const matchSearch = item.name.toLowerCase().includes(searchValue.toLowerCase());
      const matchStatus = filterValues.status === '' || item.status === filterValues.status;
      return matchTab && matchSearch && matchStatus;
    });

    if (sortKey) {
      data = [...data].sort((a, b) => {
        let aVal: any = a[sortKey as keyof typeof a];
        let bVal: any = b[sortKey as keyof typeof b];
        if (typeof aVal === 'string') aVal = aVal.localeCompare(bVal, 'ko');
        else aVal = aVal - bVal;
        if (typeof aVal === 'number') {
          return sortDir === 'asc' ? aVal : -aVal;
        }
        return sortDir === 'asc' ? aVal : -aVal;
      });
    }

    return data;
  }, [products, activeTab, searchValue, filterValues, sortKey, sortDir]);

  // --- Table Columns ---
  const columns = [
    {
      key: 'category',
      header: (
        <button className="flex items-center cursor-pointer select-none" onClick={() => handleSort('category')}>
          카테고리<SortIcon col="category" />
        </button>
      ),
      width: '120px',
      render: (val: string) => <span className="text-Body-2 font-medium text-text-dark-grey" >{val}</span>,
    },
    {
      key: 'subCategory',
      header: '하위분류',
      width: '120px',
      render: (val: string) => <span className="text-Body-2 text-text-grey-blue" >{val}</span>,
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
          className="text-Body-1 font-semibold text-text-dark-grey hover:text-primary-coral transition-colors text-left" onClick={() => moveToPage(987)}>
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
      width: '140px',
      align: 'right' as const,
      render: (val: number) => <span className="text-Body-2 font-medium" >₩{val.toLocaleString()}</span>,
    },
    {
      key: 'cardPrice',
      header: '카드가',
      width: '140px',
      align: 'right' as const,
      render: (val: number) => <span className="text-Body-2 font-medium" >₩{val.toLocaleString()}</span>,
    },
    {
      key: 'period',
      header: '이용기간',
      width: '100px',
      align: 'center' as const,
    },
    {
      key: 'kioskExposure',
      header: '키오스크',
      width: '100px',
      align: 'center' as const,
      render: (val: boolean) => (
        <StatusBadge variant={val ? 'mint' : 'default'} label={val ? '노출' : '미노출'} dot={val}/>
      ),
    },
    {
      key: 'status',
      header: (
        <button className="flex items-center cursor-pointer select-none" onClick={() => handleSort('status')}>
          상태<SortIcon col="status" />
        </button>
      ),
      width: '100px',
      align: 'center' as const,
      render: (val: string) => (
        <StatusBadge variant={val === '사용' ? 'mint' : 'peach'} label={val}/>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '120px',
      align: 'center' as const,
      render: (val: string) => <span className="text-Label text-text-grey-blue" >{val}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'center' as const,
      render: (_: any, row: any) => (
        <div className="flex items-center justify-center gap-xs" >
          <button
            className="p-xs text-text-grey-blue hover:text-secondary-mint transition-colors" onClick={() => moveToPage(987)} title="수정">
            <Edit2 size={16}/>
          </button>
          <button
            className="p-xs text-text-grey-blue hover:text-error transition-colors" onClick={() => handleDeleteClick(row.id)} title="삭제">
            <Trash2 size={16}/>
          </button>
        </div>
      ),
    },
  ];

  const statItems = [
    { label: '전체 상품', value: products.length, icon: <Package className="text-primary-coral" size={24}/>, variant: 'peach' as const },
    { label: '판매 중', value: products.filter(p => p.status === '사용').length, icon: <CheckCircle className="text-secondary-mint" size={24}/>, variant: 'mint' as const },
    { label: '미판매', value: products.filter(p => p.status === '미사용').length, icon: <XCircle className="text-text-grey-blue" size={24}/> },
    { label: '키오스크 노출', value: products.filter(p => p.kioskExposure).length, icon: <LayoutGrid className="text-information" size={24}/>, variant: 'default' as const },
  ];

  return (
    <AppLayout >
      <PageHeader title="상품 관리" description="센터에서 판매하는 회원권, 수업권 및 옵션 상품을 구성하고 관리합니다." actions={
          <button
            onClick={() => moveToPage(987)}
            className="flex items-center gap-xs rounded-button bg-primary-coral px-lg py-md text-Body-2 font-bold text-white shadow-sm hover:opacity-90 transition-all"
          >
            <Plus size={18} />
            상품 등록
          </button>
        }/>

      {/* 통계 요약 */}
      <div className="mb-xl grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4" >
        {statItems.map((stat, idx) => (
          <StatCard key={idx} label={stat.label} value={stat.value} icon={stat.icon} variant={stat.variant}/>
        ))}
      </div>

      {/* 필터 섹션 */}
      <div className="mb-lg space-y-md" >
        <TabNav tabs={CATEGORIES} activeTab={activeTab} onTabChange={setActiveTab}/>

        <SearchFilter searchPlaceholder="상품명으로 검색하세요" searchValue={searchValue} onSearchChange={handleSearch} filters={[
            {
              key: 'status',
              label: '사용 상태',
              type: 'select',
              options: [
                { value: '사용', label: '사용' },
                { value: '미사용', label: '미사용' },
              ]
            }
          ]} filterValues={filterValues} onFilterChange={handleFilterChange} onReset={handleReset}/>
      </div>

      {/* 상품 목록 */}
      <div className="rounded-card-normal bg-3 shadow-card-soft" >
        <DataTable columns={columns} data={filteredData} title={`총 ${filteredData.length}개의 상품`} onDownloadExcel={() => alert('엑셀 다운로드를 시작합니다.')} pagination={{
            page: 1,
            pageSize: 10,
            total: filteredData.length
          }}/>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog open={deleteDialogOpen} title="상품 삭제" description="정말로 이 상품을 삭제하시겠습니까? 삭제된 상품은 복구할 수 없습니다." confirmLabel="삭제하기" cancelLabel="취소" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleteDialogOpen(false)}/>
    </AppLayout>
  );
}
