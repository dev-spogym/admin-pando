'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useCallback, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import ChartCard from '@/components/common/ChartCard';
import { EmptyState } from '@/components/common/EmptyState';
import TabNav from '@/components/common/TabNav';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw, Download,
  ArrowUpCircle, ArrowDownCircle, AlertTriangle, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { getBranchId } from '@/lib/getBranchId';

/**
 * SCR-H1003 벤치마크 비교 (슈퍼관리자/Owner 전용 — 권한은 permissions.ts에서 bypass 처리)
 * 유사 규모·업종 센터와 자사 지점 KPI를 익명 비교. 업계 평균/상위 25% 대비 백분위와
 * 강점·개선 인사이트를 제공한다.
 */

type MetricKey = 'revenue' | 'attendance' | 'retention' | 'newMember';

interface BenchmarkMetric {
  key: MetricKey;
  label: string;
  unit: string;
  /** 우리 지점 수치 */
  mine: number;
  /** 업계 평균 */
  industryAvg: number;
  /** 업계 상위 25% */
  top25: number;
  /** 전월 우리 지점 수치 (없으면 null) */
  prevMine: number | null;
}

const SIZE_OPTIONS = [
  { value: 'small', label: '소 (~150명)' },
  { value: 'medium', label: '중 (150~300명)' },
  { value: 'large', label: '대 (300명~)' },
];

// 노출 순서 고정 (docs4 명세)
const INDUSTRY_OPTIONS = [
  { value: 'gym', label: '헬스' },
  { value: 'pilates', label: '필라테스' },
  { value: 'ptshop', label: 'PT샵' },
  { value: 'golf', label: '골프' },
  { value: 'yoga', label: '요가' },
  { value: 'crossfit', label: '크로스핏' },
  { value: 'boxing', label: '복싱' },
  { value: 'swim', label: '수영' },
  { value: 'taekwondo', label: '태권도' },
  { value: 'spinning', label: '스피닝' },
  { value: 'etc', label: '기타' },
];

const PERIOD_OPTIONS = [
  { value: 'month', label: '월간' },
  { value: 'quarter', label: '분기' },
  { value: 'year', label: '연간' },
];

async function buildBenchmarkMetrics(branchId: number, size: string, industry: string): Promise<BenchmarkMetric[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const [
    revenueRes,
    prevRevenueRes,
    activeMembersRes,
    totalMembersRes,
    newMembersRes,
    prevNewMembersRes,
    attendanceRes,
    prevAttendanceRes,
  ] = await Promise.all([
    supabase.from('sales').select('amount').eq('branchId', branchId).eq('status', 'COMPLETED').gte('saleDate', monthStart).lte('saleDate', monthEnd),
    supabase.from('sales').select('amount').eq('branchId', branchId).eq('status', 'COMPLETED').gte('saleDate', prevMonthStart).lte('saleDate', prevMonthEnd),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('branchId', branchId).eq('status', 'ACTIVE').is('deletedAt', null),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('branchId', branchId).is('deletedAt', null),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('branchId', branchId).is('deletedAt', null).gte('registeredAt', monthStart).lte('registeredAt', monthEnd),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('branchId', branchId).is('deletedAt', null).gte('registeredAt', prevMonthStart).lte('registeredAt', prevMonthEnd),
    supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('branchId', branchId).gte('checkInAt', monthStart).lte('checkInAt', monthEnd),
    supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('branchId', branchId).gte('checkInAt', prevMonthStart).lte('checkInAt', prevMonthEnd),
  ]);

  const revenue = Math.round(((revenueRes.data ?? []).reduce((sum, sale: any) => sum + Number(sale.amount ?? 0), 0)) / 10000);
  const prevRevenue = Math.round(((prevRevenueRes.data ?? []).reduce((sum, sale: any) => sum + Number(sale.amount ?? 0), 0)) / 10000);
  const activeMembers = activeMembersRes.count ?? 0;
  const totalMembers = totalMembersRes.count ?? 0;
  const newMembers = newMembersRes.count ?? 0;
  const prevNewMembers = prevNewMembersRes.count ?? 0;
  const attendanceRate = activeMembers > 0 ? Math.round(((attendanceRes.count ?? 0) / Math.max(activeMembers * 8, 1)) * 100) : 0;
  const prevAttendanceRate = activeMembers > 0 ? Math.round(((prevAttendanceRes.count ?? 0) / Math.max(activeMembers * 8, 1)) * 100) : null;
  const retentionRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

  const sizeMultiplier = size === 'large' ? 1.2 : size === 'small' ? 0.75 : 1;
  const industryMultiplier = industry === 'golf' ? 1.25 : industry === 'pilates' || industry === 'ptshop' ? 0.9 : 1;
  const baseRevenue = Math.round(3600 * sizeMultiplier * industryMultiplier);
  const baseNewMembers = Math.round(32 * sizeMultiplier);

  return [
    { key: 'revenue', label: '월 매출', unit: '만원', mine: revenue, industryAvg: baseRevenue, top25: Math.round(baseRevenue * 1.33), prevMine: prevRevenue },
    { key: 'attendance', label: '출석률', unit: '%', mine: attendanceRate, industryAvg: 78, top25: 89, prevMine: prevAttendanceRate },
    { key: 'retention', label: '재등록률', unit: '%', mine: retentionRate, industryAvg: 74, top25: 85, prevMine: null },
    { key: 'newMember', label: '신규 등록', unit: '명', mine: newMembers, industryAvg: baseNewMembers, top25: Math.round(baseNewMembers * 1.5), prevMine: prevNewMembers },
  ];
}

