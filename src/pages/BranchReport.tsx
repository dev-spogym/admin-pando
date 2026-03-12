import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  Calendar as CalendarIcon,
  BarChart3,
  Download,
  ArrowUpDown,
  UserPlus,
  UserCheck,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/exportExcel';

// --- 타입 ---
interface BranchStat {
  id: number;
  name: string;
  totalMembers: number;
  newMembers: number;
  activeMembers: number;
  expiredMembers: number;
  totalSales: number;
  avgSales: number;
  attendanceRate: string;
}

// --- 월 옵션 생성 (최근 12개월) ---
function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    options.push({ value, label });
  }
  return options;
}

// --- StatCard (인라인 경량 버전) ---
interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  colorClass: string;
}
function KpiCard({ label, value, sub, icon, colorClass }: KpiCardProps) {
  return (
    <div className="p-lg bg-surface rounded-xl border border-line shadow-card flex items-start gap-md">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-Label text-content-secondary">{label}</p>
        <p className="text-KPI-Large font-bold text-content mt-xs">{value}</p>
        {sub && <p className="text-Label text-content-secondary mt-xs">{sub}</p>}
      </div>
    </div>
  );
}

// --- 바 차트 (div 기반) ---
interface BarChartProps {
  data: { label: string; value: number; formattedValue: string }[];
  colorClass: string;
  emptyLabel?: string;
}
function SimpleBarChart({ data, colorClass, emptyLabel = '데이터 없음' }: BarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  if (data.length === 0) {
    return <p className="text-sm text-content-secondary text-center py-xl">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-md">
      {data.map((item, idx) => (
        <div key={idx} className="space-y-xs">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-content truncate max-w-[60%]">{item.label}</span>
            <span className="text-content-secondary">{item.formattedValue}</span>
          </div>
          <div className="h-2 w-full bg-surface-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BranchReport() {
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [branchStats, setBranchStats] = useState<BranchStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortKey, setSortKey] = useState<keyof BranchStat>('totalSales');
  const [sortAsc, setSortAsc] = useState(false);

  // --- 데이터 로드 ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 전체 지점 조회
        const { data: branches, error: branchError } = await supabase
          .from('branches')
          .select('id, name')
          .order('id');

        if (branchError || !branches) {
          toast.error('지점 데이터를 불러오지 못했습니다.');
          return;
        }

        // 선택 월 범위 계산
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0);
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

        // 지점별 집계
        const stats = await Promise.all(
          branches.map(async (b) => {
            // 총 회원 수
            const { count: totalMembers } = await supabase
              .from('members')
              .select('*', { count: 'exact', head: true })
              .eq('branchId', b.id);

            // 신규 가입 (선택 월)
            const { count: newMembers } = await supabase
              .from('members')
              .select('*', { count: 'exact', head: true })
              .eq('branchId', b.id)
              .gte('regDate', startDate)
              .lte('regDate', endDateStr);

            // 활성 회원 (만료일이 endDate 이후)
            const { count: activeMembers } = await supabase
              .from('members')
              .select('*', { count: 'exact', head: true })
              .eq('branchId', b.id)
              .gte('expireDate', startDate);

            // 만료 회원 (만료일이 startDate 이전)
            const { count: expiredMembers } = await supabase
              .from('members')
              .select('*', { count: 'exact', head: true })
              .eq('branchId', b.id)
              .lt('expireDate', startDate);

            // 총 매출 (선택 월)
            const { data: salesData } = await supabase
              .from('sales')
              .select('totalAmount')
              .eq('branchId', b.id)
              .gte('saleDate', startDate)
              .lte('saleDate', endDateStr);

            const totalSales = salesData?.reduce(
              (sum, s) => sum + Number(s.totalAmount || 0),
              0
            ) ?? 0;

            const total = totalMembers ?? 0;
            const avgSales = total > 0 ? Math.round(totalSales / total) : 0;

            return {
              id: b.id,
              name: b.name,
              totalMembers: total,
              newMembers: newMembers ?? 0,
              activeMembers: activeMembers ?? 0,
              expiredMembers: expiredMembers ?? 0,
              totalSales,
              avgSales,
              attendanceRate: '-',
            } as BranchStat;
          })
        );

        setBranchStats(stats);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  // --- 정렬 ---
  const handleSort = (key: keyof BranchStat) => {
    if (sortKey === key) {
      setSortAsc(a => !a);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortedStats = useMemo(() => {
    return [...branchStats].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [branchStats, sortKey, sortAsc]);

  // --- KPI 집계 ---
  const kpi = useMemo(() => ({
    totalSales: branchStats.reduce((s, b) => s + b.totalSales, 0),
    totalMembers: branchStats.reduce((s, b) => s + b.totalMembers, 0),
    newMembers: branchStats.reduce((s, b) => s + b.newMembers, 0),
    activeMembers: branchStats.reduce((s, b) => s + b.activeMembers, 0),
  }), [branchStats]);

  // --- 차트 데이터 ---
  const salesChartData = useMemo(
    () =>
      sortedStats.map(b => ({
        label: b.name,
        value: b.totalSales,
        formattedValue: `${b.totalSales.toLocaleString()}원`,
      })),
    [sortedStats]
  );

  const memberChartData = useMemo(
    () =>
      sortedStats.map(b => ({
        label: b.name,
        value: b.totalMembers,
        formattedValue: `${b.totalMembers.toLocaleString()}명`,
      })),
    [sortedStats]
  );

  // --- 테이블 컬럼 ---
  const SortHeader = ({ label, colKey }: { label: string; colKey: keyof BranchStat }) => (
    <button
      className="flex items-center gap-xs hover:text-primary transition-colors"
      onClick={() => handleSort(colKey)}
    >
      {label}
      <ArrowUpDown size={12} className={sortKey === colKey ? 'text-primary' : 'text-content-secondary/50'} />
    </button>
  );

  const tableColumns = [
    {
      key: 'name',
      header: '지점명',
      sortable: false,
      render: (v: string) => <span className="font-medium text-content">{v}</span>,
    },
    {
      key: 'totalMembers',
      header: <SortHeader label="총회원" colKey="totalMembers" />,
      align: 'right' as const,
      render: (v: number) => <span>{v.toLocaleString()}명</span>,
    },
    {
      key: 'newMembers',
      header: <SortHeader label="신규가입" colKey="newMembers" />,
      align: 'right' as const,
      render: (v: number) => (
        <span className={v > 0 ? 'text-primary font-semibold' : 'text-content-secondary'}>
          {v.toLocaleString()}명
        </span>
      ),
    },
    {
      key: 'activeMembers',
      header: <SortHeader label="활성회원" colKey="activeMembers" />,
      align: 'right' as const,
      render: (v: number) => <span className="text-state-success font-medium">{v.toLocaleString()}명</span>,
    },
    {
      key: 'expiredMembers',
      header: <SortHeader label="만료회원" colKey="expiredMembers" />,
      align: 'right' as const,
      render: (v: number) => <span className="text-content-secondary">{v.toLocaleString()}명</span>,
    },
    {
      key: 'totalSales',
      header: <SortHeader label="총매출" colKey="totalSales" />,
      align: 'right' as const,
      render: (v: number) => <span className="font-semibold">{v.toLocaleString()}원</span>,
    },
    {
      key: 'avgSales',
      header: <SortHeader label="객단가" colKey="avgSales" />,
      align: 'right' as const,
      render: (v: number) => <span>{v.toLocaleString()}원</span>,
    },
    {
      key: 'attendanceRate',
      header: '출석률',
      align: 'center' as const,
      render: (v: string) => <span className="text-content-secondary">{v}</span>,
    },
  ];

  // --- 엑셀 다운로드 ---
  const handleDownloadExcel = () => {
    const exportColumns = [
      { key: 'name', header: '지점명' },
      { key: 'totalMembers', header: '총회원' },
      { key: 'newMembers', header: '신규가입' },
      { key: 'activeMembers', header: '활성회원' },
      { key: 'expiredMembers', header: '만료회원' },
      { key: 'totalSales', header: '총매출(원)' },
      { key: 'avgSales', header: '객단가(원)' },
      { key: 'attendanceRate', header: '출석률' },
    ];
    const label = monthOptions.find(m => m.value === selectedMonth)?.label ?? selectedMonth;
    exportToExcel(sortedStats as unknown as Record<string, unknown>[], exportColumns, {
      filename: `지점비교리포트_${label}`,
    });
    toast.success(`${sortedStats.length}개 지점 엑셀 다운로드 완료`);
  };

  const selectedLabel = monthOptions.find(m => m.value === selectedMonth)?.label ?? selectedMonth;

  return (
    <AppLayout>
      <PageHeader
        title="지점 비교 리포트"
        description="전체 지점의 핵심 지표를 비교하고 분석합니다."
        actions={
          <div className="flex items-center gap-sm">
            {/* 월 선택 */}
            <div className="flex items-center gap-xs px-md py-sm bg-surface border border-line rounded-button shadow-card">
              <CalendarIcon size={15} className="text-content-secondary" />
              <select
                className="bg-transparent text-sm text-content focus:outline-none cursor-pointer"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {/* 엑셀 다운로드 */}
            <button
              className="flex items-center gap-xs px-md py-sm bg-primary text-white hover:opacity-90 transition-all rounded-button text-Label font-semibold"
              onClick={handleDownloadExcel}
              disabled={isLoading || branchStats.length === 0}
            >
              <Download size={15} />
              엑셀 다운로드
            </button>
          </div>
        }
      />

      {/* 기간 표시 */}
      <p className="text-sm text-content-secondary mb-lg">
        기준 기간: <span className="font-semibold text-content">{selectedLabel}</span>
        {isLoading && <span className="ml-sm text-primary animate-pulse">로딩 중...</span>}
      </p>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <KpiCard
          label="전체 총매출"
          value={`${kpi.totalSales.toLocaleString()}원`}
          sub={`${branchStats.length}개 지점 합산`}
          icon={<TrendingUp size={20} className="text-peach" />}
          colorClass="bg-peach/10"
        />
        <KpiCard
          label="전체 총회원"
          value={`${kpi.totalMembers.toLocaleString()}명`}
          sub="전 지점 누적"
          icon={<Users size={20} className="text-primary" />}
          colorClass="bg-primary-light"
        />
        <KpiCard
          label="신규 가입"
          value={`${kpi.newMembers.toLocaleString()}명`}
          sub={selectedLabel + ' 기준'}
          icon={<UserPlus size={20} className="text-accent" />}
          colorClass="bg-accent-light"
        />
        <KpiCard
          label="활성 회원"
          value={`${kpi.activeMembers.toLocaleString()}명`}
          sub="이용권 유효"
          icon={<UserCheck size={20} className="text-state-success" />}
          colorClass="bg-state-success/10"
        />
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md mb-lg">
        {/* 매출 바 차트 */}
        <div className="p-lg bg-surface rounded-xl border border-line shadow-card">
          <h3 className="text-base font-bold text-content flex items-center gap-xs mb-lg">
            <BarChart3 size={18} className="text-primary" />
            지점별 매출 비교
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-[160px]">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <SimpleBarChart data={salesChartData} colorClass="bg-primary" emptyLabel="매출 데이터 없음" />
          )}
        </div>

        {/* 회원수 바 차트 */}
        <div className="p-lg bg-surface rounded-xl border border-line shadow-card">
          <h3 className="text-base font-bold text-content flex items-center gap-xs mb-lg">
            <Users size={18} className="text-accent" />
            지점별 회원수 비교
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-[160px]">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : (
            <SimpleBarChart data={memberChartData} colorClass="bg-accent" emptyLabel="회원 데이터 없음" />
          )}
        </div>
      </div>

      {/* 지점별 비교 테이블 */}
      <DataTable
        title={`지점별 상세 비교 (${selectedLabel})`}
        columns={tableColumns}
        data={sortedStats}
        onDownloadExcel={handleDownloadExcel}
      />
    </AppLayout>
  );
}
