import React, { useState, useMemo } from 'react';
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';

import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import SearchFilter, { FilterOption } from '@/components/SearchFilter';
import TabNav from '@/components/TabNav';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import AppLayout from '@/components/AppLayout';

// --- Mock Data ---

const MOCK_SALES_DATA = [
  {
    id: 1,
    no: 10,
    purchaseDate: '2026-02-19 14:30:05',
    type: '회원권',
    productName: '프리미엄 12개월권',
    manager: '홍길동',
    buyer: '김철수',
    buyerId: 101,
    round: '신규',
    quantity: 1,
    originalPrice: 1200000,
    salePrice: 1000000,
    discountPrice: 200000,
    paymentMethod: '단말기연동',
    paymentType: '일시불',
    paymentTool: '카드',
    cash: 0,
    card: 1000000,
    mileage: 0,
    cardCompany: '신한카드',
    cardNumber: '4518-****-****-1234',
    approvalNo: '98237412',
    unpaid: 0,
    serviceDays: 30,
    serviceCount: 0,
    servicePoints: 0,
    status: '정상',
    category: '신규',
    memo: '오픈 이벤트 적용'
  },
  {
    id: 2,
    no: 9,
    purchaseDate: '2026-02-19 13:15:20',
    type: '수강권',
    productName: '1:1 PT 20회',
    manager: '이영희',
    buyer: '박지민',
    buyerId: 102,
    round: '재등록(2회차)',
    quantity: 1,
    originalPrice: 1500000,
    salePrice: 1300000,
    discountPrice: 200000,
    paymentMethod: '수기등록',
    paymentType: '3개월 할부',
    paymentTool: '카드',
    cash: 0,
    card: 1300000,
    mileage: 0,
    cardCompany: '국민카드',
    cardNumber: '5243-****-****-5678',
    approvalNo: '12458796',
    unpaid: 0,
    serviceDays: 0,
    serviceCount: 2,
    servicePoints: 0,
    status: '정상',
    category: '재등록',
    memo: '지인 추천 할인'
  },
  {
    id: 3,
    no: 8,
    purchaseDate: '2026-02-19 11:05:40',
    type: '락커',
    productName: '개인 사물함 6개월',
    manager: '김민수',
    buyer: '최유리',
    buyerId: 103,
    round: '신규',
    quantity: 1,
    originalPrice: 60000,
    salePrice: 50000,
    discountPrice: 10000,
    paymentMethod: '단말기연동',
    paymentType: '일시불',
    paymentTool: '현금',
    cash: 50000,
    card: 0,
    mileage: 0,
    cardCompany: '-',
    cardNumber: '-',
    approvalNo: '-',
    unpaid: 0,
    serviceDays: 7,
    serviceCount: 0,
    servicePoints: 0,
    status: '정상',
    category: '신규',
    memo: ''
  },
  {
    id: 4,
    no: 7,
    purchaseDate: '2026-02-18 17:20:10',
    type: '회원권',
    productName: '모닝 특별권 3개월',
    manager: '홍길동',
    buyer: '정현우',
    buyerId: 104,
    round: '미수금환수',
    quantity: 1,
    originalPrice: 300000,
    salePrice: 300000,
    discountPrice: 0,
    paymentMethod: '운톡마켓',
    paymentType: '일시불',
    paymentTool: '카드',
    card: 300000,
    cash: 0,
    mileage: 0,
    cardCompany: '삼성카드',
    cardNumber: '3779-****-****-9012',
    approvalNo: '77412589',
    unpaid: 100000,
    serviceDays: 0,
    serviceCount: 0,
    servicePoints: 0,
    status: '환불',
    category: '재등록',
    memo: '미수금 발생 주의'
  },
  {
    id: 5,
    no: 6,
    purchaseDate: '2026-02-18 10:00:00',
    type: '일반',
    productName: '단백질 쉐이크(초코)',
    manager: '관리자',
    buyer: '이철수',
    buyerId: 105,
    round: '신규',
    quantity: 2,
    originalPrice: 10000,
    salePrice: 9000,
    discountPrice: 1000,
    paymentMethod: '수기등록',
    paymentType: '일시불',
    paymentTool: '마일리지',
    cash: 0,
    card: 0,
    mileage: 9000,
    cardCompany: '-',
    cardNumber: '-',
    approvalNo: '-',
    unpaid: 0,
    serviceDays: 0,
    serviceCount: 0,
    servicePoints: 500,
    status: '정상',
    category: '신규',
    memo: '마일리지 전액 결제'
  }
];

