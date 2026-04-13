import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { TrendingDown, CheckCircle, Clock, CalendarDays } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import { formatKRW } from "@/lib/format";
import DataTable from "@/components/common/DataTable";
import { getDeferredRevenues, type DeferredRevenueItem } from '@/api/endpoints/deferredRevenue';

const fmtLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function DeferredRevenue() {
  const [items, setItems] = useState<DeferredRevenueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const today = new Date();
  const [dateStart, setDateStart] = useState(fmtLocal(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [dateEnd, setDateEnd] = useState(fmtLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0)));

  const fetchData = async () => {
    setIsLoading(true);
    const { data, error } = await getDeferredRevenues();
    setIsLoading(false);
    if (error) {
      toast.error('선수익금 데이터를 불러오지 못했습니다.');
      return;
    }
    setItems(data ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  // 기간 필터 적용
  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchStart = !dateStart || item.startDate >= dateStart;
      const matchEnd = !dateEnd || item.startDate <= dateEnd;
      return matchStart && matchEnd;
    });
  }, [items, dateStart, dateEnd]);

  // 통계 카드
  const stats = useMemo(() => {
    const total = filtered.reduce((s, i) => s + i.totalAmount, 0);
    const recognized = filtered.reduce((s, i) => s + i.recognizedAmount, 0);
    const remaining = filtered.reduce((s, i) => s + i.remainingAmount, 0);
    // 이번달 인식 예정: endDate가 이번달인 항목의 잔여금
    const thisMonth = fmtLocal(new Date(today.getFullYear(), today.getMonth(), 1)).slice(0, 7);
    const thisMonthExpected = filtered
      .filter(i => i.endDate.slice(0, 7) === thisMonth)
      .reduce((s, i) => s + i.remainingAmount, 0);
    return { total, recognized, remaining, thisMonthExpected };
  }, [filtered]);

  const columns = [
    { key: 'memberName', header: '회원명', width: 120 },
    { key: 'productName', header: '상품명', width: 200 },
    {
      key: 'totalAmount', header: '총액', width: 130, align: 'right' as const,
      render: (v: number) => <span className="tabular-nums font-semibold">{formatKRW(v)}</span>,
    },
    {
      key: 'recognizedAmount', header: '인식완료', width: 130, align: 'right' as const,
      render: (v: number) => <span className="tabular-nums text-state-success">{formatKRW(v)}</span>,
    },
    {
      key: 'remainingAmount', header: '잔여', width: 130, align: 'right' as const,
      render: (v: number) => <span className="tabular-nums text-primary font-semibold">{formatKRW(v)}</span>,
    },
    { key: 'startDate', header: '시작일', width: 110, align: 'center' as const },
    { key: 'endDate', header: '종료일', width: 110, align: 'center' as const },
    {
      key: 'progressPct', header: '진행률', width: 120, align: 'center' as const,
      render: (v: number) => {
        const barColor = v > 80 ? 'bg-red-500' : v >= 50 ? 'bg-amber-500' : 'bg-green-500';
        const textColor = v > 80 ? 'text-red-600' : v >= 50 ? 'text-amber-600' : 'text-green-600';
        return (
          <div className="flex items-center gap-sm">
            <div className="flex-1 h-[8px] bg-surface-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${v}%` }}
              />
            </div>
            <span className={`text-[11px] tabular-nums w-[36px] text-right font-semibold ${textColor}`}>{v}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="선수익금 조회"
        description="회원 계약별 선수익금 현황 및 인식 현황을 조회합니다."
      />

      {/* 통계 카드 */}
      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label="총 선수익금" value={formatKRW(stats.total)} variant="peach" icon={<TrendingDown />} />
        <StatCard label="인식 완료" value={formatKRW(stats.recognized)} variant="mint" icon={<CheckCircle />} />
        <StatCard label="잔여 선수익금" value={formatKRW(stats.remaining)} icon={<Clock />} />
        <StatCard label="이번달 인식 예정" value={formatKRW(stats.thisMonthExpected)} icon={<CalendarDays />} />
      </StatCardGrid>

      {/* 기간 필터 */}
      <div className="bg-surface rounded-xl border border-line p-lg mb-xl flex flex-wrap items-center gap-md">
        <span className="text-[13px] font-semibold text-content-secondary">기간 필터</span>
        <input
          type="date"
          value={dateStart}
          onChange={e => setDateStart(e.target.value)}
          className="px-sm py-[5px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-all"
        />
        <span className="text-content-tertiary text-[13px]">~</span>
        <input
          type="date"
          value={dateEnd}
          onChange={e => setDateEnd(e.target.value)}
          className="px-sm py-[5px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-all"
        />
      </div>

      {/* 테이블 */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          loading={isLoading}
          title={`총 ${filtered.length}건`}
          emptyMessage="선수익금 데이터가 없습니다."
          pagination={{ page: 1, pageSize: 20, total: filtered.length }}
        />
      </div>
    </AppLayout>
  );
}
