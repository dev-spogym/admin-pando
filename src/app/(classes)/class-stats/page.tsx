'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import DataTable from "@/components/common/DataTable";
import { BarChart3, Users, CalendarCheck, TrendingUp, Settings2, XCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  LESSON_SESSION_TYPES,
  createLessonSessionCounts,
  deriveLessonSessionType,
  formatLessonSessionType,
} from '@/lib/lessonSessionTypes';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';

// 기간 필터 옵션
const PERIOD_OPTIONS = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'quarter', label: '이번 분기' },
];

interface ClassStat {
  id: number;
  title: string;
  type: string | null;
  room: string | null;
  capacity: number;
  bookedCount: number;
  attendeeCount: number;
  bookingRate: number;
  attendRate: number;
}

interface MonthlyBar {
  label: string;  // YYYY-MM
  count: number;
}

/** 기간 계산 */
const getPeriodRange = (key: string): { start: string; end: string } => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (key === 'week') {
    const day = now.getDay(); // 0=일
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: fmt(mon), end: fmt(sun) };
  }
  if (key === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  }
  // quarter
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { start: fmt(start), end: fmt(end) };
};

export default function ClassStats() {
  const branchId = getBranchId();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;
  const role = normalizeRole(currentUser?.role ?? 'readonly');
  // 정원 조정·수업 취소 진입은 Owner(지점장)/매니저 이상만 (FC/스태프 hidden) — SCR-C005 권한표
  const canOperate = isSuperAdmin || isRoleAtLeast(role, 'manager');

  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [monthlyBars, setMonthlyBars] = useState<MonthlyBar[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [sortKey, setSortKey] = useState<'attendRate' | 'remaining' | 'bookedCount'>('attendRate');

  // 정원 조정 모달
  const [capacityTarget, setCapacityTarget] = useState<ClassStat | null>(null);
  const [capacityValue, setCapacityValue] = useState('');
  // 회원 명단 드로어
  const [rosterTarget, setRosterTarget] = useState<ClassStat | null>(null);

  // 데이터 조회
  const fetchStats = async () => {
    setLoading(true);
    const { start, end } = getPeriodRange(period);

    // 수업 목록 + 예약(출석) 수 조회
    const { data: classes } = await supabase
      .from('classes')
      .select('id, title, type, room, capacity, startTime')
      .eq('branchId', branchId)
      .gte('startTime', `${start}T00:00:00`)
      .lte('startTime', `${end}T23:59:59`)
      .order('startTime');

    if (!classes) { setLoading(false); return; }

    // 예약/출석 수 집계 (classes 테이블에 bookedCount 또는 lesson_bookings 조인)
    const ids = classes.map((c: any) => c.id);
    let attendMap: Record<number, number> = {};
    let bookedMap: Record<number, number> = {};

    if (ids.length > 0) {
      const { data: bookings } = await supabase
        .from('lesson_bookings')
        .select('scheduleId, status')
        .in('scheduleId', ids)
        .in('status', ['BOOKED', 'ATTENDED']);
      if (bookings) {
        for (const b of bookings as any[]) {
          bookedMap[b.scheduleId] = (bookedMap[b.scheduleId] ?? 0) + 1;
          if (b.status === 'ATTENDED') {
            attendMap[b.scheduleId] = (attendMap[b.scheduleId] ?? 0) + 1;
          }
        }
      }
    }

    // 수업별 통계
    const stats: ClassStat[] = classes.map((c: any) => {
      const bookedCount = bookedMap[c.id] ?? 0;
      const attendeeCount = attendMap[c.id] ?? 0;
      const cap = Number(c.capacity) || 1;
      return {
        id: c.id,
        title: c.title ?? '-',
        type: c.type ?? null,
        room: c.room,
        capacity: cap,
        bookedCount,
        attendeeCount,
        bookingRate: Math.round((bookedCount / cap) * 100),
        attendRate: bookedCount > 0 ? Math.round((attendeeCount / bookedCount) * 100) : 0,
      };
    });
    setClassStats(stats);

    // 월별 수업 수 (최근 6개월)
    const { data: monthly } = await supabase
      .from('classes')
      .select('startTime')
      .eq('branchId', branchId)
      .gte('startTime', (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 5);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;
      })());

    if (monthly) {
      const countMap: Record<string, number> = {};
      for (const row of monthly as any[]) {
        const key = (row.startTime as string).slice(0, 7); // YYYY-MM
        countMap[key] = (countMap[key] ?? 0) + 1;
      }
      const bars: MonthlyBar[] = Object.entries(countMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, count]) => ({ label, count }));
      setMonthlyBars(bars);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  // 요약 통계
  const summary = useMemo(() => {
    const total = classStats.length;
    const totalBooked = classStats.reduce((s, c) => s + c.bookedCount, 0);
    const totalAttendees = classStats.reduce((s, c) => s + c.attendeeCount, 0);
    const avgBookingRate =
      total === 0 ? 0 : Math.round(classStats.reduce((s, c) => s + c.bookingRate, 0) / total);
    const avgAttendRate =
      total === 0 ? 0 : Math.round(classStats.reduce((s, c) => s + c.attendRate, 0) / total);
    const top3 = [...classStats]
      .sort((a, b) => b.attendeeCount - a.attendeeCount)
      .slice(0, 3)
      .map((c) => c.title);
    const sessionCounts = createLessonSessionCounts();
    classStats.forEach((row) => {
      const sessionType = deriveLessonSessionType(row.type, row.title);
      if (sessionType !== '기타') sessionCounts[sessionType] += 1;
    });
    return { total, totalBooked, totalAttendees, avgBookingRate, avgAttendRate, top3, sessionCounts };
  }, [classStats]);

  // 검색 + 정렬 (CLS-05-05)
  const filtered = useMemo(() => {
    const q = searchValue.toLowerCase();
    const base = q ? classStats.filter((c) => c.title.toLowerCase().includes(q)) : [...classStats];
    base.sort((a, b) => {
      if (sortKey === 'remaining') {
        return (a.capacity - a.bookedCount) - (b.capacity - b.bookedCount);
      }
      if (sortKey === 'bookedCount') return b.bookedCount - a.bookedCount;
      return b.attendRate - a.attendRate;
    });
    return base;
  }, [classStats, searchValue, sortKey]);

  // ── 운영 액션 핸들러 (목업) ──────────────────────────────────
  const openCapacity = (row: ClassStat) => {
    setCapacityTarget(row);
    setCapacityValue(String(row.capacity));
  };

  const handleSaveCapacity = () => {
    if (!capacityTarget) return;
    const next = Number(capacityValue);
    if (!Number.isFinite(next) || next <= 0) {
      toast.error('정원은 1 이상이어야 합니다.');
      return;
    }
    // 정원 < 예약 인원 차단 (SCR-C005 예외처리)
    if (next < capacityTarget.bookedCount) {
      toast.error('예약 인원보다 정원이 작아요. 정원을 조정할 수 없어요.');
      return;
    }
    setClassStats((prev) =>
      prev.map((c) =>
        c.id === capacityTarget.id
          ? { ...c, capacity: next, bookingRate: Math.round((c.bookedCount / next) * 100) }
          : c
      )
    );
    toast.success(`'${capacityTarget.title}' 정원을 ${next}명으로 조정했습니다.`);
    setCapacityTarget(null);
  };

  const handleCancelClass = (row: ClassStat) => {
    if (!canOperate) return;
    // 취소 진입 — 실제 취소는 수업 캘린더/관리에서 수행하는 목업 안내
    toast.success(`'${row.title}' 폐강 검토를 시작합니다. 수업 관리에서 취소를 확정하세요.`);
  };

  // 회원 명단 mock (행 클릭 시) — 실제 예약자 수 기준으로 더미 명단 생성
  const rosterMembers = useMemo(() => {
    if (!rosterTarget) return [];
    const names = ['김민수', '이서연', '박지훈', '최유진', '정도윤', '강하늘', '윤서아', '임준호', '한지민', '오세훈'];
    return Array.from({ length: rosterTarget.bookedCount }).map((_, i) => ({
      name: names[i % names.length],
      attended: i < rosterTarget.attendeeCount,
    }));
  }, [rosterTarget]);

  // 바 차트 최대값
  const maxBar = useMemo(() => Math.max(...monthlyBars.map((b) => b.count), 1), [monthlyBars]);

  // 테이블 컬럼
  const columns = [
    { key: 'no', header: 'No', width: 50, render: (_: any, __: any, idx: number) => idx + 1 },
    { key: 'title', header: '수업명', render: (v: string) => <span className="font-medium text-content">{v}</span> },
    {
      key: 'sessionType',
      header: '강습유형',
      render: (_: unknown, row: ClassStat) => formatLessonSessionType(deriveLessonSessionType(row.type, row.title)),
    },
    { key: 'room', header: '장소', render: (v: string | null) => v ?? '-' },
    { key: 'capacity', header: '정원', align: 'center' as const, render: (v: number) => `${v}명` },
    { key: 'bookedCount', header: '예약자', align: 'center' as const, render: (v: number) => `${v}명` },
    {
      key: 'bookingRate',
      header: '예약률',
      align: 'center' as const,
      render: (v: number) => (
        <div className="flex items-center justify-center gap-2">
          <div className="w-16 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(v, 100)}%` }}
            />
          </div>
          <span className={v >= 80 ? 'text-state-success font-semibold' : v >= 50 ? 'text-amber-600' : 'text-content-secondary'}>
            {v}%
          </span>
        </div>
      ),
    },
    { key: 'attendeeCount', header: '출석자', align: 'center' as const, render: (v: number) => `${v}명` },
    {
      key: 'remaining', header: '잔여 자리', align: 'center' as const,
      render: (_: unknown, row: ClassStat) => {
        const remaining = Math.max(row.capacity - row.bookedCount, 0);
        const ratio = row.capacity > 0 ? remaining / row.capacity : 0;
        const barColor = remaining === 0 ? 'bg-red-500' : ratio <= 0.2 ? 'bg-amber-500' : 'bg-green-500';
        return (
          <div className="flex items-center justify-center gap-2">
            <div className="w-16 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${(1 - ratio) * 100}%` }} />
            </div>
            {remaining === 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">마감</span>
            ) : (
              <span className={`text-[12px] tabular-nums ${ratio <= 0.2 ? 'text-amber-600 font-semibold' : 'text-content-secondary'}`}>{remaining}석</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'attendRate',
      header: '출석률',
      align: 'center' as const,
      render: (v: number) => (
        <div className="flex items-center justify-center gap-2">
          <div className="w-16 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${v >= 80 ? 'bg-green-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(v, 100)}%` }}
            />
          </div>
          <span className={v >= 80 ? 'text-state-success font-semibold' : v >= 50 ? 'text-amber-600' : 'text-content-secondary'}>
            {v}%
          </span>
        </div>
      ),
    },
    ...(canOperate
      ? [{
          key: 'ops', header: '운영', align: 'center' as const,
          render: (_: unknown, row: ClassStat) => (
            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                className="p-1.5 rounded-md text-content-secondary hover:text-primary hover:bg-primary-light transition-colors"
                onClick={() => openCapacity(row)}
                title="정원 조정"
              >
                <Settings2 size={14} />
              </button>
              <button
                className="p-1.5 rounded-md text-content-secondary hover:text-state-error hover:bg-red-50 transition-colors"
                onClick={() => handleCancelClass(row)}
                title="수업 취소 진입"
              >
                <XCircle size={14} />
              </button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <AppLayout>
      <PageHeader
        title="그룹수업 현황"
        description="수업별 출석률과 월별 트렌드를 확인합니다."
        actions={
          <div className="flex items-center gap-sm">
            <div className="flex gap-1 bg-surface-secondary rounded-lg p-0.5">
              {([
                { key: 'attendRate', label: '출석률순' },
                { key: 'remaining', label: '잔여석 적은순' },
                { key: 'bookedCount', label: '예약 많은순' },
              ] as { key: typeof sortKey; label: string }[]).map((o) => (
                <button
                  key={o.key}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    sortKey === o.key ? 'bg-surface text-content shadow-sm' : 'text-content-secondary hover:text-content'
                  }`}
                  onClick={() => setSortKey(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-surface-secondary rounded-lg p-0.5">
              {PERIOD_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    period === o.key
                      ? 'bg-surface text-content shadow-sm'
                      : 'text-content-secondary hover:text-content'
                  }`}
                  onClick={() => setPeriod(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* 통계 카드 */}
      <StatCardGrid cols={5} className="mb-lg">
        <StatCard label="총 수업 수" value={summary.total} icon={<CalendarCheck />} />
        <StatCard label="총 예약자" value={`${summary.totalBooked}명`} icon={<Users />} variant="mint" />
        <StatCard label="총 출석자" value={`${summary.totalAttendees}명`} icon={<Users />} />
        <StatCard label="평균 예약률" value={`${summary.avgBookingRate}%`} icon={<TrendingUp />} variant="peach" />
        <StatCard label="평균 출석률" value={`${summary.avgAttendRate}%`} icon={<BarChart3 />} />
      </StatCardGrid>
      <StatCardGrid cols={4} className="mb-lg">
        {LESSON_SESSION_TYPES.map((sessionType) => (
          <StatCard
            key={sessionType}
            label={`${formatLessonSessionType(sessionType)} 세션`}
            value={summary.sessionCounts[sessionType]}
            icon={<CalendarCheck />}
          />
        ))}
      </StatCardGrid>

      {/* 월별 트렌드 바 차트 */}
      {monthlyBars.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-lg mb-lg">
          <h3 className="text-[14px] font-semibold text-content mb-md">월별 수업 현황</h3>
          <div className="flex items-end gap-3 h-32">
            {monthlyBars.map((bar) => (
              <div key={bar.label} className="flex flex-col items-center gap-xs flex-1">
                <span className="text-[11px] text-content-secondary">{bar.count}</span>
                <div
                  className="w-full bg-primary/80 rounded-t-sm transition-all"
                  style={{ height: `${Math.max((bar.count / maxBar) * 96, 4)}px` }}
                />
                <span className="text-[10px] text-content-tertiary">{bar.label.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 수업별 출석률 테이블 */}
      <DataTable
        title="수업별 출석 현황"
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="해당 기간에 그룹 수업이 없어요."
        onSearch={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="수업명 검색..."
        onRowClick={(row) => setRosterTarget(row)}
      />

      {/* 정원 조정 모달 (Owner/매니저 — SCR-C005) */}
      <Modal
        isOpen={!!capacityTarget}
        onClose={() => setCapacityTarget(null)}
        title="정원 조정"
        size="sm"
        footer={
          <div className="flex justify-end gap-sm">
            <button
              className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
              onClick={() => setCapacityTarget(null)}
            >취소</button>
            <button
              className="px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors"
              onClick={handleSaveCapacity}
            >저장</button>
          </div>
        }
      >
        {capacityTarget && (
          <div className="space-y-md">
            <p className="text-[13px] text-content">
              <span className="font-semibold">{capacityTarget.title}</span> 수업의 정원을 조정합니다.
            </p>
            <p className="text-[12px] text-content-secondary">
              현재 예약 {capacityTarget.bookedCount}명 · 기존 정원 {capacityTarget.capacity}명
            </p>
            <div>
              <label className="block text-[12px] font-semibold text-content-secondary mb-xs">새 정원 (명)</label>
              <input
                type="number"
                min={1}
                value={capacityValue}
                onChange={(e) => setCapacityValue(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-line text-[13px] focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 예약 회원 명단 드로어 (CLS-05-06) */}
      {rosterTarget && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setRosterTarget(null)}>
          <div className="w-full max-w-sm h-full bg-surface shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-lg py-md border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-content">예약 회원 명단</h3>
                <p className="text-[12px] text-content-secondary mt-0.5">{rosterTarget.title} · {rosterTarget.bookedCount}/{rosterTarget.capacity}명</p>
              </div>
              <button onClick={() => setRosterTarget(null)} className="p-1.5 rounded-md hover:bg-surface-secondary text-content-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-md">
              {rosterMembers.length === 0 ? (
                <p className="text-[13px] text-content-tertiary text-center py-lg">예약자가 없습니다.</p>
              ) : (
                <ul className="space-y-xs">
                  {rosterMembers.map((m, i) => (
                    <li key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-secondary">
                      <span className="text-[13px] text-content">{m.name}</span>
                      <span className={`text-[11px] font-semibold ${m.attended ? 'text-state-success' : 'text-content-tertiary'}`}>
                        {m.attended ? '출석' : '예약'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
