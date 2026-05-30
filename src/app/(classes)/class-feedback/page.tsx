'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import { Star, MessageSquare, TrendingUp, ShieldAlert, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge, { type BadgeVariant } from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { getBranchId } from '@/lib/getBranchId';
import { supabase } from '@/lib/supabase';

type SessionType = 'PT' | 'GX' | '골프' | '기타';
type PeriodFilter = 'WEEK' | 'MONTH' | 'CUSTOM';

interface ClassFeedback {
  id: number;
  memberName: string;
  anonymous: boolean;
  className: string;
  sessionType: SessionType;
  instructor: string | null;
  classDate: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  hidden: boolean;
}

const SESSION_TABS: { key: 'ALL' | SessionType; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'PT', label: 'PT' },
  { key: 'GX', label: 'GX' },
  { key: '골프', label: '골프' },
  { key: '기타', label: '기타' },
];

const SESSION_VARIANT: Record<string, BadgeVariant> = {
  PT: 'peach',
  GX: 'info',
  골프: 'mint',
  기타: 'default',
};

const PERIOD_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: 'WEEK', label: '주간' },
  { value: 'MONTH', label: '월간' },
  { value: 'CUSTOM', label: '사용자 지정' },
];

const pad = (value: number) => String(value).padStart(2, '0');
const fmtDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-[2px]">
      {[1, 2, 3, 4, 5].map((index) => (
        <Star key={index} size={size} className={index <= rating ? 'fill-amber-400 text-amber-400' : 'text-line'} />
      ))}
    </div>
  );
}

const maskName = (name: string) => (name.length <= 1 ? '*' : `${name[0]}${'*'.repeat(name.length - 1)}`);

const getPeriodRange = (period: PeriodFilter, customStart: string, customEnd: string) => {
  const today = new Date();
  if (period === 'CUSTOM') return { start: customStart, end: customEnd };
  const start = new Date(today);
  if (period === 'WEEK') start.setDate(today.getDate() - 6);
  if (period === 'MONTH') start.setDate(today.getDate() - 29);
  return { start: fmtDate(start), end: fmtDate(today) };
};

