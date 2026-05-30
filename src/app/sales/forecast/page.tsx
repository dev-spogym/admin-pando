'use client';
export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TrendingUp, Target, Percent, BarChart2, Settings, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import ChartCard from '@/components/common/ChartCard';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatKRW } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';

// ─── SCR-S011 매출 예측 (SAL-07) ──────────────────────────────────────────────
// docs4/V1/D03-매출관리/매출관리.md ## SCR-S011
// sales 실적 기반 예측 + DLG-S012 목표매출설정 DB 저장.

interface MonthlyData {
  month: string;
  actual: number | null;
  forecast: number | null;
  yoy: number | null;
}

interface ProductContribution {
  name: string;
  amount: number;
  pct: number;
}

type Period = '다음 달' | '다음 분기' | '연간';

type ForecastTarget = {
  id: number | null;
  amount: number;
  approvalStatus: 'APPROVED' | 'PENDING';
};

const PERIODS: Period[] = ['다음 달', '다음 분기', '연간'];
const EMPTY_TARGETS: Record<Period, ForecastTarget> = {
  '다음 달': { id: null, amount: 0, approvalStatus: 'APPROVED' },
  '다음 분기': { id: null, amount: 0, approvalStatus: 'APPROVED' },
  연간: { id: null, amount: 0, approvalStatus: 'APPROVED' },
};

const fmtLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const addMonths = (date: Date, delta: number) => new Date(date.getFullYear(), date.getMonth() + delta, 1);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const parseMoney = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

const buildForecast = (salesRows: Record<string, unknown>[]) => {
  const now = new Date();
  const currentMonth = monthKey(now);
  const monthly = new Map<string, number>();
  const productMap = new Map<string, number>();

  salesRows.forEach(row => {
    const saleDate = String(row.saleDate ?? '').slice(0, 10);
    if (!saleDate) return;
    const key = saleDate.slice(0, 7);
    const amount = parseMoney(row.amount as string | number) || parseMoney(row.salePrice as string | number);
    monthly.set(key, (monthly.get(key) ?? 0) + amount);

    const saleMonthDate = new Date(`${key}-01T00:00:00`);
    const monthsAgo = (now.getFullYear() - saleMonthDate.getFullYear()) * 12 + now.getMonth() - saleMonthDate.getMonth();
    if (monthsAgo >= 0 && monthsAgo <= 2) {
      const productName = String(row.productName ?? '기타 상품');
      productMap.set(productName, (productMap.get(productName) ?? 0) + amount);
    }
  });

  const pastKeys = Array.from({ length: 6 }, (_, idx) => monthKey(addMonths(now, idx - 5)));
  const actualValues = pastKeys.map(key => monthly.get(key) ?? 0).filter(v => v > 0);
  const avg = actualValues.length > 0 ? actualValues.reduce((s, v) => s + v, 0) / actualValues.length : 0;
  const first = actualValues[0] ?? avg;
  const last = actualValues[actualValues.length - 1] ?? avg;
  const trend = first > 0 && actualValues.length > 1 ? clamp(((last - first) / first) / (actualValues.length - 1), -0.2, 0.2) : 0;
  const forecastFor = (n: number) => Math.max(0, Math.round(avg * (1 + trend * n)));

  const history: MonthlyData[] = Array.from({ length: 9 }, (_, idx) => {
    const displayDate = addMonths(now, idx - 5);
    const key = monthKey(displayDate);
    const isFuture = key > currentMonth;
    const actual = monthly.get(key) ?? null;
    const yoy = monthly.get(monthKey(addMonths(displayDate, -12))) ?? null;
    const futureIndex = Math.max(1, idx - 5);
    return {
      month: key,
      actual: isFuture ? null : actual,
      forecast: isFuture ? forecastFor(futureIndex) : null,
      yoy,
    };
  });

  const currentYearActual = Array.from(monthly.entries())
    .filter(([key]) => key.startsWith(String(now.getFullYear())) && key <= currentMonth)
    .reduce((sum, [, amount]) => sum + amount, 0);
  const remainingMonthCount = 11 - now.getMonth();
  const annualProjection = currentYearActual + Array.from({ length: remainingMonthCount }, (_, idx) => forecastFor(idx + 1)).reduce((s, v) => s + v, 0);

  const productTotal = Array.from(productMap.values()).reduce((s, v) => s + v, 0);
  const productContrib = Array.from(productMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount, pct: productTotal > 0 ? Math.round((amount / productTotal) * 100) : 0 }));

  return {
    history,
    productContrib,
    actualMonthCount: actualValues.length,
    forecastSummary: {
      '다음 달': forecastFor(1),
      '다음 분기': forecastFor(1) + forecastFor(2) + forecastFor(3),
      연간: Math.round(annualProjection),
    } as Record<Period, number>,
  };
};

