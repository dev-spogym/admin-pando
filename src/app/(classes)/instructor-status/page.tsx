'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import Modal from "@/components/ui/Modal";
import { Users, Clock, CalendarCheck, BookOpen, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AsyncBoundary from '@/components/common/AsyncBoundary';
import {
  LESSON_SESSION_TYPES,
  createLessonSessionCounts,
  deriveLessonSessionType,
  formatLessonSessionType,
  type LessonSessionCounts,
} from '@/lib/lessonSessionTypes';

// 기간 필터
const PERIOD_OPTIONS = [
  { key: 'month', label: '이번 달' },
  { key: 'lastMonth', label: '지난달' },
  { key: 'custom', label: '커스텀' },
];

interface InstructorStat {
  id: number;
  name: string;
  role: string;
  classCount: number;
  totalMinutes: number;
  memberCount: number;
  bookingCount: number;
  attendedCount: number;
  noShowCount: number;
  attendanceRate: number;
  noShowRate: number;
  salesAmount: number;
  newRevenue: number;
  renewalRevenue: number;
  otAssigned: number;
  otFirstDone: number;
  otFirstPlanned: number;
  otSecondDone: number;
  otSecondPlanned: number;
  sessionCounts: LessonSessionCounts;
}

interface ClassDetail {
  id: number;
  title: string;
  type: string | null;
  startTime: string;
  endTime: string;
  room: string | null;
  capacity: number;
}

const ROLE_LABEL: Record<string, string> = {
  primary: '대표',
  owner: '원장',
  manager: '매니저',
  fc: '트레이너',
  staff: '직원',
};

const textOf = (...values: unknown[]) =>
  values
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map(value => String(value).trim().toLowerCase())
    .filter(Boolean)
    .join(' ');

/** 기간 계산 */
const getPeriodRange = (key: string, customStart: string, customEnd: string) => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (key === 'custom') return { start: customStart, end: customEnd };
  if (key === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: fmt(start), end: fmt(end) };
  }
  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: fmt(start), end: fmt(end) };
};

