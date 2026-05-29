'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  PenLine,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge, { type BadgeVariant } from '@/components/common/StatusBadge';
import TabNav from '@/components/common/TabNav';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';
import {
  MOCK_VALID_LESSONS,
  CLASS_TODAY,
  type ValidLesson,
  type AttendanceStatus,
} from '@/mocks/class';

// ─── SCR-C011 유효 수업 목록 (CLS-11) ─────────────────────────────────────────
// docs4/V1+V2/D04-수업관리/수업관리.md ## SCR-C011
// 이용권 유효·예약 확정된 진행 가능 수업만 필터링 → 출석/결석/노쇼 처리, PT 서명 요청.
// 날짜 필터(오늘/이번 주/지정) · 출석 상태 탭 · 잔여 0/만료 출석 차단 · 미처리 강조 · 4축 상태.

const DATE_FILTERS = [
  { key: 'TODAY', label: '오늘' },
  { key: 'WEEK', label: '이번 주' },
] as const;
type DateFilterKey = (typeof DATE_FILTERS)[number]['key'];

const ATTENDANCE_TABS: { key: 'ALL' | AttendanceStatus; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: '미처리', label: '미처리' },
  { key: '출석', label: '출석' },
  { key: '결석', label: '결석' },
  { key: '노쇼', label: '노쇼' },
];

const ATTENDANCE_VARIANT: Record<AttendanceStatus, BadgeVariant> = {
  미처리: 'warning',
  출석: 'success',
  결석: 'default',
  노쇼: 'error',
};

const SESSION_VARIANT: Record<string, BadgeVariant> = {
  PT: 'peach',
  GX: 'info',
  골프: 'mint',
  기타: 'default',
};

