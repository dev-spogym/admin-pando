'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TrendingUp, Target, Percent, BarChart2, Settings } from 'lucide-react';
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

// ─── SCR-S011 매출 예측 (SAL-07) ──────────────────────────────────────────────
// docs4/V1/D03-매출관리/매출관리.md ## SCR-S011
// 과거 실적 + 예측 차트, 목표 대비 달성률 게이지, 상품별 예측 기여도, 월별 예측 테이블.
// DLG-S012 목표매출설정. 4축 상태: 로딩 / 정상 / 데이터 부족 / 목표 미설정.

interface MonthlyData {
  month: string;
  actual: number | null; // 과거 실적
  forecast: number | null; // 예측
  yoy: number | null; // 전년 동기
}

type Period = '다음 달' | '다음 분기' | '연간';

const HISTORY: MonthlyData[] = [
  { month: '2025-12', actual: 11800000, forecast: null, yoy: 10500000 },
  { month: '2026-01', actual: 11500000, forecast: null, yoy: 10800000 },
  { month: '2026-02', actual: 12800000, forecast: null, yoy: 11200000 },
  { month: '2026-03', actual: 13200000, forecast: null, yoy: 11900000 },
  { month: '2026-04', actual: 12600000, forecast: null, yoy: 12100000 },
  { month: '2026-05', actual: 9400000, forecast: 13100000, yoy: 12400000 }, // 진행 중(실적+예측 혼재)
  { month: '2026-06', actual: null, forecast: 13800000, yoy: 12900000 },
  { month: '2026-07', actual: null, forecast: 14200000, yoy: 13100000 },
];

const PRODUCT_CONTRIB = [
  { name: 'PT 패키지', amount: 5200000, pct: 38 },
  { name: '연간 회원권', amount: 3600000, pct: 26 },
  { name: '필라테스/요가', amount: 2400000, pct: 17 },
  { name: '골프 레슨', amount: 1500000, pct: 11 },
  { name: '기타 상품', amount: 1100000, pct: 8 },
];

const PERIODS: Period[] = ['다음 달', '다음 분기', '연간'];

// 기간별 예측 합계
const forecastByPeriod = (period: Period): number => {
  if (period === '다음 달') return 13800000;
  if (period === '다음 분기') return 13800000 + 14200000 + 14600000;
  return 165000000;
};