export default function ClassFeedbackPage() {
  const branchId = getBranchId();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<ClassFeedback[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('MONTH');
  const [customStart, setCustomStart] = useState(fmtDate(new Date(new Date().setDate(new Date().getDate() - 29))));
  const [customEnd, setCustomEnd] = useState(fmtDate(new Date()));
  const [instructorFilter, setInstructorFilter] = useState('ALL');
  const [sessionTab, setSessionTab] = useState<'ALL' | SessionType>('ALL');
  const [detail, setDetail] = useState<ClassFeedback | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadFeedbacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('class_feedbacks')
      .select('*')
      .eq('branchId', branchId)
      .order('createdAt', { ascending: false })
      .limit(1000);

    if (error) {
      console.error(error);
      setFeedbacks([]);
    } else {
      setFeedbacks((data ?? []) as ClassFeedback[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFeedbacks();
  }, [branchId]);

  const toggleHidden = async (feedback: ClassFeedback) => {
    setSavingId(feedback.id);
    const nextHidden = !feedback.hidden;
    const { error } = await supabase
      .from('class_feedbacks')
      .update({ hidden: nextHidden })
      .eq('id', feedback.id);
    setSavingId(null);

    if (error) {
      console.error(error);
      return;
    }

    setFeedbacks((current) =>
      current.map((item) => item.id === feedback.id ? { ...item, hidden: nextHidden } : item)
    );
    setDetail((current) => current && current.id === feedback.id ? { ...current, hidden: nextHidden } : current);
  };

  const range = useMemo(() => getPeriodRange(period, customStart, customEnd), [period, customStart, customEnd]);

  const periodFeedbacks = useMemo(() => {
    return feedbacks.filter((feedback) => {
      const key = (feedback.classDate ?? feedback.createdAt ?? '').slice(0, 10);
      if (!range.start || !range.end) return true;
      return key >= range.start && key <= range.end;
    });
  }, [feedbacks, range]);

  const instructors = useMemo(
    () => Array.from(new Set(periodFeedbacks.map((feedback) => feedback.instructor ?? '').filter(Boolean))).sort(),
    [periodFeedbacks]
  );

  const filtered = useMemo(
    () =>
      periodFeedbacks.filter((feedback) => {
        const matchInstructor = instructorFilter === 'ALL' || feedback.instructor === instructorFilter;
        const matchSession = sessionTab === 'ALL' || feedback.sessionType === sessionTab;
        return matchInstructor && matchSession;
      }),
    [periodFeedbacks, instructorFilter, sessionTab]
  );

  const stats = useMemo(() => {
    const visible = filtered.filter((feedback) => !feedback.hidden);
    const avg = visible.length ? visible.reduce((sum, feedback) => sum + feedback.rating, 0) / visible.length : 0;
    const fiveStar = visible.length ? Math.round((visible.filter((feedback) => feedback.rating === 5).length / visible.length) * 100) : 0;
    const lowCount = visible.filter((feedback) => feedback.rating <= 3).length;
    return { total: visible.length, avg, fiveStar, lowCount };
  }, [filtered]);

  const instructorRanking = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    filtered.filter((feedback) => !feedback.hidden).forEach((feedback) => {
      const instructor = feedback.instructor ?? '-';
      const current = map.get(instructor) ?? { sum: 0, count: 0 };
      map.set(instructor, { sum: current.sum + feedback.rating, count: current.count + 1 });
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, avg: value.sum / value.count, count: value.count }))
      .sort((a, b) => b.avg - a.avg);
  }, [filtered]);

  const ratingDistribution = useMemo(() => {
    const visible = filtered.filter((feedback) => !feedback.hidden);
    return [5, 4, 3, 2, 1].map((score) => {
      const count = visible.filter((feedback) => feedback.rating === score).length;
      return { score, count, ratio: visible.length ? Math.round((count / visible.length) * 100) : 0 };
    });
  }, [filtered]);

  return (
    <AppLayout>
      <PageHeader
        title="수업 평가 피드백"
        description="회원이 남긴 수업 후기와 강사별 평균 평점을 확인해 서비스 품질을 관리합니다."
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={loadFeedbacks} loading={loading}>
            새로고침
          </Button>
        }
      />

      <div className="mb-lg flex flex-col gap-md rounded-xl border border-line bg-surface p-md shadow-xs lg:flex-row lg:items-end">
        <div className="w-full lg:w-[180px]">
          <Select label="기간" value={period} onChange={(value) => setPeriod(value as PeriodFilter)} options={PERIOD_OPTIONS} />
        </div>
        {period === 'CUSTOM' && (
          <>
            <div>
              <label className="mb-xs block text-[12px] font-semibold text-content-secondary">시작일</label>
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="h-9 rounded-lg border border-line bg-surface px-3 text-[13px] text-content" />
            </div>
            <div>
              <label className="mb-xs block text-[12px] font-semibold text-content-secondary">종료일</label>
              <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="h-9 rounded-lg border border-line bg-surface px-3 text-[13px] text-content" />
            </div>
          </>
        )}
        <div className="w-full lg:w-[220px]">
          <Select
            label="강사"
            value={instructorFilter}
            onChange={setInstructorFilter}
            options={[{ value: 'ALL', label: '전체 강사' }, ...instructors.map((name) => ({ value: name, label: name }))]}
          />
        </div>
      </div>

      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label="전체 평균 평점" value={stats.avg.toFixed(1)} icon={<Star />} variant="peach" loading={loading} />
        <StatCard label="피드백 수" value={`${stats.total}건`} icon={<MessageSquare />} loading={loading} />
        <StatCard label="5점 비율" value={`${stats.fiveStar}%`} icon={<TrendingUp />} variant="mint" loading={loading} />
        <StatCard label="낮은 평점(3↓)" value={`${stats.lowCount}건`} icon={<ShieldAlert />} loading={loading} className={stats.lowCount > 0 ? 'border-amber-200' : ''} />
      </StatCardGrid>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-[280px_1fr]">
        <div className="space-y-lg">
          <div className="rounded-xl border border-line bg-surface p-lg shadow-card">
            <h3 className="mb-md text-[14px] font-semibold text-content">강사별 평균 평점</h3>
            {loading ? (
              <div className="space-y-sm">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded-lg bg-surface-tertiary" />
                ))}
              </div>
            ) : instructorRanking.length === 0 ? (
              <p className="py-lg text-center text-[12px] text-content-tertiary">집계할 데이터가 없습니다.</p>
            ) : (
              <div className="space-y-sm">
                {instructorRanking.map((row, index) => (
                  <div key={row.name} className="flex items-center justify-between rounded-lg border border-line bg-surface-secondary/40 px-md py-sm">
                    <div className="flex items-center gap-xs">
                      <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold', index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-surface-tertiary text-content-secondary')}>
                        {index + 1}
                      </span>
                      <span className="text-[13px] font-medium text-content">{row.name}</span>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="text-[13px] font-bold tabular-nums text-content">{row.avg.toFixed(1)}</span>
                      <span className="text-[11px] text-content-tertiary tabular-nums">({row.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line bg-surface p-lg shadow-card">
            <h3 className="mb-md text-[14px] font-semibold text-content">평점 분포</h3>
            <div className="space-y-sm">
              {ratingDistribution.map((row) => (
                <div key={row.score} className="grid grid-cols-[32px_1fr_40px] items-center gap-xs text-[12px]">
                  <span className="font-semibold text-content">{row.score}점</span>
                  <div className="h-2 rounded-full bg-surface-tertiary">
                    <div className="h-2 rounded-full bg-amber-400" style={{ width: `${row.ratio}%` }} />
                  </div>
                  <span className="text-right text-content-tertiary">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface shadow-card overflow-hidden">
          <div className="flex flex-col gap-md border-b border-line p-lg lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-xs">
              {SESSION_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSessionTab(tab.key)}
                  className={cn(
                    'rounded-button px-md py-xs text-[12px] font-semibold transition-colors',
                    sessionTab === tab.key ? 'bg-primary text-white' : 'border border-line bg-surface text-content-secondary hover:bg-surface-secondary'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-px">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="px-lg py-4">
                  <div className="mb-2 h-4 w-40 animate-pulse rounded bg-surface-tertiary" />
                  <div className="h-3 w-full animate-pulse rounded bg-surface-tertiary" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="피드백이 없어요"
              description="선택한 기간·강사·수업 유형에 등록된 피드백이 없습니다."
            />
          ) : (
            <div className="divide-y divide-line/60">
              {filtered.map((feedback) => {
                const low = feedback.rating <= 3;
                return (
                  <button
                    key={feedback.id}
                    onClick={() => setDetail(feedback)}
                    className={cn('block w-full px-lg py-4 text-left transition-colors hover:bg-surface-secondary/60', low && 'bg-red-50/40')}
                  >
                    <div className="mb-1 flex items-start justify-between gap-md">
                      <div className="flex flex-wrap items-center gap-xs">
                        <span className="text-[13px] font-semibold text-content">{feedback.anonymous ? maskName(feedback.memberName) : feedback.memberName}</span>
                        {feedback.anonymous && <StatusBadge variant="secondary">익명</StatusBadge>}
                        <span className="text-[11px] text-content-tertiary">{feedback.className}</span>
                        <StatusBadge variant={SESSION_VARIANT[feedback.sessionType]}>{feedback.sessionType}</StatusBadge>
                        <span className="rounded-full bg-surface-tertiary px-2 py-[1px] text-[11px] text-content-secondary">{feedback.instructor ?? '-'}</span>
                        {feedback.hidden && <StatusBadge variant="warning">검토 대기</StatusBadge>}
                      </div>
                      <Stars rating={feedback.rating} />
                    </div>
                    <p className={cn('line-clamp-2 rounded-lg px-3 py-2 text-[13px]', low ? 'bg-red-50 text-state-error' : 'bg-surface-secondary/60 text-content-secondary')}>
                      {feedback.hidden ? '신고로 자동 숨김 처리된 후기입니다. (검토 대기)' : feedback.comment}
                    </p>
                    <p className="mt-1 text-[11px] text-content-tertiary tabular-nums">{feedback.classDate ?? '-'} 수업 · 등록 {feedback.createdAt?.slice(0, 16).replace('T', ' ')}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title="피드백 상세"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            {detail && (
              <Button
                variant={detail.hidden ? 'primary' : 'outline'}
                size="sm"
                onClick={() => toggleHidden(detail)}
                loading={savingId === detail.id}
              >
                {detail.hidden ? '노출 승인' : '숨김 처리'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setDetail(null)}>닫기</Button>
          </div>
        }
      >
        {detail && (
          <div className="space-y-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-content">{detail.anonymous ? maskName(detail.memberName) : detail.memberName}</p>
                <p className="mt-[2px] text-[12px] text-content-secondary">{detail.className} · {detail.instructor ?? '-'} · {detail.classDate ?? '-'}</p>
              </div>
              <Stars rating={detail.rating} size={18} />
            </div>
            <div className={cn('rounded-xl border p-md text-[13px] leading-relaxed', detail.rating <= 3 ? 'border-red-200 bg-red-50 text-state-error' : 'border-line bg-surface-secondary/50 text-content')}>
              {detail.hidden ? '신고로 자동 숨김 처리된 후기입니다. 매니저 검토 후 노출 여부를 결정하세요.' : detail.comment}
            </div>
            <p className="text-[11px] text-content-tertiary">등록 일시 {detail.createdAt?.slice(0, 16).replace('T', ' ')}</p>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
