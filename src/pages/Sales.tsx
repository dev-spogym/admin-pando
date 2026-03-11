import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Download,
  DollarSign,
  CreditCard,
  Wallet,
  AlertCircle,
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

// --- Mock 매출 데이터 (10건 이상) ---
const MOCK_SALES_DATA = [
  {
    id: 1, no: 12, purchaseDate: '2026-03-11 09:10:00',
    type: '이용권', productName: '헬스 12개월권', manager: '홍길동',
    buyer: '김태희', buyerId: 101, round: '신규', quantity: 1,
    originalPrice: 720000, salePrice: 660000, discountPrice: 60000,
    paymentMethod: '단말기연동', paymentType: '일시불', paymentTool: '카드',
    cash: 0, card: 660000, mileage: 0,
    cardCompany: '신한카드', cardNumber: '4518-****-****-1234', approvalNo: '98237412',
    unpaid: 0, serviceDays: 0, serviceCount: 0, servicePoints: 500,
    status: '완료', category: '신규', memo: '오픈 이벤트 적용'
  },
  {
    id: 2, no: 11, purchaseDate: '2026-03-10 14:30:00',
    type: 'PT', productName: '1:1 PT 20회', manager: '이영희',
    buyer: '박지민', buyerId: 102, round: '재등록(2회차)', quantity: 1,
    originalPrice: 1500000, salePrice: 1300000, discountPrice: 200000,
    paymentMethod: '수기등록', paymentType: '3개월 할부', paymentTool: '카드',
    cash: 0, card: 1300000, mileage: 0,
    cardCompany: '국민카드', cardNumber: '5243-****-****-5678', approvalNo: '12458796',
    unpaid: 0, serviceDays: 0, serviceCount: 2, servicePoints: 0,
    status: '완료', category: '재등록', memo: '지인 추천 할인'
  },
  {
    id: 3, no: 10, purchaseDate: '2026-03-10 11:05:00',
    type: '상품', productName: '개인 락커 6개월', manager: '김민수',
    buyer: '최유리', buyerId: 103, round: '신규', quantity: 1,
    originalPrice: 60000, salePrice: 50000, discountPrice: 10000,
    paymentMethod: '단말기연동', paymentType: '일시불', paymentTool: '현금',
    cash: 50000, card: 0, mileage: 0,
    cardCompany: '-', cardNumber: '-', approvalNo: '-',
    unpaid: 0, serviceDays: 7, serviceCount: 0, servicePoints: 0,
    status: '완료', category: '신규', memo: ''
  },
  {
    id: 4, no: 9, purchaseDate: '2026-03-09 17:20:00',
    type: '이용권', productName: '모닝 특별권 3개월', manager: '홍길동',
    buyer: '정현우', buyerId: 104, round: '미수금환수', quantity: 1,
    originalPrice: 300000, salePrice: 300000, discountPrice: 0,
    paymentMethod: '수기등록', paymentType: '일시불', paymentTool: '카드',
    cash: 0, card: 300000, mileage: 0,
    cardCompany: '삼성카드', cardNumber: '3779-****-****-9012', approvalNo: '77412589',
    unpaid: 100000, serviceDays: 0, serviceCount: 0, servicePoints: 0,
    status: '미납', category: '재등록', memo: '미수금 발생 주의'
  },
  {
    id: 5, no: 8, purchaseDate: '2026-03-09 10:00:00',
    type: '상품', productName: '단백질 쉐이크(초코)', manager: '관리자',
    buyer: '이철수', buyerId: 105, round: '신규', quantity: 2,
    originalPrice: 10000, salePrice: 9000, discountPrice: 1000,
    paymentMethod: '수기등록', paymentType: '일시불', paymentTool: '마일리지',
    cash: 0, card: 0, mileage: 9000,
    cardCompany: '-', cardNumber: '-', approvalNo: '-',
    unpaid: 0, serviceDays: 0, serviceCount: 0, servicePoints: 500,
    status: '완료', category: '신규', memo: '마일리지 전액 결제'
  },
  {
    id: 6, no: 7, purchaseDate: '2026-03-08 15:45:00',
    type: 'PT', productName: '1:1 PT 10회', manager: '이영희',
    buyer: '홍길동', buyerId: 106, round: '신규', quantity: 1,
    originalPrice: 880000, salePrice: 800000, discountPrice: 80000,
    paymentMethod: '단말기연동', paymentType: '일시불', paymentTool: '카드',
    cash: 0, card: 800000, mileage: 0,
    cardCompany: '하나카드', cardNumber: '9811-****-****-3344', approvalNo: '55218844',
    unpaid: 0, serviceDays: 0, serviceCount: 0, servicePoints: 800,
    status: '완료', category: '신규', memo: ''
  },
  {
    id: 7, no: 6, purchaseDate: '2026-03-08 09:30:00',
    type: '기타', productName: '스포츠 타올 세트', manager: '관리자',
    buyer: '이지수', buyerId: 107, round: '신규', quantity: 3,
    originalPrice: 15000, salePrice: 13500, discountPrice: 1500,
    paymentMethod: '수기등록', paymentType: '일시불', paymentTool: '현금',
    cash: 13500, card: 0, mileage: 0,
    cardCompany: '-', cardNumber: '-', approvalNo: '-',
    unpaid: 0, serviceDays: 0, serviceCount: 0, servicePoints: 0,
    status: '완료', category: '신규', memo: ''
  },
  {
    id: 8, no: 5, purchaseDate: '2026-03-07 13:00:00',
    type: '이용권', productName: '헬스 3개월권', manager: '홍길동',
    buyer: '박성호', buyerId: 108, round: '재등록', quantity: 1,
    originalPrice: 330000, salePrice: 297000, discountPrice: 33000,
    paymentMethod: '단말기연동', paymentType: '일시불', paymentTool: '카드',
    cash: 0, card: 297000, mileage: 0,
    cardCompany: '우리카드', cardNumber: '7723-****-****-9901', approvalNo: '33219987',
    unpaid: 0, serviceDays: 30, serviceCount: 0, servicePoints: 297,
    status: '완료', category: '재등록', memo: '재등록 5% 할인 적용'
  },
  {
    id: 9, no: 4, purchaseDate: '2026-03-06 16:20:00',
    type: '이용권', productName: '프리미엄 12개월권', manager: '김민수',
    buyer: '서지원', buyerId: 109, round: '신규', quantity: 1,
    originalPrice: 1200000, salePrice: 1000000, discountPrice: 200000,
    paymentMethod: '단말기연동', paymentType: '일시불', paymentTool: '카드',
    cash: 0, card: 1000000, mileage: 0,
    cardCompany: '신한카드', cardNumber: '4518-****-****-7788', approvalNo: '88771234',
    unpaid: 0, serviceDays: 0, serviceCount: 0, servicePoints: 1000,
    status: '환불', category: '신규', memo: '단순 변심 환불'
  },
  {
    id: 10, no: 3, purchaseDate: '2026-03-05 11:15:00',
    type: 'PT', productName: '그룹 필라테스 20회', manager: '이영희',
    buyer: '최민정', buyerId: 110, round: '신규', quantity: 1,
    originalPrice: 440000, salePrice: 396000, discountPrice: 44000,
    paymentMethod: '수기등록', paymentType: '일시불', paymentTool: '현금',
    cash: 396000, card: 0, mileage: 0,
    cardCompany: '-', cardNumber: '-', approvalNo: '-',
    unpaid: 0, serviceDays: 0, serviceCount: 0, servicePoints: 396,
    status: '완료', category: '신규', memo: ''
  },
  {
    id: 11, no: 2, purchaseDate: '2026-03-04 14:00:00',
    type: '상품', productName: '운동복 대여 1개월', manager: '관리자',
    buyer: '김태희', buyerId: 101, round: '재등록', quantity: 1,
    originalPrice: 5500, salePrice: 5000, discountPrice: 500,
    paymentMethod: '단말기연동', paymentType: '일시불', paymentTool: '마일리지',
    cash: 0, card: 0, mileage: 5000,
    cardCompany: '-', cardNumber: '-', approvalNo: '-',
    unpaid: 0, serviceDays: 0, serviceCount: 0, servicePoints: 0,
    status: '완료', category: '재등록', memo: '마일리지 사용'
  },
  {
    id: 12, no: 1, purchaseDate: '2026-03-03 10:30:00',
    type: '기타', productName: '프로틴 쉐이크(바닐라)', manager: '관리자',
    buyer: '박지민', buyerId: 102, round: '신규', quantity: 2,
    originalPrice: 9000, salePrice: 8000, discountPrice: 1000,
    paymentMethod: '수기등록', paymentType: '일시불', paymentTool: '현금',
    cash: 8000, card: 0, mileage: 0,
    cardCompany: '-', cardNumber: '-', approvalNo: '-',
    unpaid: 0, serviceDays: 0, serviceCount: 0, servicePoints: 0,
    status: '완료', category: '신규', memo: ''
  },
];