export default function ForecastPage() {
  const [period, setPeriod] = useState<Period>('다음 달');
  const [target, setTarget] = useState<number>(13500000); // 0이면 목표 미설정 상태
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState(13500000);

  // 데이터 부족(6개월 미만) 시뮬레이션 토글 (예외처리 데모용)
  const enoughHistory = HISTORY.filter(m => m.actual !== null).length >= 6;

  const thisMonth = HISTORY.find(m => m.month === '2026-05')!;
  const cumulativeActual = thisMonth.actual ?? 0;
  const forecastAmount = forecastByPeriod(period);

  const stats = useMemo(() => {
    const achievement = target > 0 ? Math.round((cumulativeActual / target) * 100) : 0;
    const prevMonth = HISTORY.find(m => m.month === '2026-04')?.actual ?? 0;
    const momChange = prevMonth > 0 ? Math.round(((forecastAmount - prevMonth) / prevMonth) * 100) : 0;
    const quarterCumulative = HISTORY.filter(m => ['2026-04', '2026-05', '2026-06'].includes(m.month))
      .reduce((s, m) => s + (m.actual ?? m.forecast ?? 0), 0);
    return { achievement, momChange, quarterCumulative };
  }, [target, cumulativeActual, forecastAmount]);

  const handleSaveGoal = () => {
    if (goalDraft < 0) {
      toast.error('0 이상 입력해주세요.');
      return;
    }
    // 1억원+ 목표는 본사 승인 대기 안내
    if (goalDraft >= 100000000) {
      toast.success('본사 승인 요청이 등록되었습니다.');
    } else {
      toast.success('저장되었습니다.');
    }
    setTarget(goalDraft);
    setGoalOpen(false);
  };

  const maxChartVal = Math.max(...HISTORY.map(m => Math.max(m.actual ?? 0, m.forecast ?? 0, m.yoy ?? 0)));

  // 데이터 부족 상태
  if (!enoughHistory) {
    return (
      <AppLayout>
        <PageHeader title="매출 예측" description="과거 매출 추세를 기반으로 향후 매출을 예측하고 목표 대비 달성률을 확인합니다." />
        <EmptyState
          icon={BarChart2}
          title="예측에 필요한 데이터가 부족해요"
          description="최소 6개월 이상의 매출 데이터가 누적되면 예측 차트가 활성화됩니다."
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
          <div className="flex items-center gap-xs">
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
            <Button variant="outline" size="sm" icon={<Settings size={14} />} onClick={() => { setGoalDraft(target); setGoalOpen(true); }}>
              목표 설정
            </Button>
          </div>
        }
      />

      {/* 요약 지표 카드 (4개) */}
      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label={`${period} 예측 매출`} value={formatKRW(forecastAmount)} variant="peach" icon={<TrendingUp />} />
        <StatCard
          label="목표 달성률"
          value={target > 0 ? `${stats.achievement}%` : '미설정'}
          variant={stats.achievement >= 100 ? 'mint' : 'default'}
          icon={<Target />}
        />
        <StatCard label="전월 대비 증감" value={`${stats.momChange >= 0 ? '+' : ''}${stats.momChange}%`} icon={<Percent />} />
        <StatCard label="이번 분기 누적" value={formatKRW(stats.quarterCumulative)} icon={<BarChart2 />} />
      </StatCardGrid>

      <div className="mb-xl grid gap-lg lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        {/* 매출 예측 차트 (과거 실적 + 예측 + 목표 라인) */}
        <ChartCard title="매출 예측 추이" description="실선=실적, 점선=예측, 가로선=이번 달 목표">
          <div className="flex h-[240px] items-end gap-sm pt-md">
            {HISTORY.map(m => {
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

        {/* 달성률 게이지 (목표 미설정 시 입력 안내) */}
        <ChartCard title="목표 달성률">
          {target > 0 ? (
            <div className="flex h-full flex-col justify-center gap-md">
              <div className="text-center">
                <p className={cn('text-[40px] font-bold tabular-nums', stats.achievement >= 100 ? 'text-state-success' : 'text-primary')}>
                  {stats.achievement}%
                </p>
                <p className="mt-xs text-[12px] text-content-secondary">
                  목표 {formatKRW(target)} 중 {formatKRW(cumulativeActual)} 달성
                </p>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-tertiary">
                <div
                  className={cn('h-full rounded-full transition-all', stats.achievement >= 100 ? 'bg-state-success' : 'bg-primary')}
                  style={{ width: `${Math.min(100, stats.achievement)}%` }}
                />
              </div>
              {stats.achievement >= 100 && (
                <p className="text-center text-[12px] font-semibold text-state-success">목표를 초과 달성했습니다.</p>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-md text-center">
              <p className="text-[13px] text-content-secondary">목표 매출을 설정하면 달성률 게이지가 표시됩니다.</p>
              <Button variant="primary" size="sm" icon={<Target size={14} />} onClick={() => { setGoalDraft(0); setGoalOpen(true); }}>
                목표 설정하기
              </Button>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-lg lg:grid-cols-2">
        {/* 상품별 예측 기여도 */}
        <ChartCard title="상품별 예측 기여도">
          <div className="space-y-sm">
            {PRODUCT_CONTRIB.map((p, idx) => (
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
        </ChartCard>

        {/* 월별 예측 테이블 */}
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
              {HISTORY.filter(m => m.forecast !== null || m.month >= '2026-05').map(m => {
                const value = m.actual ?? m.forecast ?? 0;
                return (
                  <tr key={m.month}>
                    <td className="py-2 font-medium text-content">{m.month}</td>
                    <td className="py-2 text-right tabular-nums text-content">{formatKRW(value)}</td>
                    <td className="py-2 text-right tabular-nums text-content-secondary">{target > 0 ? formatKRW(target) : '-'}</td>
                    <td className="py-2 text-right tabular-nums text-content-tertiary">{m.yoy ? formatKRW(m.yoy) : '비교 불가'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ChartCard>
      </div>

      {/* DLG-S012 목표매출설정 */}
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
            onChange={e => setGoalDraft(Number(e.target.value) || 0)}
            hint="1억원 이상 목표는 본사 슈퍼관리자 승인이 필요합니다."
          />
          {goalDraft >= 100000000 && (
            <p className="text-[12px] text-amber-600">1억원 이상 목표는 저장 시 본사 승인 큐로 전송됩니다.</p>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