export default function ForecastPage() {
  const [period, setPeriod] = useState<Period>('다음 달');
  const [targets, setTargets] = useState<Record<Period, ForecastTarget>>(EMPTY_TARGETS);
  const [history, setHistory] = useState<MonthlyData[]>([]);
  const [productContrib, setProductContrib] = useState<ProductContribution[]>([]);
  const [forecastSummary, setForecastSummary] = useState<Record<Period, number>>({ '다음 달': 0, '다음 분기': 0, 연간: 0 });
  const [actualMonthCount, setActualMonthCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState('0');

  const authUser = useAuthStore((s) => s.user);
  const canSetGoal = Boolean(authUser?.isSuperAdmin) || isRoleAtLeast(normalizeRole(authUser?.role ?? ''), 'manager');
  const currentTarget = targets[period]?.amount ?? 0;
  const currentApprovalStatus = targets[period]?.approvalStatus ?? 'APPROVED';
  const currentMonth = monthKey(new Date());

  const fetchForecastData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    const branchId = getBranchId();
    const fromDate = fmtLocal(addMonths(new Date(), -18));
    const [salesResult, targetResult] = await Promise.all([
      supabase
        .from('sales')
        .select('id, saleDate, amount, salePrice, productName, status, branchId')
        .eq('branchId', branchId)
        .eq('status', 'COMPLETED')
        .gte('saleDate', fromDate)
        .order('saleDate', { ascending: true }),
      supabase
        .from('sales_forecast_targets')
        .select('id, period, targetMonth, targetAmount, approvalStatus')
        .eq('branchId', branchId)
        .eq('targetMonth', currentMonth),
    ]);

    setIsLoading(false);

    if (salesResult.error) {
      console.error('매출 예측 데이터 로드 실패:', salesResult.error);
      setLoadError(true);
      toast.error(`매출 예측 데이터를 불러오지 못했습니다: ${salesResult.error.message}`);
      return;
    }
    if (targetResult.error) {
      console.error('매출 목표 로드 실패:', targetResult.error);
      toast.error('매출 목표 설정을 불러오지 못했습니다.');
    }

    const built = buildForecast((salesResult.data ?? []) as Record<string, unknown>[]);
    setHistory(built.history);
    setProductContrib(built.productContrib);
    setActualMonthCount(built.actualMonthCount);
    setForecastSummary(built.forecastSummary);

    const nextTargets: Record<Period, ForecastTarget> = { ...EMPTY_TARGETS };
    (targetResult.data ?? []).forEach(row => {
      const key = row.period as Period;
      if (!PERIODS.includes(key)) return;
      nextTargets[key] = {
        id: Number(row.id),
        amount: parseMoney(row.targetAmount as string | number),
        approvalStatus: (row.approvalStatus as 'APPROVED' | 'PENDING') ?? 'APPROVED',
      };
    });
    setTargets(nextTargets);
  }, [currentMonth]);

  useEffect(() => {
    fetchForecastData();
  }, [fetchForecastData]);

  const openGoalDialog = (draft: number) => {
    if (!canSetGoal) {
      toast.error('목표 변경 권한이 없습니다. 매니저에게 요청해주세요.');
      return;
    }
    setGoalDraft(String(draft || ''));
    setGoalOpen(true);
  };

  const forecastAmount = forecastSummary[period] ?? 0;
  const thisMonthActual = history.find(m => m.month === currentMonth)?.actual ?? 0;

  const stats = useMemo(() => {
    const achievement = currentTarget > 0 ? Math.round((forecastAmount / currentTarget) * 100) : 0;
    const prevMonth = history.find(m => m.month === monthKey(addMonths(new Date(), -1)))?.actual ?? 0;
    const momChange = prevMonth > 0 ? Math.round(((forecastAmount - prevMonth) / prevMonth) * 100) : 0;
    return { achievement, momChange };
  }, [currentTarget, forecastAmount, history]);

  const handleSaveGoal = async () => {
    const goalAmount = parseMoney(goalDraft);
    if (goalAmount < 0) {
      toast.error('0 이상 입력해주세요.');
      return;
    }

    const branchId = getBranchId();
    const approvalStatus = goalAmount >= 100000000 ? 'PENDING' : 'APPROVED';
    const existingId = targets[period]?.id;
    const payload = {
      branchId,
      period,
      targetMonth: currentMonth,
      targetAmount: goalAmount,
      approvalStatus,
      requestedBy: authUser?.name ?? null,
      updatedAt: new Date().toISOString(),
    };

    const result = existingId
      ? await supabase.from('sales_forecast_targets').update(payload).eq('id', existingId)
      : await supabase.from('sales_forecast_targets').insert(payload);

    if (result.error) {
      toast.error(`목표 저장 실패: ${result.error.message}`);
      return;
    }

    toast.success(approvalStatus === 'PENDING' ? '본사 승인 요청이 등록되었습니다.' : '저장되었습니다.');
    setGoalOpen(false);
    fetchForecastData();
  };

  const maxChartVal = Math.max(1, ...history.map(m => Math.max(m.actual ?? 0, m.forecast ?? 0, m.yoy ?? 0, currentTarget)));
  const enoughHistory = actualMonthCount >= 6;

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="매출 예측" description="과거 매출 추세를 기반으로 향후 매출을 예측하고 목표 대비 달성률을 확인합니다." />
        <div className="rounded-xl border border-line bg-surface p-xl text-center text-[13px] text-content-secondary">
          매출 예측 데이터를 불러오는 중입니다.
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout>
        <PageHeader title="매출 예측" description="과거 매출 추세를 기반으로 향후 매출을 예측하고 목표 대비 달성률을 확인합니다." />
        <EmptyState
          icon={AlertTriangle}
          title="매출 예측 데이터를 불러오지 못했어요"
          description="일시적인 오류일 수 있습니다. 다시 시도해주세요."
          action={{ label: '다시 시도', onClick: fetchForecastData }}
        />
      </AppLayout>
    );
  }

  if (!enoughHistory) {
    return (
      <AppLayout>
        <PageHeader
          title="매출 예측"
          description="과거 매출 추세를 기반으로 향후 매출을 예측하고 목표 대비 달성률을 확인합니다."
          actions={
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={fetchForecastData}>
              새로고침
            </Button>
          }
        />
        <EmptyState
          icon={BarChart2}
          title="예측에 필요한 데이터가 부족해요"
          description={`최소 6개월 이상의 완료 매출 데이터가 필요합니다. 현재 확인된 월은 ${actualMonthCount}개월입니다.`}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="매출 예측"
        description="과거 매출 추세를 기반으로 향후 매출을 예측하고 목표 대비 달성률을 확인합니다."
        actions={
          <div className="flex flex-wrap items-center gap-xs">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-button border px-md py-xs text-[13px] font-semibold transition-all',
                  period === p
                    ? 'bg-primary text-surface border-primary shadow-sm'
                    : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
                )}
              >
                {p}
              </button>
            ))}
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={fetchForecastData}>
              새로고침
            </Button>
            {canSetGoal && (
              <Button variant="outline" size="sm" icon={<Settings size={14} />} onClick={() => openGoalDialog(currentTarget)}>
                목표 설정
              </Button>
            )}
          </div>
        }
      />

      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label={`${period} 예측 매출`} value={formatKRW(forecastAmount)} variant="peach" icon={<TrendingUp />} />
        <StatCard
          label="목표 달성률"
          value={currentTarget > 0 ? `${stats.achievement}%` : '미설정'}
          variant={stats.achievement >= 100 ? 'mint' : 'default'}
          icon={<Target />}
        />
        <StatCard label="전월 대비 증감" value={`${stats.momChange >= 0 ? '+' : ''}${stats.momChange}%`} icon={<Percent />} />
        <StatCard label="이번 달 실적" value={formatKRW(thisMonthActual)} icon={<BarChart2 />} />
      </StatCardGrid>

      {currentApprovalStatus === 'PENDING' && (
        <div className="mb-lg rounded-xl border border-amber-200 bg-amber-50 px-md py-sm text-[13px] text-amber-700">
          현재 {period} 목표는 본사 승인 대기 상태입니다.
        </div>
      )}

      <div className="mb-xl grid gap-lg lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <ChartCard title="매출 예측 추이" description="실선=실적, 점선=예측, 전년 동기와 목표를 함께 비교합니다.">
          <div className="flex h-[240px] items-end gap-sm pt-md">
            {history.map(m => {
              const actualH = m.actual ? (m.actual / maxChartVal) * 100 : 0;
              const forecastH = m.forecast ? (m.forecast / maxChartVal) * 100 : 0;
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-xs">
                  <div className="flex w-full flex-1 items-end justify-center gap-[2px]">
                    {m.actual !== null && (
                      <div className="w-1/2 rounded-t bg-primary transition-all" style={{ height: `${actualH}%` }} title={`실적 ${formatKRW(m.actual)}`} />
                    )}
                    {m.forecast !== null && (
                      <div className="w-1/2 rounded-t border border-dashed border-accent bg-accent/30 transition-all" style={{ height: `${forecastH}%` }} title={`예측 ${formatKRW(m.forecast)}`} />
                    )}
                  </div>
                  <span className="text-[10px] text-content-tertiary">{m.month.slice(5)}월</span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="목표 달성률">
          {currentTarget > 0 ? (
            <div className="flex h-full flex-col justify-center gap-md">
              <div className="text-center">
                <p className={cn('text-[40px] font-bold tabular-nums', stats.achievement >= 100 ? 'text-state-success' : 'text-primary')}>
                  {stats.achievement}%
                </p>
                <p className="mt-xs text-[12px] text-content-secondary">
                  목표 {formatKRW(currentTarget)} 대비 예측 {formatKRW(forecastAmount)}
                </p>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-tertiary">
                <div
                  className={cn('h-full rounded-full transition-all', stats.achievement >= 100 ? 'bg-state-success' : 'bg-primary')}
                  style={{ width: `${Math.min(100, stats.achievement)}%` }}
                />
              </div>
              {stats.achievement >= 100 && (
                <p className="text-center text-[12px] font-semibold text-state-success">목표를 초과 달성할 것으로 예측됩니다.</p>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-md text-center">
              <p className="text-[13px] text-content-secondary">목표 매출을 설정하면 달성률 게이지가 표시됩니다.</p>
              {canSetGoal ? (
                <Button variant="primary" size="sm" icon={<Target size={14} />} onClick={() => openGoalDialog(0)}>
                  목표 설정하기
                </Button>
              ) : (
                <p className="text-[12px] text-content-tertiary">목표 변경 권한이 없습니다. 매니저에게 요청해주세요.</p>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-lg lg:grid-cols-2">
        <ChartCard title="상품별 예측 기여도">
          {productContrib.length === 0 ? (
            <p className="py-xl text-center text-[13px] text-content-secondary">최근 3개월 상품별 매출 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-sm">
              {productContrib.map((p, idx) => (
                <div key={p.name} className="flex items-center gap-md">
                  <span className="w-5 text-[12px] font-bold text-content-tertiary tabular-nums">{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-content">{p.name}</span>
                      <span className="tabular-nums text-content-secondary">{formatKRW(p.amount)}</span>
                    </div>
                    <div className="mt-xs h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                  <span className="w-9 text-right text-[12px] font-semibold tabular-nums text-primary">{p.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="월별 예측 상세">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line">
              <tr className="text-[11px] font-bold text-content-secondary">
                <th className="py-2 text-left">월</th>
                <th className="py-2 text-right">예측/실적</th>
                <th className="py-2 text-right">목표</th>
                <th className="py-2 text-right">전년 동기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {history.filter(m => m.forecast !== null || m.month >= currentMonth).map(m => {
                const value = m.actual ?? m.forecast ?? 0;
                return (
                  <tr key={m.month}>
                    <td className="py-2 font-medium text-content">{m.month}</td>
                    <td className="py-2 text-right tabular-nums text-content">{formatKRW(value)}</td>
                    <td className="py-2 text-right tabular-nums text-content-secondary">{currentTarget > 0 ? formatKRW(currentTarget) : '-'}</td>
                    <td className="py-2 text-right tabular-nums text-content-tertiary">{m.yoy ? formatKRW(m.yoy) : '비교 불가'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ChartCard>
      </div>

      <Modal
        isOpen={goalOpen}
        onClose={() => setGoalOpen(false)}
        title="매출 목표 설정"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setGoalOpen(false)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleSaveGoal}>저장</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <Input
            label={`${period} 매출 목표 (원)`}
            type="number"
            value={goalDraft}
            onChange={e => setGoalDraft(e.target.value)}
            hint="1억원 이상 목표는 본사 승인 대기 상태로 저장됩니다."
          />
          {parseMoney(goalDraft) >= 100000000 && (
            <p className="text-[12px] text-amber-600">1억원 이상 목표는 저장 시 본사 승인 큐로 전송됩니다.</p>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
