import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Download,
  DollarSign,
  CreditCard,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';

import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import SearchFilter, { FilterOption } from "@/components/common/SearchFilter";
import TabNav from "@/components/common/TabNav";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import AppLayout from "@/components/layout/AppLayout";
import Modal from "@/components/ui/Modal";
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/exportExcel';

type SaleItem = {
  id: number;
  no: number;
  purchaseDate: string;
  type: string;
  productName: string;
  manager: string;
  buyer: string;
  buyerId: number;
  round: string;
  quantity: number;
  originalPrice: number;
  salePrice: number;
  discountPrice: number;
  paymentMethod: string;
  paymentType: string;
  paymentTool: string;
  cash: number;
  card: number;
  mileage: number;
  cardCompany: string;
  cardNumber: string;
  approvalNo: string;
  unpaid: number;
  serviceDays: number;
  serviceCount: number;
  servicePoints: number;
  status: string;
  category: string;
  memo: string;
};

// 로컬 날짜 포맷 (timezone 이슈 방지)
const fmtLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

// 기간 프리셋 계산 유틸
const getPresetRange = (preset: string): { start: string; end: string } => {
  const today = new Date();
  if (preset === '오늘') return { start: fmtLocal(today), end: fmtLocal(today) };
  if (preset === '이번주') {
    const day = today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: fmtLocal(mon), end: fmtLocal(sun) };
  }
  if (preset === '이번달') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: fmtLocal(start), end: fmtLocal(end) };
  }
  return { start: fmtLocal(today), end: fmtLocal(today) };
};

// 상태별 배지 variant
const statusVariant = (status: string) => {
  if (status === '완료') return 'success' as const;
  if (status === '환불') return 'error' as const;
  if (status === '미납') return 'warning' as const;
  return 'default' as const;
};

