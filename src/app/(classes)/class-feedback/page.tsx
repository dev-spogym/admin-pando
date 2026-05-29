'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import { Star, MessageSquare, TrendingUp, ShieldAlert } from 'lucide-react';
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
import {
  MOCK_FEEDBACKS,
  MOCK_INSTRUCTORS,
  type ClassFeedback,
  type SessionType,
} from '@/mocks/class';

// ─── SCR-C013 수업 평가 피드백 (CLS-13) ───────────────────────────────────────
// docs4/V1+V2/D04-수업관리/수업관리.md ## SCR-C013
// 회원 후기 조회 + 강사별 평균 평점 랭킹. 강사/유형 필터, 평점 분포, 낮은 평점(3↓) 강조.
// 익명 후기 회원명 마스킹, 신고 자동 숨김 "검토 대기", 행 클릭 후기 전문(DLG). 4축 상태.

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

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-line'} />
      ))}
    </div>
  );
}

const maskName = (name: string) => (name.length <= 1 ? '*' : `${name[0]}${'*'.repeat(name.length - 1)}`);

export default function ClassFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<ClassFeedback[]>([]);
  const [instructorFilter, setInstructorFilter] = useState('ALL');
  const [sessionTab, setSessionTab] = useState<'ALL' | SessionType>('ALL');
  const [detail, setDetail] = useState<ClassFeedback | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setFeedbacks(MOCK_FEEDBACKS);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(
    () =>
      feedbacks.filter((f) => {
        const matchIns = instructorFilter === 'ALL' || f.instructor === instructorFilter;
        const matchSession = sessionTab === 'ALL' || f.sessionType === sessionTab;
        return matchIns && matchSession;
      }),
    [feedbacks, instructorFilter, sessionTab]
  );

  const stats = useMemo(() => {
    const visible = feedbacks.filter((f) => !f.hidden);
    const avg = visible.length ? visible.reduce((s, f) => s + f.rating, 0) / visible.length : 0;
    const fiveStar = visible.length ? Math.round((visible.filter((f) => f.rating === 5).length / visible.length) * 100) : 0;
    const lowCount = visible.filter((f) => f.rating <= 3).length;
    return { total: visible.length, avg, fiveStar, lowCount };
  }, [feedbacks]);

  // CLS-13-02 강사별 평균 평점 랭킹
  const instructorRanking = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    feedbacks.filter((f) => !f.hidden).forEach((f) => {
      const cur = map.get(f.instructor) ?? { sum: 0, count: 0 };
      map.set(f.instructor, { sum: cur.sum + f.rating, count: cur.count + 1 });
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, avg: v.sum / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg);
  }, [feedbacks]);

  return (
    <AppLayout>
      <PageHeader
        title="수업 평가 피드백"
        description="회원이 남긴 수업 후기와 강사별 평균 평점을 확인해 서비스 품질을 관리합니다."
      />

      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label="전체 평균 평점" value={stats.avg.toFixed(1)} icon={<Star />} variant="peach" loading={loading} />
        <StatCard label="피드백 수" value={`${stats.total}건`} icon={<MessageSquare />} loading={loading} />
        <StatCard label="5점 비율" value={`${stats.fiveStar}%`} icon={<TrendingUp />} variant="mint" loading={loading} />
        <StatCard label="낮은 평점(3↓)" value={`${stats.lowCount}건`} icon={<ShieldAlert />} loading={loading} className={stats.lowCount > 0 ? 'border-amber-200' : ''} />
      </StatCardGrid>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-[280px_1fr]">
        {/* CLS-13-02 강사별 평점 랭킹 */}
        <div className="rounded-xl border border-line bg-surface p-lg shadow-card">
          <h3 className="mb-md text-[14px] font-semibold text-content">강사별 평균 평점</h3>
          {loading ? (
            <div className="space-y-sm">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-tertiary" />
              ))}
            </div>
          ) : instructorRanking.length === 0 ? (
            <p className="py-lg text-center text-[12px] text-content-tertiary">집계할 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-sm">
              {instructorRanking.map((r, idx) => (
                <div key={r.name} className="flex items-center justify-between rounded-lg border border-line bg-surface-secondary/40 px-md py-sm">
                  <div className="flex items-center gap-xs">
                    <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold', idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-surface-tertiary text-content-secondary')}>
                      {idx + 1}
                    </span>
                    <span className="text-[13px] font-medium text-content">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-xs">
                    <span className="text-[13px] font-bold tabular-nums text-content">{r.avg.toFixed(1)}</span>
                    <span className="text-[11px] text-content-tertiary tabular-nums">({r.count})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 피드백 목록 */}
        <div className="rounded-xl border border-line bg-surface shadow-card overflow-hidden">
          <div className="flex flex-col gap-md border-b border-line p-lg lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-xs">
              {SESSION_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSessionTab(t.key)}
                  className={cn(
                    'rounded-button px-md py-xs text-[12px] font-semibold transition-colors',
                    sessionTab === t.key ? 'bg-primary text-white' : 'border border-line bg-surface text-content-secondary hover:bg-surface-secondary'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="w-full lg:w-[180px]">
              <Select
                value={instructorFilter}
                onChange={setInstructorFilter}
                options={[{ value: 'ALL', label: '전체 강사' }, ...MOCK_INSTRUCTORS.map((i) => ({ value: i.name, label: i.name }))]}
              />
            </div>
          </div>

          {/* 4축 상태 */}
          {loading ? (
            <div className="space-y-px">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-lg py-4">
                  <div className="mb-2 h-4 w-40 animate-pulse rounded bg-surface-tertiary" />
                  <div className="h-3 w-full animate-pulse rounded bg-surface-tertiary" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="피드백이 없어요"
              description="강사 또는 수업 유형 필터를 변경하거나, 수업 완료 후 회원 후기가 등록되면 표시됩니다."
            />
          ) : (
            <div className="divide-y divide-line/60">
              {filtered.map((f) => {
                const low = f.rating <= 3;
                return (
                  <button
                    key={f.id}
                    onClick={() => setDetail(f)}
                    className={cn('block w-full px-lg py-4 text-left transition-colors hover:bg-surface-secondary/60', low && 'bg-red-50/40')}
                  >
                    <div className="mb-1 flex items-start justify-between gap-md">
                      <div className="flex flex-wrap items-center gap-xs">
                        <span className="text-[13px] font-semibold text-content">{f.anonymous ? maskName(f.memberName) : f.memberName}</span>
                        {f.anonymous && <StatusBadge variant="secondary">익명</StatusBadge>}
                        <span className="text-[11px] text-content-tertiary">{f.className}</span>
                        <StatusBadge variant={SESSION_VARIANT[f.sessionType]}>{f.sessionType}</StatusBadge>
                        <span className="rounded-full bg-surface-tertiary px-2 py-[1px] text-[11px] text-content-secondary">{f.instructor}</span>
                        {f.hidden && <StatusBadge variant="warning">검토 대기</StatusBadge>}
                      </div>
                      <Stars rating={f.rating} />
                    </div>
                    <p className={cn('line-clamp-2 rounded-lg px-3 py-2 text-[13px]', low ? 'bg-red-50 text-state-error' : 'bg-surface-secondary/60 text-content-secondary')}>
                      {f.hidden ? '신고로 자동 숨김 처리된 후기입니다. (검토 대기)' : f.comment}
                    </p>
                    <p className="mt-1 text-[11px] text-content-tertiary tabular-nums">{f.classDate} 수업 · 등록 {f.createdAt}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CLS-13-04 피드백 상세 */}
      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title="피드백 상세"
        size="md"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setDetail(null)}>닫기</Button>
          </div>
        }
      >
        {detail && (
          <div className="space-y-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-content">{detail.anonymous ? maskName(detail.memberName) : detail.memberName}</p>
                <p className="mt-[2px] text-[12px] text-content-secondary">{detail.className} · {detail.instructor} · {detail.classDate}</p>
              </div>
              <Stars rating={detail.rating} size={18} />
            </div>
            <div className={cn('rounded-xl border p-md text-[13px] leading-relaxed', detail.rating <= 3 ? 'border-red-200 bg-red-50 text-state-error' : 'border-line bg-surface-secondary/50 text-content')}>
              {detail.hidden ? '신고로 자동 숨김 처리된 후기입니다. 매니저 검토 후 노출 여부를 결정하세요.' : detail.comment}
            </div>
            <p className="text-[11px] text-content-tertiary">등록 일시 {detail.createdAt}</p>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