// 이번 주(월~일) 범위 계산 (기준일 CLASS_TODAY)
const weekRange = (() => {
  const [y, m, d] = CLASS_TODAY.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const day = base.getDay(); // 0=일
  const diffToMon = (day + 6) % 7;
  const mon = new Date(base);
  mon.setDate(base.getDate() - diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return { start: fmt(mon), end: fmt(sun) };
})();

export default function ValidLessonsPage() {
  const authUser = useAuthStore((s) => s.user);
  const role = normalizeRole(authUser?.role ?? '');
  // CLS-11-04 서명 요청은 트레이너(fc) 이상 — FC 서명은 hidden 규칙이나 본 목업은 manager+/fc 노출
  const canSign = authUser?.isSuperAdmin || isRoleAtLeast(role, 'fc');

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<ValidLesson[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterKey>('TODAY');
  const [activeTab, setActiveTab] = useState<'ALL' | AttendanceStatus>('ALL');
  const [search, setSearch] = useState('');
  const [signTarget, setSignTarget] = useState<ValidLesson | null>(null);

  // 로딩 상태 (목업 지연)
  useEffect(() => {
    const t = setTimeout(() => {
      setLessons(MOCK_VALID_LESSONS);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // 날짜 필터 적용
  const dateFiltered = useMemo(() => {
    return lessons.filter((l) => {
      if (dateFilter === 'TODAY') return l.date === CLASS_TODAY;
      return l.date >= weekRange.start && l.date <= weekRange.end;
    });
  }, [lessons, dateFilter]);

  const stats = useMemo(() => {
    const total = dateFiltered.length;
    const done = dateFiltered.filter((l) => l.attendance !== '미처리').length;
    const unprocessed = total - done;
    const signPending = dateFiltered.filter((l) => l.signatureRequired && l.attendance === '출석' && !l.signatureReceived).length;
    return { total, done, unprocessed, signPending };
  }, [dateFiltered]);

  const tabsWithCount = useMemo(
    () =>
      ATTENDANCE_TABS.map((t) => ({
        ...t,
        count: t.key === 'ALL' ? dateFiltered.length : dateFiltered.filter((l) => l.attendance === t.key).length,
      })),
    [dateFiltered]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    return dateFiltered.filter((l) => {
      const matchTab = activeTab === 'ALL' || l.attendance === activeTab;
      const matchSearch = !q || l.memberName.includes(q) || l.className.includes(q) || l.instructor.includes(q);
      return matchTab && matchSearch;
    });
  }, [dateFiltered, activeTab, search]);

  // CLS-11-03 출석 처리: 잔여 0/만료 회원 출석 차단
  const setAttendance = (id: string, next: AttendanceStatus) => {
    const target = lessons.find((l) => l.id === id);
    if (!target) return;
    if (next === '출석' && target.remainingCount <= 0) {
      toast.error('유효한 잔여 횟수가 없어 출석 처리할 수 없습니다');
      return;
    }
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, attendance: next } : l)));
    toast.success('처리되었습니다.');
  };

  // CLS-11-04 서명 요청 (DLG-C006)
  const handleSign = () => {
    if (!signTarget) return;
    setLessons((prev) => prev.map((l) => (l.id === signTarget.id ? { ...l, signatureReceived: true } : l)));
    setSignTarget(null);
    toast.success('서명이 저장되었습니다.');
  };

  const allDone = dateFiltered.length > 0 && stats.unprocessed === 0;

  return (
    <AppLayout>
      <PageHeader
        title="유효 수업 목록"
        description="이용권이 유효하고 예약이 확정된 진행 가능 수업만 모아 출석 처리와 서명을 진행합니다."
        actions={
          <div className="flex items-center gap-xs">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setDateFilter(f.key)}
                className={cn(
                  'rounded-lg px-3 py-[7px] text-[13px] font-semibold transition-colors',
                  dateFilter === f.key
                    ? 'bg-primary text-white'
                    : 'border border-line bg-surface text-content-secondary hover:bg-surface-secondary'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      {/* 요약 카드 */}
      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label="유효 수업" value={`${stats.total}건`} icon={<CalendarCheck />} variant="peach" loading={loading} />
        <StatCard label="출석 미처리" value={`${stats.unprocessed}건`} icon={<Clock />} loading={loading} className={stats.unprocessed > 0 ? 'border-amber-200' : ''} />
        <StatCard label="처리 완료" value={`${stats.done}건`} icon={<CheckCircle2 />} variant="mint" loading={loading} />
        <StatCard label="서명 미수령" value={`${stats.signPending}건`} icon={<PenLine />} loading={loading} className={stats.signPending > 0 ? 'border-amber-200' : ''} />
      </StatCardGrid>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="flex flex-col gap-md border-b border-line p-lg lg:flex-row lg:items-center lg:justify-between">
          <TabNav tabs={tabsWithCount} activeTab={activeTab} onTabChange={(k) => setActiveTab(k as 'ALL' | AttendanceStatus)} />
          <div className="relative w-full lg:w-[240px]">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
            <input
              type="text"
              placeholder="회원·수업·강사 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-[6px] bg-surface-secondary border border-line rounded-lg text-[13px] text-content placeholder-content-tertiary focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* 전체 처리 완료 안내 */}
        {allDone && (
          <div className="flex items-center gap-xs border-b border-line bg-emerald-50 px-lg py-sm text-[12px] font-semibold text-state-success">
            <CheckCircle2 size={14} />
            해당 날짜의 모든 수업 출석 처리가 완료되었습니다.
          </div>
        )}

        {/* 4축 상태: 로딩 / 빈 / 정상 */}
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-md px-lg py-4">
                <div className="h-4 w-24 animate-pulse rounded bg-surface-tertiary" />
                <div className="h-4 w-32 animate-pulse rounded bg-surface-tertiary" />
                <div className="ml-auto h-7 w-40 animate-pulse rounded bg-surface-tertiary" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search ? Search : CalendarDays}
            title={search ? '검색 결과가 없어요' : '해당 날짜의 유효 수업이 없어요'}
            description={
              search
                ? '회원명·수업명·강사명을 다시 확인하거나 검색어를 비워보세요.'
                : dateFilter === 'TODAY'
                ? '이번 주 필터로 바꾸거나 다른 출석 상태 탭을 확인해 보세요.'
                : '다른 출석 상태 탭으로 변경해 보세요.'
            }
            action={search ? { label: '검색 초기화', onClick: () => setSearch('') } : undefined}
          />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-surface-secondary/85">
              <tr className="text-[11px] font-black uppercase tracking-[0.12em] text-content-secondary">
                <th className="px-3 py-3 text-left">수업 · 유형</th>
                <th className="px-3 py-3 text-left">일시 · 장소</th>
                <th className="px-3 py-3 text-left">회원</th>
                <th className="px-3 py-3 text-center">잔여</th>
                <th className="px-3 py-3 text-center">상태</th>
                <th className="px-3 py-3 text-center">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((l) => {
                const noPass = l.remainingCount <= 0;
                const unprocessed = l.attendance === '미처리';
                return (
                  <tr key={l.id} className={cn('transition-colors hover:bg-surface-secondary/70', unprocessed && 'bg-amber-50/40')}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-xs">
                        <span className="font-semibold text-content">{l.className}</span>
                        <StatusBadge variant={SESSION_VARIANT[l.sessionType]}>{l.sessionType}</StatusBadge>
                      </div>
                      <div className="mt-[2px] text-[11px] text-content-tertiary">{l.instructor}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-content tabular-nums">{l.date} {l.startTime}~{l.endTime}</div>
                      <div className="mt-[2px] text-[11px] text-content-tertiary">{l.room}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-content">{l.memberName}</div>
                      <div className="mt-[2px] text-[11px] text-content-tertiary tabular-nums">{l.memberPhone}</div>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      <span className={cn(noPass ? 'font-semibold text-state-error' : 'text-content')}>{l.remainingCount}회</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex flex-col items-center gap-[3px]">
                        <StatusBadge variant={ATTENDANCE_VARIANT[l.attendance]} dot>{l.attendance}</StatusBadge>
                        {l.signatureRequired && l.attendance === '출석' && !l.signatureReceived && (
                          <span className="rounded-full bg-amber-50 px-2 py-[1px] text-[10px] font-semibold text-amber-600 border border-amber-200">서명 미수령</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-xs">
                        <button
                          onClick={() => setAttendance(l.id, '출석')}
                          disabled={noPass}
                          className="rounded-md border border-line px-2 py-[3px] text-[11px] font-semibold text-content-secondary hover:bg-emerald-50 hover:text-state-success hover:border-emerald-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          title={noPass ? '잔여 횟수 없음' : '출석 처리'}
                        >
                          출석
                        </button>
                        <button
                          onClick={() => setAttendance(l.id, '결석')}
                          className="rounded-md border border-line px-2 py-[3px] text-[11px] font-semibold text-content-secondary hover:bg-surface-tertiary transition-colors"
                        >
                          결석
                        </button>
                        <button
                          onClick={() => setAttendance(l.id, '노쇼')}
                          className="rounded-md border border-line px-2 py-[3px] text-[11px] font-semibold text-content-secondary hover:bg-red-50 hover:text-state-error hover:border-red-200 transition-colors"
                        >
                          노쇼
                        </button>
                        {canSign && l.signatureRequired && l.attendance === '출석' && !l.signatureReceived && (
                          <Button variant="outline" size="sm" icon={<PenLine size={13} />} onClick={() => setSignTarget(l)}>
                            서명
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* DLG-C006 서명 요청 */}
      <Modal
        isOpen={signTarget !== null}
        onClose={() => setSignTarget(null)}
        title="서명 요청"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setSignTarget(null)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleSign}>서명 완료 처리</Button>
          </div>
        }
      >
        {signTarget && (
          <div className="space-y-md">
            <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
              <p className="text-[13px] font-bold text-content">{signTarget.memberName} · {signTarget.className}</p>
              <p className="mt-[2px] text-[12px] text-content-secondary">{signTarget.date} {signTarget.startTime}~{signTarget.endTime} · {signTarget.instructor}</p>
            </div>
            <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface text-[12px] text-content-tertiary">
              회원 서명 영역 (PT 수업 완료 확인)
            </div>
            <p className="flex items-center gap-xs text-[11px] text-content-tertiary">
              <AlertTriangle size={12} /> 서명 미수령 상태로 두면 노란 배지로 재요청 안내가 표시됩니다.
            </p>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
