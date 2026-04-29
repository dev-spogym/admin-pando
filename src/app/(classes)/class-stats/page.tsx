'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import DataTable from "@/components/common/DataTable";
import { BarChart3, Users, CalendarCheck, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  LESSON_SESSION_TYPES,
  createLessonSessionCounts,
  deriveLessonSessionType,
  formatLessonSessionType,
} from '@/lib/lessonSessionTypes';

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

  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [monthlyBars, setMonthlyBars] = useState<MonthlyBar[]>([]);
  const [searchValue, setSearchValue] = useState('');

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

  // 검색 필터
  const filtered = useMemo(() => {
    const q = searchValue.toLowerCase();
    if (!q) return classStats;
    return classStats.filter((c) => c.title.toLowerCase().includes(q));
  }, [classStats, searchValue]);

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
  ];

  return (
    <AppLayout>
      <PageHeader
        title="그룹수업 현황"
        description="수업별 출석률과 월별 트렌드를 확인합니다."
        actions={
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
        emptyMessage="해당 기간에 수업 데이터가 없습니다."
        onSearch={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="수업명 검색..."
      />
    </AppLayout>
  );
}