// 기간 프리셋 계산 유틸
const getPresetRange = (preset: string): { start: string; end: string } => {
  const today = new Date('2026-03-11');
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (preset === '오늘') {
    return { start: fmt(today), end: fmt(today) };
  }
  if (preset === '이번주') {
    const day = today.getDay(); // 0=일
    const mon = new Date(today);
    mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: fmt(mon), end: fmt(sun) };
  }
  if (preset === '이번달') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  }
  if (preset === '이번분기') {
    const q = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), q * 3, 1);
    const end = new Date(today.getFullYear(), q * 3 + 3, 0);
    return { start: fmt(start), end: fmt(end) };
  }
  return { start: fmt(today), end: fmt(today) };
};

export default function Sales() {
  const [activeTab, setActiveTab] = useState('TAB-001');
  const [searchValue, setSearchValue] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateRangeStart: '2026-02-01',
    dateRangeEnd: '2026-02-28'
  });

  const handlePreset = (preset: string) => {
    if (preset === '커스텀') {
      setActivePreset('커스텀');
      return;
    }
    const { start, end } = getPresetRange(preset);
    setActivePreset(preset);
    setFilterValues(prev => ({ ...prev, dateRangeStart: start, dateRangeEnd: end }));
  };

  // --- Filtering & Logic ---
  const filteredData = useMemo(() => {
    return MOCK_SALES_DATA.filter(item => {
      const matchSearch = item.buyer.includes(searchValue) || item.productName.includes(searchValue);
      const matchType = !filterValues.productType || filterValues.productType === '전체' || item.type === filterValues.productType;
      const matchMethod = !filterValues.paymentMethod || filterValues.paymentMethod === '전체' || item.paymentMethod === filterValues.paymentMethod;
      
      // 탭에 따른 필터링 (간단 예시)
      if (activeTab === 'TAB-006' && item.status !== '환불') return false;
      if (activeTab === 'TAB-007' && item.unpaid <= 0) return false;
      
      return matchSearch && matchType && matchMethod;
    });
  }, [searchValue, filterValues, activeTab]);

  const summary = useMemo(() => {
    const raw = filteredData.reduce((acc, curr) => {
      // 환불 항목은 총매출에서 제외하고 refund에만 합산
      if (curr.status !== '환불') {
        acc.total += curr.salePrice;
      }
      acc.card += curr.card;
      acc.cash += curr.cash;
      acc.mileage += curr.mileage;
      acc.unpaid += curr.unpaid;
      acc.discount += curr.discountPrice;
      if (curr.status === '환불') acc.refund += curr.salePrice;
      return acc;
    }, { total: 0, card: 0, cash: 0, mileage: 0, unpaid: 0, discount: 0, refund: 0 });
    // 순매출 = 매출 합계 - 환불 금액
    return { ...raw, netTotal: raw.total - raw.refund };
  }, [filteredData]);

  // --- Table Columns ---
  const columns = [
    { key: 'no', header: 'No', width: 60, align: 'center' as const },
    { key: 'purchaseDate', header: '구매일', width: 180 },
    { key: 'type', header: '타입', width: 100, align: 'center' as const },
    { 
      key: 'productName', 
      header: '상품명', 
      width: 200,
      render: (val: string) => (
        <button 
          className="text-text-dark-grey hover:text-secondary-mint hover:underline font-medium text-left" onClick={() => moveToPage(971)}>
          {val}
        </button>
      )
    },
    { key: 'manager', header: '결제 담당자', width: 120 },
    { 
      key: 'buyer', 
      header: '구매자', 
      width: 120,
      render: (val: string, row: any) => (
        <button 
          className="text-primary-coral hover:underline font-medium" onClick={() => moveToPage(985)}>
          {val}
        </button>
      )
    },
    { key: 'round', header: '회차', width: 120, align: 'center' as const },
    { key: 'quantity', header: '수량', width: 60, align: 'center' as const },
    { key: 'originalPrice', header: '정가', width: 120, align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { key: 'salePrice', header: '판매 금액', width: 120, align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { key: 'discountPrice', header: '할인 금액', width: 120, align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { key: 'paymentMethod', header: '결제 방식', width: 120 },
    { key: 'paymentType', header: '결제 타입', width: 120 },
    { key: 'paymentTool', header: '결제 수단', width: 100, align: 'center' as const },
    { key: 'cash', header: '현금', width: 100, align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { key: 'card', header: '카드', width: 100, align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { key: 'mileage', header: '마일리지', width: 100, align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { key: 'cardCompany', header: '카드사', width: 100 },
    { key: 'cardNumber', header: '카드번호', width: 150 },
    { key: 'approvalNo', header: '승인번호', width: 120 },
    { 
      key: 'unpaid', 
      header: '미수금', 
      width: 100, 
      align: 'right' as const, 
      render: (v: number) => <span className={v > 0 ? "text-error font-bold" : ""} >{v.toLocaleString()}</span> 
    },
    { key: 'serviceDays', header: '서비스(일)', width: 100, align: 'center' as const },
    { key: 'serviceCount', header: '서비스(횟수)', width: 100, align: 'center' as const },
    { key: 'servicePoints', header: '서비스(포인트)', width: 120, align: 'center' as const },
    { 
      key: 'status', 
      header: '상태', 
      width: 100, 
      align: 'center' as const,
      render: (val: string) => (
        <StatusBadge variant={val === '정상' ? 'success' : 'error'} dot={true}>{val}</StatusBadge>
      )
    },
    { key: 'category', header: '구분', width: 100, align: 'center' as const },
    { key: 'memo', header: '메모', width: 200 }
  ];

  const filters: FilterOption[] = [
    {
      key: 'dateRange',
      label: '날짜 범위',
      type: 'dateRange'
    },
    {
      key: 'paymentMethod',
      label: '결제 방식',
      type: 'select',
      options: [
        { value: '전체', label: '전체' },
        { value: '수기등록', label: '수기등록' },
        { value: '단말기연동', label: '단말기연동' },
        { value: '운톡마켓', label: '운톡마켓' }
      ]
    },
    {
      key: 'productType',
      label: '상품 유형',
      type: 'select',
      options: [
        { value: '전체', label: '전체' },
        { value: '회원권', label: '회원권' },
        { value: '수강권', label: '수강권' },
        { value: '락커', label: '락커' },
        { value: '운동복', label: '운동복' },
        { value: '일반', label: '일반' }
      ]
    }
  ];

  const tabs = [
    { key: 'TAB-001', label: '매출 내역' },
    { key: 'TAB-002', label: '기간별 매출' },
    { key: 'TAB-003', label: '상품별 내역' },
    { key: 'TAB-004', label: '결제수단별 내역' },
    { key: 'TAB-005', label: '담당자별 매출' },
    { key: 'TAB-006', label: '환불 내역', count: filteredData.filter(i => i.status === '환불').length },
    { key: 'TAB-007', label: '미수금 내역', count: filteredData.filter(i => i.unpaid > 0).length },
    { key: 'TAB-008', label: '미완료 내역' },
    { key: 'TAB-009', label: '선수익금' }
  ];

  const handleDownloadExcel = () => {
    const headers = ['날짜', '회원명', '상품명', '금액', '결제방식', '상태'];
    const rows = filteredData.map(item => [
      item.purchaseDate,
      item.buyer,
      item.productName,
      item.salePrice,
      item.paymentMethod,
      item.status,
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `매출내역_${filterValues.dateRangeStart}_${filterValues.dateRangeEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout >
      <PageHeader title="매출 현황" description="센터의 매출 거래 전체를 조회하고 분석합니다." actions={
          <div className="flex items-center gap-sm">
            <button
              onClick={() => moveToPage(982)}
              className="flex items-center gap-xs px-md py-sm bg-secondary-mint text-white hover:bg-opacity-90 transition-all rounded-button text-Label font-semibold shadow-sm"
            >
              <CreditCard size={16} />
              신규 결제 (POS)
            </button>
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-xs px-md py-sm bg-bg-soft-mint text-secondary-mint hover:bg-secondary-mint hover:text-white transition-all rounded-button text-Label font-semibold shadow-sm"
            >
              <Download size={16} />
              Excel 다운로드
            </button>
          </div>
        }/>

      {/* 요약 카드 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-md mb-xl" >
        <StatCard label="순 매출" value={`₩${summary.netTotal.toLocaleString()}`} variant="peach" icon={<DollarSign />} change={{ value: 12.5, label: "전월 대비" }}/>
        <StatCard label="카드 결제" value={`₩${summary.card.toLocaleString()}`} icon={<CreditCard />}/>
        <StatCard label="현금 결제" value={`₩${summary.cash.toLocaleString()}`} icon={<Wallet />}/>
        <StatCard label="마일리지 사용" value={`₩${summary.mileage.toLocaleString()}`} icon={<AlertCircle className="text-information" />}/>
        <StatCard
          className="border-error/20" label="미수금" value={`₩${summary.unpaid.toLocaleString()}`} variant="default" icon={<AlertCircle className="text-error" />}/>
      </div>

      {/* 차트 영역 (Mock) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md mb-xl" >
        <div className="bg-3 p-lg rounded-card-normal border border-border-light shadow-card-soft" >
          <div className="flex items-center justify-between mb-lg" >
            <h3 className="text-Heading 2 text-text-dark-grey font-bold" >일별 매출 현황</h3>
            <div className="flex items-center gap-sm text-Label text-text-grey-blue" >
              <div className="flex items-center gap-xs" ><span className="w-xs h-xs bg-primary-coral rounded-full" /> 총매출</div>
              <div className="flex items-center gap-xs" ><span className="w-xs h-xs bg-secondary-mint rounded-full" /> 카드매출</div>
            </div>
          </div>
          <div className="h-[200px] w-full flex items-end justify-between px-md pb-md border-b border-border-light relative" >
             {/* Simple Mock Bar Chart */}
             {[40, 65, 30, 85, 55, 90, 75].map((h, i) => (
               <div className="flex flex-col items-center gap-xs w-full max-w-[40px]" key={i}>
                  <div className="w-full flex gap-[2px] items-end justify-center h-full" >
                    <div className="bg-primary-coral/40 w-[12px] rounded-t-sm" style={{ height: `${h}%` }}/>
                    <div className="bg-secondary-mint/40 w-[12px] rounded-t-sm" style={{ height: `${h*0.7}%` }}/>
                  </div>
                  <span className="text-[10px] text-text-grey-blue" >02.{14+i}</span>
               </div>
             ))}
          </div>
        </div>
        <div className="bg-3 p-lg rounded-card-normal border border-border-light shadow-card-soft" >
          <h3 className="text-Heading 2 text-text-dark-grey font-bold mb-lg" >상품별 매출 비중</h3>
          <div className="flex items-center justify-around h-[200px]" >
            <div className="relative w-[150px] h-[150px] rounded-full border-[15px] border-bg-main-light-blue flex items-center justify-center" >
               <div className="absolute inset-[-15px] rounded-full border-[15px] border-primary-coral border-l-transparent border-b-transparent rotate-45" />
               <div className="text-center" >
                  <p className="text-Heading 2 font-bold text-text-dark-grey" >68%</p>
                  <p className="text-Label text-text-grey-blue" >회원권</p>
               </div>
            </div>
            <div className="space-y-sm" >
              <div className="flex items-center gap-sm" >
                <div className="w-sm h-sm bg-primary-coral rounded-full" />
                <span className="text-Body 2 text-text-dark-grey" >회원권 (68%)</span>
              </div>
              <div className="flex items-center gap-sm" >
                <div className="w-sm h-sm bg-secondary-mint rounded-full" />
                <span className="text-Body 2 text-text-dark-grey" >수강권 (22%)</span>
              </div>
              <div className="flex items-center gap-sm" >
                <div className="w-sm h-sm bg-information rounded-full" />
                <span className="text-Body 2 text-text-dark-grey" >기타 (10%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 목록 영역 */}
      <div className="space-y-md" >
        {/* 기간 프리셋 버튼 그룹 */}
        <div className="flex items-center gap-xs flex-wrap">
          {['오늘', '이번주', '이번달', '이번분기', '커스텀'].map(preset => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              className={cn(
                'px-md py-xs rounded-button text-Label font-semibold transition-all border',
                activePreset === preset
                  ? 'bg-primary-coral text-white border-primary-coral shadow-sm'
                  : 'bg-white text-text-grey-blue border-border-light hover:border-primary-coral hover:text-primary-coral'
              )}
            >
              {preset}
            </button>
          ))}
        </div>

        <SearchFilter searchValue={searchValue} onSearchChange={setSearchValue} onSearch={(v) => console.log('Search:', v)} filters={filters} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(prev => ({ ...prev, [k]: v }))} onReset={() => {
            setSearchValue('');
            setActivePreset(null);
            setFilterValues({ dateRangeStart: '2026-02-01', dateRangeEnd: '2026-02-28' });
          }}/>

        <div className="bg-3 rounded-card-normal border border-border-light overflow-hidden shadow-card-soft" >
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>
          <DataTable columns={columns} data={filteredData} pagination={{
              page: 1,
              pageSize: 10,
              total: filteredData.length
            }}/>
        </div>
      </div>

      {/* 하단 요약 바 */}
      <div className="mt-xl p-lg bg-3 rounded-card-normal border border-border-light shadow-card-soft flex flex-wrap items-center justify-between gap-xl" >
        <div className="flex gap-xxl" >
          <div >
            <p className="text-Label text-text-grey-blue mb-xs" >총 매출액</p>
            <p className="text-Heading 2 font-bold text-primary-coral" >₩{summary.total.toLocaleString()}</p>
          </div>
          <div >
            <p className="text-Label text-text-grey-blue mb-xs" >순 매출액 <span className="text-[10px]">(환불 차감)</span></p>
            <p className="text-Heading 2 font-bold text-secondary-mint" >₩{summary.netTotal.toLocaleString()}</p>
          </div>
          <div className="h-xxl w-[1px] bg-border-light hidden sm:block" />
          <div >
            <p className="text-Label text-text-grey-blue mb-xs" >현금 합계</p>
            <p className="text-Heading 2 font-bold text-text-dark-grey" >₩{summary.cash.toLocaleString()}</p>
          </div>
          <div >
            <p className="text-Label text-text-grey-blue mb-xs" >카드 합계</p>
            <p className="text-Heading 2 font-bold text-text-dark-grey" >₩{summary.card.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-xl" >
          <div className="text-right" >
            <p className="text-Label text-text-grey-blue mb-xs" >환불 금액</p>
            <p className="text-Body 1 font-semibold text-error" >₩{summary.refund.toLocaleString()}</p>
          </div>
          <div className="text-right" >
            <p className="text-Label text-text-grey-blue mb-xs" >미수금</p>
            <p className="text-Body 1 font-semibold text-error" >₩{summary.unpaid.toLocaleString()}</p>
          </div>
          <div className="text-right" >
            <p className="text-Label text-text-grey-blue mb-xs" >할인액</p>
            <p className="text-Body 1 font-semibold text-text-grey-blue" >₩{summary.discount.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
