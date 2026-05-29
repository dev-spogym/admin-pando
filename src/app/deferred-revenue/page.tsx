'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { TrendingDown, CheckCircle, Clock, CalendarDays, AlertTriangle, RefreshCcw } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import { formatKRW } from "@/lib/format";
import DataTable from "@/components/common/DataTable";
import { getDeferredRevenues, type DeferredRevenueItem } from '@/api/endpoints/deferredRevenue';

// ─── SCR-S006 선수익금 조회 (SAL-04) ──────────────────────────────────────────
// docs4/V2/D03-매출관리/매출관리.md ## SCR-S006
// 회원이 선납한 금액 중 아직 서비스가 제공되지 않은 이연수익 현황을 조회한다.
// SAL-03 매출통계와 동일한 1/3/6/12/기타 5버킷으로 서비스일수를 판정해 인식 기간을 산정한다.
// 4축 상태: 로딩(스켈레톤) / 정상 / 빈(데이터 없음) / 오류(조회 실패).

const fmtLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// SAL-04 5버킷: 시작~종료 일수로 1/3/6/12개월·기타 분류 (SAL-03 동일 기준)
type Bucket = '1개월' | '3개월' | '6개월' | '12개월' | '기타';
const classifyBucket = (item: DeferredRevenueItem): Bucket => {
  const start = new Date(item.startDate);
  const end = new Date(item.endDate);
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 25 && days <= 35) return '1개월';
  if (days >= 80 && days <= 100) return '3개월';
  if (days >= 165 && days <= 195) return '6개월';
  if (days >= 350 && days <= 380) return '12개월';
  return '기타';
};
const BUCKETS: Bucket[] = ['1개월', '3개월', '6개월', '12개월', '기타'];

export default function DeferredRevenue() {
  const [items, setItems] = useState<DeferredRevenueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const today = new Date();
  const [dateStart, setDateStart] = useState(fmtLocal(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [dateEnd, setDateEnd] = useState(fmtLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
  // SAL-04 버킷 필터
  const [bucketFilter, setBucketFilter] = useState<Bucket | '전체'>('전체');

  const fetchData = async () => {
    setIsLoading(true);
    setLoadError(false);
    const { data, error } = await getDeferredRevenues();
    setIsLoading(false);
    if (error) {
      setLoadError(true);
      toast.error('선수익금 데이터를 불러오지 못했습니다.');
      return;
    }
    setItems(data ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  // 기간 + 버킷 필터 적용
  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchStart = !dateStart || item.startDate >= dateStart;
      const matchEnd = !dateEnd || item.startDate <= dateEnd;
      const matchBucket = bucketFilter === '전체' || classifyBucket(item) === bucketFilter;
      return matchStart && matchEnd && matchBucket;
    });
  }, [items, dateStart, dateEnd, bucketFilter]);

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

  // SAL-04 버킷별 집계 (탭 배지·필터용)
  const bucketCounts = useMemo(() => {
    const map: Record<Bucket, number> = { '1개월': 0, '3개월': 0, '6개월': 0, '12개월': 0, '기타': 0 };
    items.forEach(i => { map[classifyBucket(i)] += 1; });
    return map;
  }, [items]);

  const columns = [
    { key: 'memberName', header: '회원명', width: 120 },
    { key: 'productName', header: '상품명', width: 200 },
    {
      key: 'bucket', header: '기간 버킷', width: 100, align: 'center' as const,
      render: (_v: unknown, row: DeferredRevenueItem) => (
        <span className="rounded-full bg-surface-secondary px-2 py-[2px] text-[11px] font-semibold text-content-secondary">
          {classifyBucket(row)}
        </span>
      ),
    },
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
      key: 'progressPct', header: '인식 진행률', width: 130, align: 'center' as const,
      render: (v: number) => {
        const barColor = v > 80 ? 'bg-red-500' : v >= 50 ? 'bg-amber-500' : 'bg-green-500';
        const textColor = v > 80 ? 'text-red-600' : v >= 50 ? 'text-amber-600' : 'text-green-600';
        return (
          <div className="flex items-center gap-sm">
            <div className="flex-1 h-[8px] bg-surface-tertiary rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${v}%` }} />
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
        description="회원이 선납한 금액 중 아직 서비스가 제공되지 않은 이연수익(선수익금)을 조회합니다. 매출통계와 동일한 1·3·6·12개월·기타 5버킷으로 인식 기간을 산정합니다."
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCcw size={14} />} onClick={fetchData}>
            새로고침
          </Button>
        }
      />

      {/* 요약 지표 카드 */}
      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label="총 선수익금" value={formatKRW(stats.total)} variant="peach" icon={<TrendingDown />} />
        <StatCard label="인식 완료" value={formatKRW(stats.recognized)} variant="mint" icon={<CheckCircle />} />
        <StatCard label="잔여 선수익금" value={formatKRW(stats.remaining)} icon={<Clock />} />
        <StatCard label="이번달 인식 예정" value={formatKRW(stats.thisMonthExpected)} icon={<CalendarDays />} />
      </StatCardGrid>

      {/* 기간 + SAL-04 버킷 필터 */}
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
        <div className="ml-auto flex flex-wrap items-center gap-xs">
          <span className="text-[12px] font-semibold text-content-secondary">기간 버킷:</span>
          {(['전체', ...BUCKETS] as const).map(b => (
            <button
              key={b}
              onClick={() => setBucketFilter(b)}
              className={`rounded-button border px-sm py-[5px] text-[12px] font-semibold transition-all ${
                bucketFilter === b
                  ? 'bg-primary text-surface border-primary'
                  : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
              }`}
            >
              {b}{b !== '전체' && bucketCounts[b as Bucket] > 0 ? ` ${bucketCounts[b as Bucket]}` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* 4축 상태: 오류 / 로딩·정상·빈 (DataTable 내부 처리) */}
      {loadError ? (
        <EmptyState
          icon={AlertTriangle}
          title="선수익금을 불러오지 못했어요"
          description="일시적인 오류일 수 있습니다. 잠시 후 다시 시도해주세요."
          action={{ label: '다시 시도', onClick: fetchData }}
        />
      ) : (
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <DataTable
            columns={columns}
            data={filtered}
            loading={isLoading}
            title={`총 ${filtered.length}건`}
            emptyMessage="해당 기간·버킷의 선수익금이 없습니다."
            pagination={{ page: 1, pageSize: 20, total: filtered.length }}
          />
        </div>
      )}
    </AppLayout>
  );
}