// 기간 프리셋 계산 유틸
const getPresetRange = (preset: string): { start: string; end: string } => {
  const today = new Date('2026-03-11');
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  if (preset === '오늘') return { start: fmt(today), end: fmt(today) };
  if (preset === '이번주') {
    const day = today.getDay();
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
  return { start: fmt(today), end: fmt(today) };
};

// 상태별 배지 variant
const statusVariant = (status: string) => {
  if (status === '완료') return 'success' as const;
  if (status === '환불') return 'error' as const;
  if (status === '미납') return 'warning' as const;
  return 'default' as const;
};

export default function Sales() {
  const [activeTab, setActiveTab] = useState('TAB-001');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>('이번달');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateRangeStart: '2026-03-01',
    dateRangeEnd: '2026-03-31',
    type: [],
    status: [],
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounce 검색
  const handleSearchChange = useCallback((val: string) => {
    setSearchValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const handlePreset = (preset: string) => {
    const { start, end } = getPresetRange(preset);
    setActivePreset(preset);
    setFilterValues(prev => ({ ...prev, dateRangeStart: start, dateRangeEnd: end }));
  };

  // 필터링
  const filteredData = useMemo(() => {
    return MOCK_SALES_DATA.filter(item => {
      const matchSearch =
        item.buyer.includes(debouncedSearch) || item.productName.includes(debouncedSearch);
      const matchType =
        !filterValues.type?.length || filterValues.type.includes(item.type);
      const matchStatus =
        !filterValues.status?.length || filterValues.status.includes(item.status);
      if (activeTab === 'TAB-006' && item.status !== '환불') return false;
      if (activeTab === 'TAB-007' && item.unpaid <= 0) return false;
      return matchSearch && matchType && matchStatus;
    });
  }, [debouncedSearch, filterValues, activeTab]);

  // 요약 합계
  const summary = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => {
        if (curr.status !== '환불') acc.total += curr.salePrice;
        acc.card += curr.card;
        acc.cash += curr.cash;
        acc.mileage += curr.mileage;
        acc.unpaid += curr.unpaid;
        acc.discount += curr.discountPrice;
        if (curr.status === '환불') acc.refund += curr.salePrice;
        return acc;
      },
      { total: 0, card: 0, cash: 0, mileage: 0, unpaid: 0, discount: 0, refund: 0 }
    );
  }, [filteredData]);
  const netTotal = summary.total - summary.refund;

  // 테이블 컬럼
  const columns = [
    { key: 'no', header: 'No', width: 60, align: 'center' as const },
    { key: 'purchaseDate', header: '구매일', width: 170 },
    { key: 'type', header: '유형', width: 80, align: 'center' as const,
      render: (val: string) => <StatusBadge variant="secondary">{val}</StatusBadge> },
    { key: 'productName', header: '상품명', width: 200,
      render: (val: string) => (
        <button
          className="text-content-secondary hover:text-primary hover:underline font-medium text-left transition-colors"
          onClick={() => moveToPage(971)}
        >{val}</button>
      )
    },
    { key: 'buyer', header: '구매자', width: 100,
      render: (val: string) => (
        <button
          className="text-primary hover:underline font-medium transition-colors"
          onClick={() => moveToPage(985)}
        >{val}</button>
      )
    },
    { key: 'manager', header: '담당자', width: 100 },
    { key: 'salePrice', header: '금액', width: 110, align: 'right' as const,
      render: (v: number) => <span className="font-semibold tabular-nums">₩{v.toLocaleString()}</span> },
    { key: 'paymentTool', header: '결제수단', width: 90, align: 'center' as const },
    { key: 'cash', header: '현금', width: 90, align: 'right' as const,
      render: (v: number) => <span className="tabular-nums">{v.toLocaleString()}</span> },
    { key: 'card', header: '카드', width: 90, align: 'right' as const,
      render: (v: number) => <span className="tabular-nums">{v.toLocaleString()}</span> },
    { key: 'mileage', header: '마일리지', width: 90, align: 'right' as const,
      render: (v: number) => <span className="tabular-nums">{v.toLocaleString()}</span> },
    { key: 'unpaid', header: '미수금', width: 90, align: 'right' as const,
      render: (v: number) => (
        <span className={cn('tabular-nums', v > 0 && 'text-state-error font-bold')}>
          {v.toLocaleString()}
        </span>
      )
    },
    { key: 'status', header: '상태', width: 80, align: 'center' as const,
      render: (val: string) => (
        <StatusBadge variant={statusVariant(val)} dot>{val}</StatusBadge>
      )
    },
    { key: 'memo', header: '메모', width: 180,
      render: (val: string) => <span className="text-content-tertiary text-[12px]">{val}</span> },
  ];

  // 필터 옵션
  const filters: FilterOption[] = [
    { key: 'dateRange', label: '날짜 범위', type: 'dateRange' },
    {
      key: 'type', label: '유형', type: 'select',
      options: [
        { value: '이용권', label: '이용권' },
        { value: 'PT', label: 'PT' },
        { value: '상품', label: '상품' },
        { value: '기타', label: '기타' },
      ]
    },
    {
      key: 'status', label: '상태', type: 'select',
      options: [
        { value: '완료', label: '완료' },
        { value: '환불', label: '환불' },
        { value: '미납', label: '미납' },
      ]
    },
  ];

  const tabs = [
    { key: 'TAB-001', label: '매출 내역' },
    { key: 'TAB-002', label: '기간별 매출' },
    { key: 'TAB-003', label: '상품별 내역' },
    { key: 'TAB-004', label: '결제수단별' },
    { key: 'TAB-005', label: '담당자별' },
    { key: 'TAB-006', label: '환불 내역', count: MOCK_SALES_DATA.filter(i => i.status === '환불').length },
    { key: 'TAB-007', label: '미납 내역', count: MOCK_SALES_DATA.filter(i => i.unpaid > 0).length },
  ];

  const handleDownloadExcel = () => {
    alert(`매출 내역 ${filteredData.length}건을 엑셀 다운로드합니다.`);
  };

  const PRESETS = ['오늘', '이번주', '이번달'];

  return (
    <AppLayout>
      <PageHeader
        title="매출 현황"
        description="센터의 매출 거래 전체를 조회하고 분석합니다."
        actions={
          <div className="flex items-center gap-sm">
            <button
              onClick={() => moveToPage(982)}
              className="flex items-center gap-xs px-md py-sm bg-primary text-surface rounded-button text-[13px] font-semibold shadow-sm hover:bg-primary-dark transition-colors"
            >
              <CreditCard size={15} />
              신규 결제 (POS)
            </button>
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-xs px-md py-sm bg-surface border border-line text-content-secondary rounded-button text-[13px] font-semibold hover:bg-surface-tertiary transition-colors"
            >
              <Download size={15} />
              엑셀 다운로드
            </button>
          </div>
        }
      />

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-xl">
        <StatCard
          label="순 매출"
          value={`₩${netTotal.toLocaleString()}`}
          variant="peach"
          icon={<DollarSign />}
          change={{ value: 12.5, label: '전월 대비' }}
        />
        <StatCard label="카드 결제" value={`₩${summary.card.toLocaleString()}`} icon={<CreditCard />} />
        <StatCard label="현금 결제" value={`₩${summary.cash.toLocaleString()}`} icon={<Wallet />} />
        <StatCard
          label="미수금"
          value={`₩${summary.unpaid.toLocaleString()}`}
          icon={<AlertCircle />}
          className={summary.unpaid > 0 ? 'border-state-error/20' : ''}
        />
      </div>

      {/* 필터 영역 */}
      <div className="space-y-md mb-lg">
        {/* 기간 프리셋 */}
        <div className="flex items-center gap-xs flex-wrap">
          {PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              className={cn(
                'px-md py-xs rounded-button text-[13px] font-semibold border transition-all',
                activePreset === preset
                  ? 'bg-primary text-surface border-primary shadow-sm'
                  : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
              )}
            >
              {preset}
            </button>
          ))}
        </div>

        <SearchFilter
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          onSearch={val => setDebouncedSearch(val)}
          searchPlaceholder="구매자 또는 상품명 검색..."
          filters={filters}
          filterValues={filterValues}
          onFilterChange={(k, v) => setFilterValues(prev => ({ ...prev, [k]: v }))}
          onReset={() => {
            setSearchValue('');
            setDebouncedSearch('');
            setActivePreset('이번달');
            setFilterValues({ dateRangeStart: '2026-03-01', dateRangeEnd: '2026-03-31', type: [], status: [] });
          }}
        />
      </div>

      {/* 탭 + 테이블 */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <DataTable
          columns={columns}
          data={filteredData}
          pagination={{ page: 1, pageSize: 10, total: filteredData.length }}
        />
      </div>

      {/* 하단 요약 바 */}
      <div className="mt-xl p-lg bg-surface rounded-xl border border-line shadow-card flex flex-wrap items-center justify-between gap-lg">
        <div className="flex flex-wrap gap-xl">
          <div>
            <p className="text-[11px] text-content-tertiary mb-xs">총 매출액</p>
            <p className="text-[18px] font-bold text-primary tabular-nums">₩{summary.total.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[11px] text-content-tertiary mb-xs">순 매출액 <span className="text-[10px]">(환불 차감)</span></p>
            <p className="text-[18px] font-bold text-accent tabular-nums">₩{netTotal.toLocaleString()}</p>
          </div>
          <div className="hidden sm:block w-px h-10 bg-line" />
          <div>
            <p className="text-[11px] text-content-tertiary mb-xs">현금 합계</p>
            <p className="text-[18px] font-bold text-content tabular-nums">₩{summary.cash.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[11px] text-content-tertiary mb-xs">카드 합계</p>
            <p className="text-[18px] font-bold text-content tabular-nums">₩{summary.card.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[11px] text-content-tertiary mb-xs">마일리지 합계</p>
            <p className="text-[18px] font-bold text-content tabular-nums">₩{summary.mileage.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-xl">
          <div className="text-right">
            <p className="text-[11px] text-content-tertiary mb-xs">환불 금액</p>
            <p className="text-[15px] font-semibold text-state-error tabular-nums">₩{summary.refund.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-content-tertiary mb-xs">미납금</p>
            <p className="text-[15px] font-semibold text-state-error tabular-nums">₩{summary.unpaid.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-content-tertiary mb-xs">할인 합계</p>
            <p className="text-[15px] font-semibold text-content-secondary tabular-nums">₩{summary.discount.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
