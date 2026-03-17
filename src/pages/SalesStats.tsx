import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { RefreshCw, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import PageHeader from '@/components/PageHeader';
import TabNav from '@/components/TabNav';
import DataTable from '@/components/DataTable';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';

// 매출 원시 행 타입 (sales 테이블)
type SalesRow = {
  id: number;
  saleDate: string;
  productName: string;
  type: string;       // 상품타입: 회원권/수강권/대여권/일반
  category: string;  // 종목: 헬스/필라테스/요가 등
  salePrice: number;
  paymentMethod: string; // CARD/CASH/TRANSFER/MILEAGE
  status: string;
};

// 집계 행 타입
type AggRow = {
  label: string;
  count: number;
  total: number;
  pct: number; // 전체 대비 퍼센트
};

// 로컬 날짜 포맷
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

// 결제수단 한글
const PAYMENT_KO: Record<string, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
  MILEAGE: '마일리지',
};

// 탭 색상 팔레트 (바 차트 / 파이 차트용)
const COLORS = [
  'bg-primary',
  'bg-accent',
  'bg-amber-400',
  'bg-blue-400',
  'bg-rose-400',
  'bg-purple-400',
  'bg-teal-400',
  'bg-orange-400',
];

const COLOR_HEX = [
  '#f97066',
  '#34d399',
  '#fbbf24',
  '#60a5fa',
  '#fb7185',
  '#a78bfa',
  '#2dd4bf',
  '#fb923c',
];

