'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { Plus, CheckCircle2, Circle, Clock, Sparkles, RefreshCw, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge from '@/components/common/StatusBadge';
import TabNav from '@/components/common/TabNav';
import { EmptyState } from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { CleaningScheduleModal } from '@/components/common/FacilityModals';
import {
  MOCK_CLEANING_TASKS,
  MOCK_CLEANING_SCHEDULES,
  MOCK_FACILITY_STAFF,
  type CleaningTask,
  type CleaningSchedule,
  type CleaningCycle,
} from '@/mocks/facility';

// SCR-058 청소 스케줄 (docs4/V2/D06-시설관리/시설관리.md ## SCR-058)
// 호스트 다이얼로그: DLG-058-001 청소 스케줄 등록

/** HH:mm 현재 시각 */
const nowHM = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function CleaningSchedulePage() {
  const [tab, setTab] = useState<'today' | 'schedule'>('today');
  const [tasks, setTasks] = useState<CleaningTask[]>(MOCK_CLEANING_TASKS);
  const [schedules, setSchedules] = useState<CleaningSchedule[]>(MOCK_CLEANING_SCHEDULES);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    const pending = total - done;
    const rate = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, pending, rate };
  }, [tasks]);

  const allDone = stats.total > 0 && stats.done === stats.total;

  // 담당자 미지정·미완료 우선 정렬
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const score = (t: CleaningTask) => (t.overdue ? 0 : !t.assignee ? 1 : t.done ? 3 : 2);
      return score(a) - score(b);
    });
  }, [tasks]);

  // ─── 완료 체크 토글 ───────────────────────────────────────────────────────
  const handleToggle = (task: CleaningTask) => {
    if (task.done) { toast.info('이미 완료 처리되었습니다.'); return; }
    setTasks((prev) => prev.map((t) =>
      t.id === task.id ? { ...t, done: true, doneTime: nowHM(), overdue: false } : t,
    ));
    toast.success('처리되었습니다.');
  };

  const handleRegister = (p: { area: string; cycle: CleaningCycle; assignee: string | null; scheduledTime: string; detail: string; startDate: string }) => {
    const id = Math.max(0, ...schedules.map((s) => s.id), ...tasks.map((t) => t.id)) + 1;
    setSchedules((prev) => [...prev, { id, ...p }]);
    // 일일 청소면 오늘 체크리스트에도 반영
    if (p.cycle === '일일') {
      setTasks((prev) => [...prev, {
        id: id + 100, area: p.area, cycle: p.cycle, assignee: p.assignee,
        scheduledTime: p.scheduledTime, done: false, doneTime: null, overdue: false,
      }]);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="청소 스케줄 (V2/후속)"
        description="구역별 청소 일정과 담당자, 오늘의 완료 현황을 검토합니다."
        actions={
          <div className="flex items-center gap-sm">
            <Button type="button" variant="outline" size="md" icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={() => { setLoading(true); setTimeout(() => { setTasks(MOCK_CLEANING_TASKS); setSchedules(MOCK_CLEANING_SCHEDULES); setLoading(false); }, 500); }}>
              새로고침
            </Button>
            <Button type="button" variant="primary" size="md" icon={<Plus size={14} />} onClick={() => setRegisterOpen(true)}>
              청소 스케줄 등록
            </Button>
          </div>
        }
      />

      <div className="mb-lg rounded-xl border border-red-200 bg-red-50 px-md py-sm text-[12px] font-semibold text-red-700">
        docs4 V2/후속 화면입니다. 반복 청소 스케줄 원장과 완료 이력 저장은 후속 확정 후 DB에 연결하며 현재 화면의 변경은 퍼블리싱 검토용 상태입니다.
      </div>

      {/* 오늘의 청소 현황 카드 */}
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="오늘 전체 구역" value={`${stats.total}곳`} icon={<Sparkles />} />
        <StatCard label="완료" value={`${stats.done}곳`} icon={<CheckCircle2 />} variant="mint" />
        <StatCard label="미완료" value={`${stats.pending}곳`} icon={<Clock />} variant={stats.pending > 0 ? 'peach' : undefined} />
        <StatCard label="완료율" value={`${stats.rate}%`} icon={<PartyPopper />} />
      </StatCardGrid>

      {allDone && (
        <div className="mb-lg flex items-center gap-sm rounded-2xl border border-state-success/30 bg-emerald-50 px-lg py-md text-[13px] font-semibold text-state-success">
          <PartyPopper size={16} /> 오늘 예정된 청소가 모두 완료되었습니다. 수고하셨습니다!
        </div>
      )}

      <TabNav
        className="mb-lg"
        tabs={[
          { key: 'today', label: '오늘의 청소', count: stats.total },
          { key: 'schedule', label: '정기 청소 일정', count: schedules.length },
        ]}
        activeTab={tab}
        onTabChange={(k) => setTab(k as 'today' | 'schedule')}
      />

      {loading ? (
        <div className="space-y-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-line bg-surface-secondary/60" />
          ))}
        </div>
      ) : tab === 'today' ? (
        tasks.length === 0 ? (
          <div className="rounded-3xl border border-line bg-white">
            <EmptyState icon={Sparkles} title="오늘 예정된 청소 일정이 없습니다"
              description="오늘 배정된 청소 구역이 없습니다. 정기 청소 일정을 등록하면 체크리스트에 자동 반영됩니다."
              action={{ label: '청소 스케줄 등록', onClick: () => setRegisterOpen(true) }} />
          </div>
        ) : (
          // 청소 구역 체크리스트
          <div className="overflow-hidden rounded-2xl border border-line bg-white divide-y divide-line/70">
            {sortedTasks.map((t) => (
              <div key={t.id} className={cn('flex items-center justify-between px-5 py-4',
                t.done ? 'bg-emerald-50/50' : t.overdue ? 'bg-red-50/40' : 'hover:bg-surface-secondary/40')}>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => handleToggle(t)} aria-label={`${t.area} 완료 체크`}
                    className={cn('transition-colors', t.done ? 'text-state-success' : 'text-content-tertiary hover:text-primary')}>
                    {t.done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </button>
                  <div>
                    <div className="flex items-center gap-sm">
                      <p className={cn('text-[14px] font-semibold', t.done ? 'text-content-secondary line-through' : 'text-content')}>{t.area}</p>
                      <StatusBadge variant="secondary">{t.cycle}</StatusBadge>
                      {!t.assignee && <StatusBadge variant="warning">담당자 미지정</StatusBadge>}
                      {t.overdue && !t.done && <StatusBadge variant="error" dot>시간 초과</StatusBadge>}
                    </div>
                    <p className="mt-0.5 text-[12px] text-content-secondary">예정 {t.scheduledTime} · 담당 {t.assignee ?? '미지정'}</p>
                  </div>
                </div>
                <div className="text-right">
                  {t.done ? (
                    <p className="text-[12px] font-medium text-state-success">완료 {t.doneTime}</p>
                  ) : t.overdue ? (
                    <p className="text-[12px] font-medium text-state-error">예정 시간 경과</p>
                  ) : (
                    <p className="text-[12px] text-content-tertiary">대기 중</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // 정기 청소 일정 목록
        schedules.length === 0 ? (
          <div className="rounded-3xl border border-line bg-white">
            <EmptyState icon={Sparkles} title="등록된 청소 일정이 없습니다"
              description="정기 청소 일정을 등록하면 주기마다 체크리스트가 자동 생성됩니다."
              action={{ label: '청소 스케줄 등록', onClick: () => setRegisterOpen(true) }} />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-secondary/60 text-content-secondary">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">구역명</th>
                  <th className="px-4 py-3 text-left font-semibold">청소 유형</th>
                  <th className="px-4 py-3 text-left font-semibold">주기</th>
                  <th className="px-4 py-3 text-left font-semibold">담당자</th>
                  <th className="px-4 py-3 text-left font-semibold">예정 시간</th>
                  <th className="px-4 py-3 text-left font-semibold">시작일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {schedules.map((s) => (
                  <tr key={s.id} className="text-content hover:bg-surface-secondary/40">
                    <td className="px-4 py-3 font-semibold">{s.area}</td>
                    <td className="px-4 py-3"><StatusBadge variant="secondary">{s.cycle}</StatusBadge></td>
                    <td className="px-4 py-3 text-content-secondary">{s.detail}</td>
                    <td className="px-4 py-3 text-content-secondary">
                      {s.assignee ?? <span className="text-amber-600">미지정</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-content-secondary">{s.scheduledTime}</td>
                    <td className="px-4 py-3 tabular-nums text-content-secondary">{s.startDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── 다이얼로그 (DLG-058-001) ── */}
      <CleaningScheduleModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        existingAreas={schedules.map((s) => s.area)}
        staff={MOCK_FACILITY_STAFF}
        onSubmit={handleRegister}
      />
    </AppLayout>
  );
}