// 매출 유형(round) 세분화 배지
const ROUND_TYPES = ['신규', '재등록', '휴면복귀', '종목추가', '업그레이드'];
const roundBadge = (round: string) => {
  const map: Record<string, { bg: string; text: string }> = {
    신규:     { bg: 'bg-blue-100',   text: 'text-blue-700' },
    재등록:   { bg: 'bg-green-100',  text: 'text-green-700' },
    휴면복귀: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    종목추가: { bg: 'bg-purple-100', text: 'text-purple-700' },
    업그레이드: { bg: 'bg-orange-100', text: 'text-orange-700' },
  };
  const style = map[round] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-xs py-[1px] rounded-full text-[11px] font-semibold ${style.bg} ${style.text}`}>
      {round || '-'}
    </span>
  );
};

export default function Sales() {
  const [salesData, setSalesData] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('TAB-001');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>('이번달');
  const [filterValues, setFilterValues] = useState<Record<string, any>>(() => {
    const { start, end } = getPresetRange('이번달');
    return { dateRangeStart: start, dateRangeEnd: end, type: [], status: [] };
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DB 영문 상태값 → 한글 레이블
  const STATUS_KO: Record<string, string> = {
    COMPLETED: '완료',
    UNPAID: '미납',
    REFUNDED: '환불',
    PENDING: '대기',
  };

  // DB 결제수단 영문 → 한글 레이블
  const PAYMENT_KO: Record<string, string> = {
    CARD: '카드',
    CASH: '현금',
    TRANSFER: '계좌이체',
    MILEAGE: '마일리지',
  };

  useEffect(() => {
    const fetchSales = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sales')
        .select('id, memberId, memberName, productId, productName, saleDate, type, round, quantity, originalPrice, salePrice, discountPrice, amount, paymentMethod, paymentType, cash, card, mileageUsed, cardCompany, cardNumber, approvalNo, status, unpaid, staffId, staffName, memo, branchId')
        .eq('branchId', getBranchId())
        .order('saleDate', { ascending: false });
      setIsLoading(false);
      if (error) {
        console.error("매출 데이터 로드 실패:", error);
        toast.error("매출 데이터를 불러오지 못했습니다.");
        return;
      }
      if (data) {
        setSalesData(
          data.map((row: Record<string, unknown>, idx: number) => {
            const statusEn = (row.status as string) ?? '';
            const payMethodEn = (row.paymentMethod as string) ?? '';
            const cardAmt = Number(row.card) || 0;
            const cashAmt = Number(row.cash) || 0;
            const mileageAmt = Number(row.mileageUsed) || 0;
            // paymentTool: 결제수단 한글 레이블 (복합결제 고려)
            const payTool = PAYMENT_KO[payMethodEn] ?? payMethodEn;
            return {
              id: row.id as number,
              no: data.length - idx,
              purchaseDate: (row.saleDate as string)?.slice(0, 10) ?? '',
              type: (row.type as string) ?? '',
              productName: (row.productName as string) ?? '',
              manager: (row.staffName as string) ?? '',
              buyer: (row.memberName as string) ?? '',
              buyerId: (row.memberId as number) ?? 0,
              round: String(row.round ?? ''),
              quantity: (row.quantity as number) ?? 1,
              originalPrice: Number(row.originalPrice) || Number(row.amount) || 0,
              salePrice: Number(row.salePrice) || Number(row.amount) || 0,
              discountPrice: Number(row.discountPrice) || 0,
              paymentMethod: payMethodEn,
              paymentType: (row.paymentType as string) ?? '',
              paymentTool: payTool,
              cash: cashAmt,
              card: cardAmt,
              mileage: mileageAmt,
              cardCompany: (row.cardCompany as string) ?? '',
              cardNumber: (row.cardNumber as string) ?? '',
              approvalNo: (row.approvalNo as string) ?? '',
              unpaid: Number(row.unpaid) || 0,
              serviceDays: 0,
              serviceCount: 0,
              servicePoints: 0,
              status: STATUS_KO[statusEn] ?? statusEn,
              category: '',
              memo: (row.memo as string) ?? '',
            };
          })
        );
      }
    };
    fetchSales();
  }, []);

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
    return salesData.filter(item => {
      const matchSearch =
        item.buyer.includes(debouncedSearch) || item.productName.includes(debouncedSearch);
      const matchType =
        !filterValues.type?.length || filterValues.type.includes(item.type);
      const matchStatus =
        !filterValues.status?.length || filterValues.status.includes(item.status);
      // 날짜 범위 필터 (purchaseDate는 이미 YYYY-MM-DD 형식)
      const dateStart = filterValues.dateRangeStart as string | undefined;
      const dateEnd = filterValues.dateRangeEnd as string | undefined;
      const matchDate =
        (!dateStart || item.purchaseDate >= dateStart) &&
        (!dateEnd || item.purchaseDate <= dateEnd);
      if (activeTab === 'TAB-006' && item.status !== '환불') return false;
      if (activeTab === 'TAB-007' && item.unpaid <= 0) return false;
      return matchSearch && matchType && matchStatus && matchDate;
    });
  }, [salesData, debouncedSearch, filterValues, activeTab]);

  // 기간별 집계 (TAB-002)
  const [periodUnit, setPeriodUnit] = useState<'일' | '주' | '월'>('일');
  const periodData = useMemo(() => {
    const map = new Map<string, { period: string; count: number; total: number }>();
    filteredData.forEach(item => {
      let key: string;
      const d = item.purchaseDate; // YYYY-MM-DD
      if (periodUnit === '일') {
        key = d;
      } else if (periodUnit === '주') {
        const dt = new Date(d);
        const day = dt.getDay();
        const mon = new Date(dt);
        mon.setDate(dt.getDate() - (day === 0 ? 6 : day - 1));
        key = fmtLocal(mon) + ' 주';
      } else {
        key = d.slice(0, 7); // YYYY-MM
      }
      const prev = map.get(key) ?? { period: key, count: 0, total: 0 };
      prev.count += 1;
      if (item.status !== '환불') prev.total += item.salePrice;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.period.localeCompare(a.period));
  }, [filteredData, periodUnit]);

  // 상품별 집계 (TAB-003)
  const productData = useMemo(() => {
    const map = new Map<string, { productName: string; count: number; total: number }>();
    filteredData.forEach(item => {
      const key = item.productName || '(미지정)';
      const prev = map.get(key) ?? { productName: key, count: 0, total: 0 };
      prev.count += 1;
      if (item.status !== '환불') prev.total += item.salePrice;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // 결제수단별 집계 (TAB-004)
  const paymentData = useMemo(() => {
    const map = new Map<string, { paymentTool: string; count: number; total: number }>();
    filteredData.forEach(item => {
      const key = item.paymentTool || '(미지정)';
      const prev = map.get(key) ?? { paymentTool: key, count: 0, total: 0 };
      prev.count += 1;
      if (item.status !== '환불') prev.total += item.salePrice;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // 담당자별 집계 (TAB-005)
  const staffData = useMemo(() => {
    const map = new Map<string, { manager: string; count: number; total: number }>();
    filteredData.forEach(item => {
      const key = item.manager || '(미지정)';
      const prev = map.get(key) ?? { manager: key, count: 0, total: 0 };
      prev.count += 1;
      if (item.status !== '환불') prev.total += item.salePrice;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // 탭별 테이블 데이터/컬럼
  const amtRender = (v: number) => <span className="font-semibold tabular-nums">₩{v.toLocaleString()}</span>;
  const cntRender = (v: number) => <span className="tabular-nums">{v.toLocaleString()}건</span>;

  const aggregateColumns: Record<string, { key: string; header: string; width?: number; align?: 'left' | 'center' | 'right'; render?: (v: unknown) => React.ReactNode }[]> = {
    'TAB-002': [
      { key: 'period', header: '기간', width: 180 },
      { key: 'count', header: '건수', width: 100, align: 'center', render: cntRender as (v: unknown) => React.ReactNode },
      { key: 'total', header: '매출 합계', width: 160, align: 'right', render: amtRender as (v: unknown) => React.ReactNode },
    ],
    'TAB-003': [
      { key: 'productName', header: '상품명', width: 240 },
      { key: 'count', header: '건수', width: 100, align: 'center', render: cntRender as (v: unknown) => React.ReactNode },
      { key: 'total', header: '매출 합계', width: 160, align: 'right', render: amtRender as (v: unknown) => React.ReactNode },
    ],
    'TAB-004': [
      { key: 'paymentTool', header: '결제수단', width: 140 },
      { key: 'count', header: '건수', width: 100, align: 'center', render: cntRender as (v: unknown) => React.ReactNode },
      { key: 'total', header: '매출 합계', width: 160, align: 'right', render: amtRender as (v: unknown) => React.ReactNode },
    ],
    'TAB-005': [
      { key: 'manager', header: '담당자', width: 140 },
      { key: 'count', header: '건수', width: 100, align: 'center', render: cntRender as (v: unknown) => React.ReactNode },
      { key: 'total', header: '매출 합계', width: 160, align: 'right', render: amtRender as (v: unknown) => React.ReactNode },
    ],
  };

  const aggregateData: Record<string, Record<string, unknown>[]> = {
    'TAB-002': periodData as Record<string, unknown>[],
    'TAB-003': productData as Record<string, unknown>[],
    'TAB-004': paymentData as Record<string, unknown>[],
    'TAB-005': staffData as Record<string, unknown>[],
  };

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
    { key: 'round', header: '매출유형', width: 90, align: 'center' as const,
      render: (val: string) => roundBadge(val) },
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
      render: (val: string, row: SaleItem) => (
        <button
          className="text-primary hover:underline font-medium transition-colors"
          onClick={() => moveToPage(985, { id: row.buyerId })}
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
    { key: 'quantity', header: '수량', width: 70, align: 'center' as const,
      render: (v: number) => <span className="tabular-nums">{v}</span> },
    { key: 'originalPrice', header: '정가', width: 100, align: 'right' as const,
      render: (v: number) => <span className="tabular-nums">{v > 0 ? `₩${v.toLocaleString()}` : '-'}</span> },
    { key: 'discountPrice', header: '할인', width: 90, align: 'right' as const,
      render: (v: number) => <span className="tabular-nums">{v > 0 ? `₩${v.toLocaleString()}` : '-'}</span> },
    { key: 'cardCompany', header: '카드사', width: 90, align: 'center' as const,
      render: (v: string) => <span>{v || '-'}</span> },
    { key: 'cardNumber', header: '카드번호', width: 130,
      render: (v: string) => <span className="tabular-nums text-[12px]">{v || '-'}</span> },
    { key: 'approvalNo', header: '승인번호', width: 110,
      render: (v: string) => <span className="tabular-nums text-[12px]">{v || '-'}</span> },
    { key: 'serviceDays', header: '서비스일수', width: 90, align: 'center' as const,
      render: (v: number) => <span className="tabular-nums">{v > 0 ? `${v}일` : '-'}</span> },
    { key: 'serviceCount', header: '서비스횟수', width: 90, align: 'center' as const,
      render: (v: number) => <span className="tabular-nums">{v > 0 ? `${v}회` : '-'}</span> },
    { key: 'status', header: '상태', width: 80, align: 'center' as const,
      render: (val: string) => (
        <StatusBadge variant={statusVariant(val)} dot>{val}</StatusBadge>
      )
    },
    { key: 'memo', header: '메모', width: 180,
      render: (val: string) => <span className="text-content-tertiary text-[12px]">{val}</span> },
  ];

  // 매출 상세 모달 상태
  const [selectedSale, setSelectedSale] = useState<SaleItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleRowClick = (row: SaleItem) => {
    if (!['TAB-002', 'TAB-003', 'TAB-004', 'TAB-005'].includes(activeTab)) {
      setSelectedSale(row);
      setShowDetailModal(true);
    }
  };

  // round 필터 상태
  const [roundFilter, setRoundFilter] = useState<string>('');

  const isAggregateTab = ['TAB-002', 'TAB-003', 'TAB-004', 'TAB-005'].includes(activeTab);
  // round 필터 적용 (TAB-001 전용)
  const displayData = useMemo(() => {
    if (isAggregateTab) return filteredData;
    if (!roundFilter) return filteredData;
    return filteredData.filter(item => item.round === roundFilter);
  }, [filteredData, roundFilter, isAggregateTab]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableData: any[] = isAggregateTab ? aggregateData[activeTab] : displayData;
  const tableColumns = isAggregateTab ? aggregateColumns[activeTab] : columns;

  // 필터 옵션
  const filters: FilterOption[] = [
    { key: 'dateRange', label: '날짜 범위', type: 'dateRange' },
    {
      key: 'type', label: '유형', type: 'multiSelect',
      options: [
        { value: '이용권', label: '이용권' },
        { value: 'PT', label: 'PT' },
        { value: '상품', label: '상품' },
        { value: '기타', label: '기타' },
      ]
    },
    {
      key: 'status', label: '상태', type: 'multiSelect',
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
    { key: 'TAB-006', label: '환불 내역', count: salesData.filter(i => i.status === '환불').length },
    { key: 'TAB-007', label: '미납 내역', count: salesData.filter(i => i.unpaid > 0).length },
  ];

  const handleDownloadExcel = () => {
    const exportColumns = [
      { key: 'no', header: 'No' },
      { key: 'purchaseDate', header: '구매일' },
      { key: 'round', header: '매출유형' },
      { key: 'type', header: '유형' },
      { key: 'productName', header: '상품명' },
      { key: 'buyer', header: '구매자' },
      { key: 'manager', header: '담당자' },
      { key: 'quantity', header: '수량' },
      { key: 'originalPrice', header: '정가' },
      { key: 'salePrice', header: '판매가' },
      { key: 'discountPrice', header: '할인' },
      { key: 'paymentTool', header: '결제수단' },
      { key: 'cash', header: '현금' },
      { key: 'card', header: '카드' },
      { key: 'mileage', header: '마일리지' },
      { key: 'unpaid', header: '미수금' },
      { key: 'cardCompany', header: '카드사' },
      { key: 'cardNumber', header: '카드번호' },
      { key: 'approvalNo', header: '승인번호' },
      { key: 'serviceDays', header: '서비스일수' },
      { key: 'serviceCount', header: '서비스횟수' },
      { key: 'status', header: '상태' },
      { key: 'memo', header: '메모' },
    ];
    exportToExcel(filteredData as Record<string, unknown>[], exportColumns, { filename: '매출내역' });
    toast.success(`${filteredData.length}건 엑셀 다운로드 완료`);
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
          onFilterChange={(k, v) => { setFilterValues(prev => ({ ...prev, [k]: v })); if (k === 'dateRangeStart' || k === 'dateRangeEnd') setActivePreset(null); }}
          onReset={() => {
            setSearchValue('');
            setDebouncedSearch('');
            setActivePreset('이번달');
            const { start, end } = getPresetRange('이번달');
            setFilterValues({ dateRangeStart: start, dateRangeEnd: end, type: [], status: [] });
          }}
        />
      </div>

      {/* round 유형 필터 (TAB-001 전용) */}
      {activeTab === 'TAB-001' && (
        <div className="flex items-center gap-xs flex-wrap mb-md">
          <span className="text-[12px] text-content-secondary font-semibold">매출유형:</span>
          <button
            onClick={() => setRoundFilter('')}
            className={cn(
              'px-sm py-xs rounded-button text-[12px] font-semibold border transition-all',
              roundFilter === ''
                ? 'bg-primary text-surface border-primary'
                : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
            )}
          >전체</button>
          {ROUND_TYPES.map(r => (
            <button
              key={r}
              onClick={() => setRoundFilter(prev => prev === r ? '' : r)}
              className={cn(
                'px-sm py-xs rounded-button text-[12px] font-semibold border transition-all',
                roundFilter === r
                  ? 'bg-primary text-surface border-primary'
                  : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
              )}
            >{r}</button>
          ))}
        </div>
      )}

      {/* 탭 + 테이블 */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'TAB-002' && (
          <div className="flex items-center gap-xs px-lg pt-md pb-xs">
            {(['일', '주', '월'] as const).map(unit => (
              <button
                key={unit}
                onClick={() => setPeriodUnit(unit)}
                className={cn(
                  'px-md py-xs rounded-button text-[13px] font-semibold border transition-all',
                  periodUnit === unit
                    ? 'bg-primary text-surface border-primary shadow-sm'
                    : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
                )}
              >{unit}별</button>
            ))}
          </div>
        )}
        <DataTable
          columns={tableColumns}
          data={tableData}
          pagination={{ page: 1, pageSize: 20, total: tableData.length }}
          onRowClick={!isAggregateTab ? (row) => handleRowClick(row as SaleItem) : undefined}
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
      {/* 매출 상세 모달 */}
      {selectedSale && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="매출 상세"
          size="lg"
          footer={
            <div className="flex justify-end gap-sm">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  moveToPage(985, { id: selectedSale.buyerId });
                }}
                className="px-md py-sm bg-primary text-surface rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors"
              >
                회원 상세 보기
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-md py-sm bg-surface border border-line text-content-secondary rounded-button text-[13px] font-semibold hover:bg-surface-tertiary transition-colors"
              >
                닫기
              </button>
            </div>
          }
        >
          <div className="space-y-lg">
            {/* 결제일 + 상태 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-content-tertiary mb-xs">결제일</p>
                <p className="text-[15px] font-semibold text-content">{selectedSale.purchaseDate}</p>
              </div>
              <StatusBadge variant={statusVariant(selectedSale.status)} dot>
                {selectedSale.status}
              </StatusBadge>
            </div>

            <div className="h-px bg-line" />

            {/* 구매 정보 */}
            <div>
              <p className="text-[12px] font-semibold text-content-secondary mb-sm">구매 정보</p>
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">구매자</p>
                  <p className="text-[13px] font-medium text-content">{selectedSale.buyer || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">담당자</p>
                  <p className="text-[13px] font-medium text-content">{selectedSale.manager || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">상품명</p>
                  <p className="text-[13px] font-medium text-content">{selectedSale.productName || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">구분</p>
                  <div className="flex items-center gap-xs">
                    <StatusBadge variant="secondary">{selectedSale.type || '-'}</StatusBadge>
                    {selectedSale.round && roundBadge(selectedSale.round)}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-line" />

            {/* 금액 정보 */}
            <div>
              <p className="text-[12px] font-semibold text-content-secondary mb-sm">금액 정보</p>
              <div className="grid grid-cols-3 gap-sm">
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">정가</p>
                  <p className="text-[13px] tabular-nums text-content">₩{selectedSale.originalPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">할인</p>
                  <p className="text-[13px] tabular-nums text-state-error">
                    {selectedSale.discountPrice > 0 ? `-₩${selectedSale.discountPrice.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">판매가</p>
                  <p className="text-[14px] font-bold tabular-nums text-primary">₩{selectedSale.salePrice.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-line" />

            {/* 결제 내역 */}
            <div>
              <p className="text-[12px] font-semibold text-content-secondary mb-sm">결제 내역</p>
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">카드</p>
                  <p className="text-[13px] tabular-nums text-content">₩{selectedSale.card.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">현금</p>
                  <p className="text-[13px] tabular-nums text-content">₩{selectedSale.cash.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">마일리지</p>
                  <p className="text-[13px] tabular-nums text-content">₩{selectedSale.mileage.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-content-tertiary mb-xs">미수금</p>
                  <p className={cn('text-[13px] tabular-nums font-semibold', selectedSale.unpaid > 0 ? 'text-state-error' : 'text-content')}>
                    ₩{selectedSale.unpaid.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* 카드 승인 정보 */}
            {(selectedSale.cardCompany || selectedSale.cardNumber || selectedSale.approvalNo) && (
              <>
                <div className="h-px bg-line" />
                <div>
                  <p className="text-[12px] font-semibold text-content-secondary mb-sm">카드 승인 정보</p>
                  <div className="grid grid-cols-3 gap-sm">
                    <div>
                      <p className="text-[11px] text-content-tertiary mb-xs">카드사</p>
                      <p className="text-[13px] text-content">{selectedSale.cardCompany || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-content-tertiary mb-xs">카드번호</p>
                      <p className="text-[13px] tabular-nums text-content">{selectedSale.cardNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-content-tertiary mb-xs">승인번호</p>
                      <p className="text-[13px] tabular-nums text-content">{selectedSale.approvalNo || '-'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 서비스 */}
            {(selectedSale.serviceDays > 0 || selectedSale.serviceCount > 0) && (
              <>
                <div className="h-px bg-line" />
                <div>
                  <p className="text-[12px] font-semibold text-content-secondary mb-sm">서비스</p>
                  <div className="flex gap-lg">
                    {selectedSale.serviceDays > 0 && (
                      <div>
                        <p className="text-[11px] text-content-tertiary mb-xs">서비스 일수</p>
                        <p className="text-[13px] tabular-nums text-content">{selectedSale.serviceDays}일</p>
                      </div>
                    )}
                    {selectedSale.serviceCount > 0 && (
                      <div>
                        <p className="text-[11px] text-content-tertiary mb-xs">서비스 횟수</p>
                        <p className="text-[13px] tabular-nums text-content">{selectedSale.serviceCount}회</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 메모 */}
            {selectedSale.memo && (
              <>
                <div className="h-px bg-line" />
                <div>
                  <p className="text-[12px] font-semibold text-content-secondary mb-sm">메모</p>
                  <p className="text-[13px] text-content-secondary whitespace-pre-wrap">{selectedSale.memo}</p>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