// 가로 막대 차트 컴포넌트
function HBarChart({ data }: { data: AggRow[] }) {
  const maxTotal = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="space-y-[10px] py-md">
      {data.map((row, i) => (
        <div key={row.label} className="flex items-center gap-md">
          <div className="w-[120px] text-[12px] text-content-secondary truncate text-right shrink-0">{row.label}</div>
          <div className="flex-1 h-[22px] bg-surface-tertiary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', COLORS[i % COLORS.length])}
              style={{ width: `${Math.max((row.total / maxTotal) * 100, 2)}%` }}
            />
          </div>
          <div className="w-[120px] text-[12px] font-semibold tabular-nums text-right shrink-0">
            ₩{row.total.toLocaleString()}
          </div>
          <div className="w-[40px] text-[11px] text-content-tertiary tabular-nums text-right shrink-0">
            {row.pct.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}

// 파이 차트 컴포넌트 (SVG 도넛)
function DonutChart({ data }: { data: AggRow[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (total === 0) return <div className="text-center text-content-tertiary py-xl text-[13px]">데이터가 없습니다.</div>;

  // SVG 도넛 계산
  const R = 60; // 외반경
  const r = 36; // 내반경
  const cx = 80;
  const cy = 80;
  let cumAngle = -Math.PI / 2; // 12시 방향 시작

  const slices = data.map((row, i) => {
    const angle = (row.total / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(cumAngle);
    const y1 = cy + R * Math.sin(cumAngle);
    const x2 = cx + R * Math.cos(cumAngle + angle);
    const y2 = cy + R * Math.sin(cumAngle + angle);
    const ix1 = cx + r * Math.cos(cumAngle);
    const iy1 = cy + r * Math.sin(cumAngle);
    const ix2 = cx + r * Math.cos(cumAngle + angle);
    const iy2 = cy + r * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${r},${r} 0 ${large},0 ${ix1},${iy1} Z`;
    cumAngle += angle;
    return { path, color: COLOR_HEX[i % COLOR_HEX.length], label: row.label, pct: row.pct };
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-xl py-md">
      {/* SVG 도넛 */}
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      {/* 범례 */}
      <div className="flex flex-wrap gap-x-xl gap-y-sm">
        {data.map((row, i) => (
          <div key={row.label} className="flex items-center gap-sm min-w-[140px]">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: COLOR_HEX[i % COLOR_HEX.length] }} />
            <span className="text-[12px] text-content-secondary truncate">{row.label}</span>
            <span className="text-[12px] font-semibold tabular-nums ml-auto">
              {row.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SalesStats() {
  const [salesData, setSalesData] = useState<SalesRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('product');

  // 날짜 필터 (이번달 기본)
  const today = new Date();
  const defaultStart = fmtLocal(new Date(today.getFullYear(), today.getMonth(), 1));
  const defaultEnd = fmtLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const [dateStart, setDateStart] = useState(defaultStart);
  const [dateEnd, setDateEnd] = useState(defaultEnd);
  const [activePreset, setActivePreset] = useState('이번달');

  // 매출 데이터 조회
  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('sales')
      .select('id, saleDate, productName, type, category, salePrice, amount, paymentMethod, status, branchId')
      .eq('branchId', getBranchId())
      .neq('status', 'REFUNDED');

    if (dateStart) query = query.gte('saleDate', dateStart);
    if (dateEnd) query = query.lte('saleDate', dateEnd);

    const { data, error } = await query;
    setIsLoading(false);

    if (error) {
      console.error('매출 통계 데이터 로드 실패:', error);
      toast.error('매출 데이터를 불러오지 못했습니다.');
      return;
    }
    if (data) {
      setSalesData(
        data.map((row: Record<string, unknown>) => ({
          id: row.id as number,
          saleDate: (row.saleDate as string)?.slice(0, 10) ?? '',
          productName: (row.productName as string) ?? '(미지정)',
          type: (row.type as string) ?? '기타',
          category: (row.category as string) ?? '기타',
          salePrice: Number(row.salePrice) || Number(row.amount) || 0,
          paymentMethod: PAYMENT_KO[(row.paymentMethod as string) ?? ''] ?? (row.paymentMethod as string) ?? '기타',
          status: (row.status as string) ?? '',
        }))
      );
    }
  }, [dateStart, dateEnd]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // 날짜 프리셋
  const PRESETS = [
    { label: '이번달', start: defaultStart, end: defaultEnd },
    {
      label: '지난달',
      start: fmtLocal(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      end: fmtLocal(new Date(today.getFullYear(), today.getMonth(), 0)),
    },
    {
      label: '최근 3개월',
      start: fmtLocal(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      end: defaultEnd,
    },
  ];

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.label);
    setDateStart(preset.start);
    setDateEnd(preset.end);
  };

  // 집계 헬퍼: key 추출 함수 → AggRow[]
  const aggregate = (keyFn: (row: SalesRow) => string): AggRow[] => {
    const map = new Map<string, { count: number; total: number }>();
    salesData.forEach(row => {
      const key = keyFn(row) || '(미지정)';
      const prev = map.get(key) ?? { count: 0, total: 0 };
      prev.count += 1;
      prev.total += row.salePrice;
      map.set(key, prev);
    });
    const grandTotal = Array.from(map.values()).reduce((s, v) => s + v.total, 0) || 1;
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, ...v, pct: (v.total / grandTotal) * 100 }))
      .sort((a, b) => b.total - a.total);
  };

  // 탭별 집계 (useMemo)
  const productRows = useMemo(() => aggregate(r => r.productName), [salesData]);
  const typeRows = useMemo(() => aggregate(r => r.type), [salesData]);
  const paymentRows = useMemo(() => aggregate(r => r.paymentMethod), [salesData]);
  const categoryRows = useMemo(() => aggregate(r => r.category), [salesData]);

  // 공통 테이블 컬럼
  const aggColumns = (labelHeader: string) => [
    { key: 'label', header: labelHeader, width: 220 },
    {
      key: 'count', header: '판매건수', width: 100, align: 'center' as const,
      render: (v: number) => <span className="tabular-nums">{v.toLocaleString()}건</span>,
    },
    {
      key: 'total', header: '매출액', width: 160, align: 'right' as const,
      render: (v: number) => <span className="font-semibold tabular-nums">₩{v.toLocaleString()}</span>,
    },
    {
      key: 'pct', header: '비율', width: 100, align: 'right' as const,
      render: (v: number) => <span className="tabular-nums text-content-secondary">{v.toFixed(1)}%</span>,
    },
  ];

  const tabs = [
    { key: 'product', label: '상품별' },
    { key: 'type', label: '상품타입별' },
    { key: 'payment', label: '결제수단별' },
    { key: 'category', label: '종목별' },
  ];

  // 탭별 렌더 데이터
  const tabConfig: Record<string, { rows: AggRow[]; labelHeader: string; chartType: 'bar' | 'donut' }> = {
    product:  { rows: productRows,  labelHeader: '상품명',    chartType: 'bar' },
    type:     { rows: typeRows,     labelHeader: '상품타입',   chartType: 'donut' },
    payment:  { rows: paymentRows,  labelHeader: '결제수단',   chartType: 'donut' },
    category: { rows: categoryRows, labelHeader: '종목',      chartType: 'bar' },
  };

  const current = tabConfig[activeTab];
  const grandTotal = current.rows.reduce((s, r) => s + r.total, 0);

  return (
    <AppLayout>
      <PageHeader
        title="매출 통계"
        description="상품별, 결제수단별 매출을 분석합니다."
      />

      {/* 날짜 필터 */}
      <div className="bg-surface rounded-xl border border-line p-lg mb-xl flex flex-wrap items-center gap-md">
        <div className="flex items-center gap-xs">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              className={cn(
                'px-md py-xs rounded-button text-[13px] font-semibold border transition-all',
                activePreset === preset.label
                  ? 'bg-primary text-surface border-primary shadow-sm'
                  : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-sm ml-auto">
          <input
            type="date"
            value={dateStart}
            onChange={e => { setDateStart(e.target.value); setActivePreset(''); }}
            className="px-sm py-[5px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-all"
          />
          <span className="text-content-tertiary text-[13px]">~</span>
          <input
            type="date"
            value={dateEnd}
            onChange={e => { setDateEnd(e.target.value); setActivePreset(''); }}
            className="px-sm py-[5px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-all"
          />
          <button
            onClick={fetchSales}
            className="flex items-center gap-xs px-md py-[5px] bg-primary text-surface rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors"
          >
            <RefreshCw size={13} />
            조회
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="flex items-center gap-md p-lg border-b border-line">
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="ml-auto flex items-center gap-sm">
            <BarChart2 size={15} className="text-content-tertiary" />
            <span className="text-[13px] text-content-secondary">
              총 매출: <span className="font-bold text-content tabular-nums">₩{grandTotal.toLocaleString()}</span>
            </span>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="px-xl pt-lg pb-md border-b border-line-light">
          {isLoading ? (
            <div className="h-[120px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : current.rows.length === 0 ? (
            <div className="h-[80px] flex items-center justify-center text-[13px] text-content-tertiary">
              조회된 데이터가 없습니다.
            </div>
          ) : current.chartType === 'bar' ? (
            <HBarChart data={current.rows.slice(0, 10)} />
          ) : (
            <DonutChart data={current.rows} />
          )}
        </div>

        {/* 테이블 */}
        <DataTable
          columns={aggColumns(current.labelHeader)}
          data={current.rows as unknown as Record<string, unknown>[]}
          loading={isLoading}
          pagination={{ page: 1, pageSize: 20, total: current.rows.length }}
          emptyMessage="집계된 데이터가 없습니다."
        />
      </div>
    </AppLayout>
  );
}