export default function InstructorStatus() {
  const branchId = getBranchId();

  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [instructors, setInstructors] = useState<InstructorStat[]>([]);

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<InstructorStat | null>(null);
  const [detailClasses, setDetailClasses] = useState<ClassDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // 데이터 조회
  const fetchData = async () => {
    setLoading(true);
    const { start, end } = getPeriodRange(period, customStart, customEnd);

    // 강사 목록 조회
    const { data: staff } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('branchId', branchId)
      .in('role', ['ADMIN', 'MANAGER', 'STAFF']);

    if (!staff) { setLoading(false); return; }

    // 기간 내 수업 조회
    const { data: classes } = await supabase
      .from('classes')
      .select('id, title, type, staffId, startTime, endTime, capacity')
      .eq('branchId', branchId)
      .gte('startTime', `${start}T00:00:00`)
      .lte('startTime', `${end}T23:59:59`);

    // 예약 수 집계 (강사별 담당 회원 수)
    const classIds = (classes ?? []).map((c: any) => c.id);
    let memberCountMap: Record<number, Set<number>> = {};
    const bookingStatsMap: Record<number, { bookingCount: number; attendedCount: number; noShowCount: number }> = {};

    if (classIds.length > 0) {
      const { data: bookings } = await supabase
        .from('lesson_bookings')
        .select('scheduleId, memberId, status')
        .in('scheduleId', classIds)
        .neq('status', 'CANCELLED');

      if (bookings) {
        // 수업별 staffId 매핑
        const classStaffMap: Record<number, number | null> = {};
        for (const c of (classes ?? []) as any[]) {
          classStaffMap[c.id] = c.staffId;
        }
        for (const b of bookings as any[]) {
          const instrId = classStaffMap[b.scheduleId];
          if (!instrId) continue;
          if (!memberCountMap[instrId]) memberCountMap[instrId] = new Set();
          memberCountMap[instrId].add(b.memberId);

          const prev = bookingStatsMap[instrId] ?? { bookingCount: 0, attendedCount: 0, noShowCount: 0 };
          prev.bookingCount += 1;
          if (b.status === 'ATTENDED') prev.attendedCount += 1;
          if (b.status === 'NOSHOW' || b.status === 'NO_SHOW') prev.noShowCount += 1;
          bookingStatsMap[instrId] = prev;
        }
      }
    }

    // 강사별 수업 수 + 근무시간 집계
    const classCountMap: Record<number, { count: number; minutes: number; sessionCounts: LessonSessionCounts }> = {};
    for (const c of (classes ?? []) as any[]) {
      if (!c.staffId) continue;
      const prev = classCountMap[c.staffId] ?? { count: 0, minutes: 0, sessionCounts: createLessonSessionCounts() };
      const start_ = new Date(c.startTime);
      const end_ = new Date(c.endTime);
      const min = Math.round((end_.getTime() - start_.getTime()) / 60000);
      const sessionType = deriveLessonSessionType(c.type, c.title);
      if (sessionType !== '기타') prev.sessionCounts[sessionType] += 1;
      classCountMap[c.staffId] = { count: prev.count + 1, minutes: prev.minutes + (min > 0 ? min : 0), sessionCounts: prev.sessionCounts };
    }

    // 강사별 매출 기여 집계
    const salesAmountMap: Record<string, number> = {};
    const newRevenueMap: Record<string, number> = {};
    const renewalRevenueMap: Record<string, number> = {};
    const { data: salesData } = await supabase
      .from('sales')
      .select('staffName, amount, round, type')
      .eq('branchId', branchId)
      .gte('saleDate', start)
      .lte('saleDate', end);
    if (salesData) {
      for (const sale of salesData as any[]) {
        if (!sale.staffName) continue;
        const amount = Number(sale.amount) || 0;
        salesAmountMap[sale.staffName] = (salesAmountMap[sale.staffName] ?? 0) + amount;
        if (sale.round === '신규') newRevenueMap[sale.staffName] = (newRevenueMap[sale.staffName] ?? 0) + amount;
        if (sale.round === '재등록') renewalRevenueMap[sale.staffName] = (renewalRevenueMap[sale.staffName] ?? 0) + amount;
      }
    }

    // 트레이너별 OT 1/2차 완료·예정 집계
    const otMap: Record<string, { assigned: number; firstDone: number; firstPlanned: number; secondDone: number; secondPlanned: number }> = {};
    const { data: otData, error: otError } = await supabase
      .from('consultations')
      .select('staffName, type, status, result')
      .eq('branchId', branchId)
      .gte('scheduledAt', `${start}T00:00:00`)
      .lte('scheduledAt', `${end}T23:59:59`);

    if (!otError && otData) {
      for (const row of otData as any[]) {
        const typeText = textOf(row.type);
        if (!typeText.includes('ot') && !typeText.includes('오티')) continue;
        const staffName = row.staffName || '미지정';
        const prev = otMap[staffName] ?? { assigned: 0, firstDone: 0, firstPlanned: 0, secondDone: 0, secondPlanned: 0 };
        const fullText = textOf(row.type, row.status, row.result);
        const isSecond = fullText.includes('2차') || fullText.includes('second');
        const isDone = fullText.includes('완료') || fullText.includes('completed') || fullText.includes('등록');
        const isPlanned = fullText.includes('예정') || fullText.includes('예약') || fullText.includes('scheduled');
        prev.assigned += 1;
        if (isSecond) {
          if (isDone) prev.secondDone += 1;
          else if (isPlanned || !isDone) prev.secondPlanned += 1;
        } else {
          if (isDone) prev.firstDone += 1;
          else if (isPlanned || !isDone) prev.firstPlanned += 1;
        }
        otMap[staffName] = prev;
      }
    }

    const stats: InstructorStat[] = (staff as any[]).map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      classCount: classCountMap[s.id]?.count ?? 0,
      totalMinutes: classCountMap[s.id]?.minutes ?? 0,
      memberCount: memberCountMap[s.id]?.size ?? 0,
      bookingCount: bookingStatsMap[s.id]?.bookingCount ?? 0,
      attendedCount: bookingStatsMap[s.id]?.attendedCount ?? 0,
      noShowCount: bookingStatsMap[s.id]?.noShowCount ?? 0,
      attendanceRate: bookingStatsMap[s.id]?.bookingCount
        ? Math.round(((bookingStatsMap[s.id]?.attendedCount ?? 0) / bookingStatsMap[s.id].bookingCount) * 100)
        : 0,
      noShowRate: bookingStatsMap[s.id]?.bookingCount
        ? Math.round(((bookingStatsMap[s.id]?.noShowCount ?? 0) / bookingStatsMap[s.id].bookingCount) * 100)
        : 0,
      salesAmount: salesAmountMap[s.name] ?? 0,
      newRevenue: newRevenueMap[s.name] ?? 0,
      renewalRevenue: renewalRevenueMap[s.name] ?? 0,
      otAssigned: otMap[s.name]?.assigned ?? 0,
      otFirstDone: otMap[s.name]?.firstDone ?? 0,
      otFirstPlanned: otMap[s.name]?.firstPlanned ?? 0,
      otSecondDone: otMap[s.name]?.secondDone ?? 0,
      otSecondPlanned: otMap[s.name]?.secondPlanned ?? 0,
      sessionCounts: classCountMap[s.id]?.sessionCounts ?? createLessonSessionCounts(),
    }));

    setInstructors(stats);
    setLoading(false);
  };

  useEffect(() => {
    if (period !== 'custom') fetchData();
  }, [period]);

  // 커스텀 기간 적용
  const handleCustomApply = () => {
    if (!customStart || !customEnd) return;
    fetchData();
  };

  // 강사 상세 클릭
  const handleDetail = async (instr: InstructorStat) => {
    setDetailTarget(instr);
    setDetailOpen(true);
    setDetailLoading(true);
    const { start, end } = getPeriodRange(period, customStart, customEnd);
    const { data } = await supabase
      .from('classes')
      .select('id, title, type, startTime, endTime, room, capacity')
      .eq('branchId', branchId)
      .eq('staffId', instr.id)
      .gte('startTime', `${start}T00:00:00`)
      .lte('startTime', `${end}T23:59:59`)
      .order('startTime');
    setDetailClasses((data ?? []) as ClassDetail[]);
    setDetailLoading(false);
  };

  // 전체 통계
  const summary = useMemo(() => {
    const totalInstructors = instructors.length;
    const totalClasses = instructors.reduce((s, i) => s + i.classCount, 0);
    const totalHours = Math.round(instructors.reduce((s, i) => s + i.totalMinutes, 0) / 60);
    const totalBookings = instructors.reduce((s, i) => s + i.bookingCount, 0);
    const totalAttended = instructors.reduce((s, i) => s + i.attendedCount, 0);
    const totalNoShow = instructors.reduce((s, i) => s + i.noShowCount, 0);
    const avgAttendanceRate = totalBookings > 0 ? Math.round((totalAttended / totalBookings) * 100) : 0;
    const avgNoShowRate = totalBookings > 0 ? Math.round((totalNoShow / totalBookings) * 100) : 0;
    return { totalInstructors, totalClasses, totalHours, avgAttendanceRate, avgNoShowRate };
  }, [instructors]);

  return (
    <AppLayout>
      <PageHeader
        title="강사 근무 현황"
        description="강사별 담당 수업 수, 근무시간, 담당 회원 현황을 확인합니다."
        actions={
          <div className="flex items-center gap-2">
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
            {period === 'custom' && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  className="px-2 py-1.5 border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <span className="text-content-secondary text-[12px]">~</span>
                <input
                  type="date"
                  className="px-2 py-1.5 border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
                <button
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-[12px] font-medium hover:bg-primary/90 transition-colors"
                  onClick={handleCustomApply}
                >
                  조회
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* 요약 통계 카드 */}
      <StatCardGrid cols={5} className="mb-lg">
        <StatCard label="총 강사 수" value={`${summary.totalInstructors}명`} icon={<Users />} />
        <StatCard label="총 수업 수" value={`${summary.totalClasses}회`} icon={<CalendarCheck />} variant="mint" />
        <StatCard label="총 근무시간" value={`${summary.totalHours}h`} icon={<Clock />} variant="peach" />
        <StatCard label="평균 출석률" value={`${summary.avgAttendanceRate}%`} icon={<Activity />} description="예약 대비 참석" />
        <StatCard label="평균 노쇼율" value={`${summary.avgNoShowRate}%`} icon={<AlertTriangle />} description="예약 대비 미참석" variant="peach" />
      </StatCardGrid>

      {/* 강사 카드 그리드 */}
      <AsyncBoundary isLoading={loading} isEmpty={instructors.length === 0} emptyMessage="강사 데이터가 없습니다.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
          {instructors.map((instr) => (
            <button
              key={instr.id}
              className="bg-surface border border-line rounded-xl p-md text-left hover:border-primary hover:shadow-sm transition-all group"
              onClick={() => handleDetail(instr)}
            >
              {/* 강사 헤더 */}
              <div className="flex items-center gap-sm mb-md">
                <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                  <Users className="text-primary" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-content truncate group-hover:text-primary transition-colors">
                    {instr.name}
                  </p>
                  <p className="text-[11px] text-content-tertiary">{ROLE_LABEL[instr.role] ?? instr.role}</p>
                </div>
              </div>

              {/* 수치 */}
              <div className="grid grid-cols-3 gap-xs">
                <div className="flex flex-col items-center p-xs bg-surface-secondary rounded-lg">
                  <span className="text-[16px] font-bold text-content">{instr.classCount}</span>
                  <span className="text-[10px] text-content-tertiary mt-0.5">수업 수</span>
                </div>
                <div className="flex flex-col items-center p-xs bg-surface-secondary rounded-lg">
                  <span className="text-[16px] font-bold text-content">
                    {Math.round(instr.totalMinutes / 60)}h
                  </span>
                  <span className="text-[10px] text-content-tertiary mt-0.5">근무시간</span>
                </div>
                <div className="flex flex-col items-center p-xs bg-surface-secondary rounded-lg">
                  <span className="text-[16px] font-bold text-content">{instr.memberCount}</span>
                  <span className="text-[10px] text-content-tertiary mt-0.5">회원 수</span>
                </div>
              </div>

              <div className="mt-sm grid grid-cols-2 gap-xs">
                <div className="rounded-lg border border-line bg-surface px-sm py-xs">
                  <p className="text-[10px] text-content-tertiary">출석률</p>
                  <p className="text-[13px] font-semibold text-content">{instr.attendanceRate}%</p>
                  <p className="text-[10px] text-content-tertiary">{instr.attendedCount}/{instr.bookingCount}건</p>
                </div>
                <div className="rounded-lg border border-line bg-surface px-sm py-xs">
                  <p className="text-[10px] text-content-tertiary">노쇼율</p>
                  <p className="text-[13px] font-semibold text-content">{instr.noShowRate}%</p>
                  <p className="text-[10px] text-content-tertiary">{instr.noShowCount}/{instr.bookingCount}건</p>
                </div>
              </div>

              <div className="mt-sm rounded-lg border border-line bg-surface px-sm py-xs">
                <p className="text-[10px] text-content-tertiary">매출 기여</p>
                <p className="text-[13px] font-semibold text-content">
                  ₩{(instr.salesAmount / 10000).toFixed(1)}만
                </p>
              </div>

              <div className="mt-sm grid grid-cols-2 gap-xs">
                <div className="rounded-lg border border-line bg-surface px-sm py-xs">
                  <p className="text-[10px] text-content-tertiary">신규 매출</p>
                  <p className="text-[13px] font-semibold text-content">₩{(instr.newRevenue / 10000).toFixed(1)}만</p>
                </div>
                <div className="rounded-lg border border-line bg-surface px-sm py-xs">
                  <p className="text-[10px] text-content-tertiary">재등록 매출</p>
                  <p className="text-[13px] font-semibold text-content">₩{(instr.renewalRevenue / 10000).toFixed(1)}만</p>
                </div>
              </div>

              <div className="mt-sm rounded-lg border border-[#b8d6ff] bg-[#f8fbff] px-sm py-xs">
                <div className="mb-[4px] flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-[#305f9f]">OT 진행 현황</p>
                  <span className="text-[10px] text-[#5478a9]">배정 {instr.otAssigned}건</span>
                </div>
                <div className="grid grid-cols-2 gap-[4px] text-center">
                  <div className="rounded bg-white px-[4px] py-[5px]">
                    <p className="text-[9px] text-content-tertiary">1차 완료</p>
                    <p className="text-[11px] font-semibold text-content">{instr.otFirstDone}</p>
                  </div>
                  <div className="rounded bg-white px-[4px] py-[5px]">
                    <p className="text-[9px] text-content-tertiary">1차 예정</p>
                    <p className="text-[11px] font-semibold text-content">{instr.otFirstPlanned}</p>
                  </div>
                  <div className="rounded bg-white px-[4px] py-[5px]">
                    <p className="text-[9px] text-content-tertiary">2차 완료</p>
                    <p className="text-[11px] font-semibold text-content">{instr.otSecondDone}</p>
                  </div>
                  <div className="rounded bg-white px-[4px] py-[5px]">
                    <p className="text-[9px] text-content-tertiary">2차 예정</p>
                    <p className="text-[11px] font-semibold text-content">{instr.otSecondPlanned}</p>
                  </div>
                </div>
              </div>

              <div className="mt-sm grid grid-cols-4 gap-[4px]">
                {LESSON_SESSION_TYPES.map((sessionType) => (
                  <div key={sessionType} className="rounded-md bg-surface-secondary px-[4px] py-[5px] text-center">
                    <p className="text-[9px] text-content-tertiary">{formatLessonSessionType(sessionType)}</p>
                    <p className="text-[11px] font-semibold text-content">{instr.sessionCounts[sessionType]}</p>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </AsyncBoundary>

      {/* 강사 상세 모달 */}
      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`${detailTarget?.name ?? ''} 강사 — 수업 상세`}
        size="lg"
      >
        <AsyncBoundary isLoading={detailLoading} isEmpty={detailClasses.length === 0} emptyMessage="해당 기간에 수업이 없습니다.">
          <div className="flex flex-col gap-xs max-h-96 overflow-y-auto">
            {detailClasses.map((cls) => {
              const start_ = new Date(cls.startTime);
              const end_ = new Date(cls.endTime);
              const dateStr = start_.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
              const startStr = start_.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
              const endStr = end_.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
              return (
                <div key={cls.id} className="flex items-center justify-between px-md py-sm bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-sm">
                    <BookOpen size={14} className="text-primary shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-content">{cls.title}</p>
                      <p className="text-[11px] text-content-tertiary">
                        {formatLessonSessionType(deriveLessonSessionType(cls.type, cls.title))} · {dateStr} · {startStr}~{endStr}{cls.room ? ` · ${cls.room}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-[12px] text-content-secondary shrink-0">{cls.capacity}명</span>
                </div>
              );
            })}
          </div>
        </AsyncBoundary>
      </Modal>
    </AppLayout>
  );
}