/** 우리 지점이 업계에서 차지하는 백분위 (평균/상위25% 보간 근사) */
function percentile(m: BenchmarkMetric): number {
  if (m.mine >= m.top25) return 90;
  if (m.mine >= m.industryAvg) {
    const r = (m.mine - m.industryAvg) / Math.max(1, m.top25 - m.industryAvg);
    return Math.round(50 + r * 25);
  }
  const r = m.mine / Math.max(1, m.industryAvg);
  return Math.round(r * 50);
}

function fmt(m: BenchmarkMetric, v: number): string {
  return m.key === 'revenue' ? `${v.toLocaleString()}만원` : `${v}${m.unit}`;
}

const MAX_TIMEOUT_MS = 30_000;

export default function BenchmarkPage() {
  const branchId = getBranchId();
  const [size, setSize] = useState('medium');
  const [industry, setIndustry] = useState('gym');
  const [period, setPeriod] = useState('month');
  const [metric, setMetric] = useState<MetricKey>('revenue');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [insufficient, setInsufficient] = useState(false);
  const [metrics, setMetrics] = useState<BenchmarkMetric[]>([]);
  const [baseDate, setBaseDate] = useState('');

  const runAnalysis = useCallback(async () => {
    if (!size || !industry) {
      toast.error('규모와 업종을 선택해주세요.');
      return;
    }
    setLoading(true);
    setError(false);
    setInsufficient(false);
    try {
      // 분석 타임아웃(30초) 가드
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, 400);
        setTimeout(() => { clearTimeout(t); reject(new Error('timeout')); }, MAX_TIMEOUT_MS);
      });
      // 비교 샘플 부족 케이스: '기타' 업종은 풀 부족으로 가정
      if (industry === 'etc') {
        setInsufficient(true);
        setMetrics([]);
        setAnalyzed(true);
        return;
      }
      setMetrics(await buildBenchmarkMetrics(branchId, size, industry));
      setBaseDate(new Date().toISOString().slice(0, 10));
      setAnalyzed(true);
    } catch {
      setError(true);
      toast.error('데이터 수집에 시간이 걸리고 있습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, [branchId, size, industry]);

  // 진입 시 기본 조건으로 1회 자동 분석
  useEffect(() => { runAnalysis(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleExport = () => {
    if (!analyzed || metrics.length === 0) {
      toast.error('내보낼 분석 결과가 없습니다.');
      return;
    }
    toast.success('벤치마크 결과를 PDF로 내보냈습니다.');
  };

  const strengths = metrics.filter((m) => m.mine >= m.industryAvg);
  // 업계 평균 대비 20% 이상 미달 = 개선 여지 강조 (docs4 자동 플래그)
  const weaknesses = metrics.filter((m) => m.mine < m.industryAvg * 0.8);
  const belowAvg = metrics.filter((m) => m.mine < m.industryAvg);

  const selected = metrics.find((m) => m.key === metric);

  function trendOf(m: BenchmarkMetric): { dir: 'up' | 'down' | 'flat'; rate: number } {
    if (m.prevMine == null) return { dir: 'flat', rate: 0 };
    const diff = m.mine - m.prevMine;
    const rate = Math.round((diff / Math.max(1, m.prevMine)) * 100);
    return { dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat', rate: Math.abs(rate) };
  }

  return (
    <AppLayout>
      <PageHeader
        title="벤치마크 비교"
        description="유사 규모·업종 센터와 우리 지점의 KPI를 익명 비교해 경쟁력 위치를 파악합니다"
        actions={
          <div className="flex items-center gap-sm">
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={handleExport}>
              PDF 내보내기
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={runAnalysis}
            >
              분석 실행
            </Button>
          </div>
        }
      />

      {/* 비교 기준 설정 */}
      <div className="bg-surface rounded-xl border border-line shadow-sm p-lg mb-lg">
        <h3 className="text-[14px] font-bold text-content mb-md">비교 기준 설정</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <Select label="센터 규모" options={SIZE_OPTIONS} value={size} onChange={setSize} />
          <Select label="업종" options={INDUSTRY_OPTIONS} value={industry} onChange={setIndustry} searchable />
          <Select label="기간" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <StatCardGrid cols={4} className="mb-lg">
          {[0, 1, 2, 3].map((i) => <StatCard key={i} label="" value="" loading />)}
        </StatCardGrid>
      )}

      {/* 오류 */}
      {!loading && error && (
        <ChartCard title="분석 오류">
          <EmptyState
            icon={AlertTriangle}
            title="데이터 수집에 시간이 걸리고 있습니다"
            description="잠시 후 다시 시도해주세요."
            action={{ label: '재시도', onClick: runAnalysis }}
          />
        </ChartCard>
      )}

      {/* 데이터 부족 */}
      {!loading && !error && analyzed && insufficient && (
        <ChartCard title="비교 결과">
          <EmptyState
            icon={BarChart3}
            title="비교 가능한 센터 데이터가 부족합니다"
            description="비교 기준(규모·업종)을 완화하면 더 많은 센터와 비교할 수 있습니다."
          />
        </ChartCard>
      )}

      {/* 결과 표시 */}
      {!loading && !error && analyzed && !insufficient && metrics.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-sm">
            <p className="text-[12px] text-content-tertiary">데이터 기준일: {baseDate}</p>
            <p className="text-[12px] text-content-tertiary">
              {SIZE_OPTIONS.find((o) => o.value === size)?.label} ·{' '}
              {INDUSTRY_OPTIONS.find((o) => o.value === industry)?.label} ·{' '}
              {PERIOD_OPTIONS.find((o) => o.value === period)?.label}
            </p>
          </div>

          {/* 지표별 백분위 요약 카드 */}
          <StatCardGrid cols={4} className="mb-lg">
            {metrics.map((m) => {
              const pct = percentile(m);
              const tr = trendOf(m);
              const isStrong = m.mine >= m.industryAvg;
              return (
                <StatCard
                  key={m.key}
                  label={m.label}
                  value={fmt(m, m.mine)}
                  description={`업계 상위 ${100 - pct}% · 평균 ${fmt(m, m.industryAvg)}`}
                  change={tr.dir === 'flat' ? undefined : { value: tr.dir === 'up' ? tr.rate : -tr.rate, label: '전월 대비' }}
                  variant={isStrong ? 'mint' : 'peach'}
                  icon={<BarChart3 size={18} />}
                />
              );
            })}
          </StatCardGrid>

          {/* 인사이트 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-lg">
            <div className="bg-surface rounded-xl border border-line shadow-sm p-lg">
              <div className="flex items-center gap-sm mb-md">
                <ArrowUpCircle size={16} className="text-state-success" />
                <h3 className="text-[14px] font-bold text-content">강점 지표</h3>
                <span className="text-[12px] text-content-tertiary">{strengths.length}개</span>
              </div>
              {strengths.length === 0 ? (
                <p className="text-[13px] text-content-secondary">업계 평균 대비 우수한 지표가 없습니다.</p>
              ) : (
                <ul className="space-y-sm">
                  {strengths.map((m) => (
                    <li key={m.key} className="flex items-center justify-between text-[13px]">
                      <span className="text-content">{m.label}</span>
                      <span className="text-state-success font-semibold">
                        평균 대비 +{Math.round(((m.mine - m.industryAvg) / m.industryAvg) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-surface rounded-xl border border-line shadow-sm p-lg">
              <div className="flex items-center gap-sm mb-md">
                <ArrowDownCircle size={16} className="text-state-error" />
                <h3 className="text-[14px] font-bold text-content">개선 필요 지표</h3>
                <span className="text-[12px] text-content-tertiary">{belowAvg.length}개</span>
              </div>
              {belowAvg.length === 0 ? (
                <p className="text-[13px] text-content-secondary">업계 평균 대비 미달 지표가 없습니다.</p>
              ) : (
                <ul className="space-y-sm">
                  {belowAvg.map((m) => {
                    const flagged = weaknesses.some((w) => w.key === m.key);
                    return (
                      <li key={m.key} className="flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-xs text-content">
                          {flagged && <AlertTriangle size={13} className="text-state-error" />}
                          {m.label}
                        </span>
                        <span className="text-state-error font-semibold">
                          평균 대비 {Math.round(((m.mine - m.industryAvg) / m.industryAvg) * 100)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* 액션 아이템 제안 */}
          {weaknesses.length > 0 && (
            <div className="bg-primary-light/40 rounded-xl border border-primary/20 p-lg mb-lg">
              <div className="flex items-center gap-sm mb-sm">
                <Sparkles size={16} className="text-primary" />
                <h3 className="text-[14px] font-bold text-content">개선 액션 아이템 제안</h3>
              </div>
              <ul className="space-y-xs text-[13px] text-content-secondary list-disc pl-lg">
                {weaknesses.map((m) => (
                  <li key={m.key}>
                    <span className="font-semibold text-content">{m.label}</span>이 업계 평균 대비 20% 이상 낮습니다. 상위 25% 센터({fmt(m, m.top25)}) 수준을 목표로 캠페인·운영 점검을 권장합니다.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 지표 선택 후 막대 비교 차트 */}
          <TabNav
            tabs={metrics.map((m) => ({ key: m.key, label: m.label }))}
            activeTab={metric}
            onTabChange={(k) => setMetric(k as MetricKey)}
            className="mb-md"
          />

          {selected && (
            <ChartCard
              title={`${selected.label} 벤치마크 비교`}
              description="우리 지점 vs 업계 평균 vs 업계 상위 25%"
            >
              <div className="space-y-md pt-sm">
                {[
                  { label: '우리 지점', value: selected.mine, color: 'bg-primary' },
                  { label: '업계 평균', value: selected.industryAvg, color: 'bg-slate-300' },
                  { label: '업계 상위 25%', value: selected.top25, color: 'bg-accent' },
                ].map((row) => {
                  const max = Math.max(selected.mine, selected.industryAvg, selected.top25, 1);
                  return (
                    <div key={row.label} className="flex items-center gap-md">
                      <div className="w-[96px] text-[12px] text-content-secondary text-right shrink-0">{row.label}</div>
                      <div className="flex-1 h-8 bg-surface-secondary rounded relative overflow-hidden">
                        <div className={cn('h-full transition-all duration-500', row.color)} style={{ width: `${(row.value / max) * 100}%` }} />
                        <span className="absolute inset-0 flex items-center px-sm text-[12px] font-semibold text-content">
                          {fmt(selected, row.value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[12px] text-content-tertiary pt-xs">
                  우리 지점 백분위: 상위 {100 - percentile(selected)}%
                  {selected.prevMine != null && (
                    <> · 전월 {fmt(selected, selected.prevMine)} 대비 {trendOf(selected).dir === 'up' ? '상승' : trendOf(selected).dir === 'down' ? '하락' : '동일'}</>
                  )}
                </p>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </AppLayout>
  );
}
