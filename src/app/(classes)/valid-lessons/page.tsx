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
  RefreshCw,
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
import { getBranchId } from '@/lib/getBranchId';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';
import { deriveLessonSessionType } from '@/lib/lessonSessionTypes';

type RawRecord = Record<string, any>;
type AttendanceStatus = '미처리' | '출석' | '결석' | '노쇼';

interface ValidLesson {
  id: string;
  bookingId: number;
  scheduleId: number | null;
  className: string;
  sessionType: string;
  instructor: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  memberId: number | null;
  memberName: string;
  memberPhone: string;
  remainingCount: number;
  attendance: AttendanceStatus;
  signatureRequired: boolean;
  signatureReceived: boolean;
}

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

const pad = (value: number) => String(value).padStart(2, '0');
const fmtDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fmtTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const getDateKey = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : fmtDate(date);
};

const getWeekRange = () => {
  const base = new Date();
  const day = base.getDay();
  const diffToMon = (day + 6) % 7;
  const start = new Date(base);
  start.setDate(base.getDate() - diffToMon);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: fmtDate(start), end: fmtDate(end) };
};

const normalizeAttendance = (status: string | null | undefined): AttendanceStatus => {
  const normalized = (status ?? '').trim().toUpperCase().replace(/[-\s]/g, '_');
  if (normalized === 'ATTENDED' || normalized === 'SHOW') return '출석';
  if (normalized === 'NOSHOW' || normalized === 'NO_SHOW') return '노쇼';
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return '결석';
  return '미처리';
};

const statusForAttendance = (status: AttendanceStatus) => {
  if (status === '출석') return 'ATTENDED';
  if (status === '노쇼') return 'NOSHOW';
  if (status === '결석') return 'CANCELLED';
  return 'BOOKED';
};

const isMemberPassValid = (member: RawRecord | undefined) => {
  if (!member) return true;
  const status = String(member.status ?? '').toUpperCase();
  if (['WITHDRAWN', 'INACTIVE', 'EXPIRED', 'SUSPENDED'].includes(status)) return false;
  if (!member.membershipExpiry) return true;
  return new Date(member.membershipExpiry).getTime() >= Date.now();
};

const uniqueNumbers = (values: Array<number | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is number => Number.isFinite(value ?? NaN))));

export default function ValidLessonsPage() {
  const branchId = getBranchId();
  const authUser = useAuthStore((s) => s.user);
  const role = normalizeRole(authUser?.role ?? '');
  const canSign = authUser?.isSuperAdmin || isRoleAtLeast(role, 'manager') || role === 'fc';
  const canProcess = authUser?.isSuperAdmin || isRoleAtLeast(role, 'fc') || role === 'staff';

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<ValidLesson[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterKey>('TODAY');
  const [activeTab, setActiveTab] = useState<'ALL' | AttendanceStatus>('ALL');
  const [search, setSearch] = useState('');
  const [signTarget, setSignTarget] = useState<ValidLesson | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadLessons = async () => {
    setLoading(true);
    try {
      const { data: bookingRows, error: bookingError } = await supabase
        .from('lesson_bookings')
        .select('*')
        .eq('branchId', branchId)
        .in('status', ['BOOKED', 'ATTENDED', 'NOSHOW'])
        .order('createdAt', { ascending: false })
        .limit(1000);

      if (bookingError) throw bookingError;

      const bookings = (bookingRows ?? []) as RawRecord[];
      const scheduleIds = uniqueNumbers(bookings.map((row) => Number(row.scheduleId)));
      const memberIds = uniqueNumbers(bookings.map((row) => Number(row.memberId)));

      const [{ data: classRows }, { data: memberRows }] = await Promise.all([
        scheduleIds.length
          ? supabase.from('classes').select('*').in('id', scheduleIds)
          : Promise.resolve({ data: [] as RawRecord[] }),
        memberIds.length
          ? supabase.from('members').select('id, phone, status, membershipExpiry').in('id', memberIds)
          : Promise.resolve({ data: [] as RawRecord[] }),
      ]);

      const classMap = new Map((classRows ?? []).map((row: RawRecord) => [Number(row.id), row]));
      const memberMap = new Map((memberRows ?? []).map((row: RawRecord) => [Number(row.id), row]));

      const mapped: ValidLesson[] = bookings
        .flatMap((booking): ValidLesson[] => {
          const scheduleId = Number(booking.scheduleId);
          const memberId = Number(booking.memberId);
          const lesson = classMap.get(scheduleId);
          if (!lesson) return [];
          const member = memberMap.get(memberId);
          const start = new Date(lesson.startTime);
          const end = new Date(lesson.endTime);
          const attendance = normalizeAttendance(booking.status);
          const sessionType = deriveLessonSessionType(lesson);
          const passValid = isMemberPassValid(member);
          return [{
            id: String(booking.id),
            bookingId: Number(booking.id),
            scheduleId,
            className: lesson.title ?? `수업 ${scheduleId}`,
            sessionType,
            instructor: lesson.staffName ?? '-',
            date: fmtDate(start),
            startTime: fmtTime(start),
            endTime: Number.isNaN(end.getTime()) ? '-' : fmtTime(end),
            room: lesson.room ?? '-',
            memberId: Number.isFinite(memberId) ? memberId : null,
            memberName: booking.memberName ?? lesson.member_name ?? '-',
            memberPhone: member?.phone ?? '-',
            remainingCount: passValid ? 1 : 0,
            attendance,
            signatureRequired: sessionType === 'PT',
            signatureReceived: Boolean(lesson.signature_at),
          }];
        });

      setLessons(mapped);
    } catch (error) {
      console.error(error);
      toast.error('유효 수업 목록을 불러오지 못했습니다.');
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLessons();
  }, [branchId]);

  const weekRange = useMemo(getWeekRange, []);
  const todayKey = useMemo(() => fmtDate(new Date()), []);

  const dateFiltered = useMemo(() => {
    return lessons.filter((lesson) => {
      if (dateFilter === 'TODAY') return lesson.date === todayKey;
      return lesson.date >= weekRange.start && lesson.date <= weekRange.end;
    });
  }, [lessons, dateFilter, todayKey, weekRange]);

  const stats = useMemo(() => {
    const total = dateFiltered.length;
    const done = dateFiltered.filter((lesson) => lesson.attendance !== '미처리').length;
    const unprocessed = total - done;
    const signPending = dateFiltered.filter((lesson) => lesson.signatureRequired && lesson.attendance === '출석' && !lesson.signatureReceived).length;
    return { total, done, unprocessed, signPending };
  }, [dateFiltered]);

  const tabsWithCount = useMemo(
    () =>
      ATTENDANCE_TABS.map((tab) => ({
        ...tab,
        count: tab.key === 'ALL' ? dateFiltered.length : dateFiltered.filter((lesson) => lesson.attendance === tab.key).length,
      })),
    [dateFiltered]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    const phoneQuery = q.replace(/\D/g, '');
    return dateFiltered.filter((lesson) => {
      const matchTab = activeTab === 'ALL' || lesson.attendance === activeTab;
      const matchSearch =
        !q ||
        lesson.memberName.includes(q) ||
        lesson.className.includes(q) ||
        lesson.instructor.includes(q) ||
        lesson.memberPhone.replace(/\D/g, '').includes(phoneQuery);
      return matchTab && matchSearch;
    });
  }, [dateFiltered, activeTab, search]);

  const setAttendance = async (lesson: ValidLesson, next: AttendanceStatus) => {
    if (!canProcess) return;
    if (next === '출석' && lesson.remainingCount <= 0) {
      toast.error('유효한 잔여 횟수가 없어 출석 처리할 수 없습니다');
      return;
    }
    setSavingId(lesson.bookingId);
    const { error } = await supabase
      .from('lesson_bookings')
      .update({ status: statusForAttendance(next) })
      .eq('id', lesson.bookingId);
    setSavingId(null);

    if (error) {
      toast.error('출석 상태를 저장하지 못했습니다.');
      return;
    }
    toast.success('처리되었습니다.');
    loadLessons();
  };

  const handleSign = async () => {
    if (!signTarget?.scheduleId) return;
    setSavingId(signTarget.bookingId);
    const { error } = await supabase
      .from('classes')
      .update({ signature_at: new Date().toISOString() })
      .eq('id', signTarget.scheduleId);
    setSavingId(null);
    if (error) {
      toast.error('서명 상태를 저장하지 못했습니다.');
      return;
    }
    setSignTarget(null);
    toast.success('서명이 저장되었습니다.');
    loadLessons();
  };

  const allDone = dateFiltered.length > 0 && stats.unprocessed === 0;

  return (
    <AppLayout>
      <PageHeader
        title="유효 수업 목록"
        description="이용권이 유효하고 예약이 확정된 진행 가능 수업만 모아 출석 처리와 서명을 진행합니다."
        actions={
          <div className="flex items-center gap-xs">
            {DATE_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setDateFilter(filter.key)}
                className={cn(
                  'rounded-lg px-3 py-[7px] text-[13px] font-semibold transition-colors',
                  dateFilter === filter.key
                    ? 'bg-primary text-white'
                    : 'border border-line bg-surface text-content-secondary hover:bg-surface-secondary'
                )}
              >
                {filter.label}
              </button>
            ))}
            <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} loading={loading} onClick={loadLessons}>
              새로고침
            </Button>
          </div>
        }
      />

      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label="유효 수업" value={`${stats.total}건`} icon={<CalendarCheck />} variant="peach" loading={loading} />
        <StatCard label="출석 미처리" value={`${stats.unprocessed}건`} icon={<Clock />} loading={loading} className={stats.unprocessed > 0 ? 'border-amber-200' : ''} />
        <StatCard label="처리 완료" value={`${stats.done}건`} icon={<CheckCircle2 />} variant="mint" loading={loading} />
        <StatCard label="서명 미수령" value={`${stats.signPending}건`} icon={<PenLine />} loading={loading} className={stats.signPending > 0 ? 'border-amber-200' : ''} />
      </StatCardGrid>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="flex flex-col gap-md border-b border-line p-lg lg:flex-row lg:items-center lg:justify-between">
          <TabNav tabs={tabsWithCount} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as 'ALL' | AttendanceStatus)} />
          <div className="relative w-full lg:w-[260px]">
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

        {allDone && (
          <div className="flex items-center gap-xs border-b border-line bg-emerald-50 px-lg py-sm text-[12px] font-semibold text-state-success">
            <CheckCircle2 size={14} />
            해당 날짜의 모든 수업 출석 처리가 완료되었습니다.
          </div>
        )}

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
                <th className="px-3 py-3 text-center">유효</th>
                <th className="px-3 py-3 text-center">상태</th>
                <th className="px-3 py-3 text-center">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((lesson) => {
                const noPass = lesson.remainingCount <= 0;
                const unprocessed = lesson.attendance === '미처리';
                return (
                  <tr key={lesson.id} className={cn('transition-colors hover:bg-surface-secondary/70', unprocessed && 'bg-amber-50/40')}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-xs">
                        <span className="font-semibold text-content">{lesson.className}</span>
                        <StatusBadge variant={SESSION_VARIANT[lesson.sessionType] ?? 'default'}>{lesson.sessionType}</StatusBadge>
                      </div>
                      <div className="mt-[2px] text-[11px] text-content-tertiary">{lesson.instructor}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-content tabular-nums">{lesson.date} {lesson.startTime}~{lesson.endTime}</div>
                      <div className="mt-[2px] text-[11px] text-content-tertiary">{lesson.room}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-content">{lesson.memberName}</div>
                      <div className="mt-[2px] text-[11px] text-content-tertiary tabular-nums">{lesson.memberPhone}</div>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      <span className={cn(noPass ? 'font-semibold text-state-error' : 'text-content')}>{noPass ? '만료' : '유효'}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex flex-col items-center gap-[3px]">
                        <StatusBadge variant={ATTENDANCE_VARIANT[lesson.attendance]} dot>{lesson.attendance}</StatusBadge>
                        {lesson.signatureRequired && lesson.attendance === '출석' && !lesson.signatureReceived && (
                          <span className="rounded-full bg-amber-50 px-2 py-[1px] text-[10px] font-semibold text-amber-600 border border-amber-200">서명 미수령</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-xs">
                        <button
                          onClick={() => setAttendance(lesson, '출석')}
                          disabled={!canProcess || noPass || savingId === lesson.bookingId}
                          className="rounded-md border border-line px-2 py-[3px] text-[11px] font-semibold text-content-secondary hover:bg-emerald-50 hover:text-state-success hover:border-emerald-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          title={noPass ? '잔여 횟수 없음' : '출석 처리'}
                        >
                          출석
                        </button>
                        <button
                          onClick={() => setAttendance(lesson, '결석')}
                          disabled={!canProcess || savingId === lesson.bookingId}
                          className="rounded-md border border-line px-2 py-[3px] text-[11px] font-semibold text-content-secondary hover:bg-surface-tertiary transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          결석
                        </button>
                        <button
                          onClick={() => setAttendance(lesson, '노쇼')}
                          disabled={!canProcess || savingId === lesson.bookingId}
                          className="rounded-md border border-line px-2 py-[3px] text-[11px] font-semibold text-content-secondary hover:bg-red-50 hover:text-state-error hover:border-red-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          노쇼
                        </button>
                        {canSign && lesson.signatureRequired && lesson.attendance === '출석' && !lesson.signatureReceived && (
                          <Button variant="outline" size="sm" icon={<PenLine size={13} />} onClick={() => setSignTarget(lesson)}>
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

      <Modal
        isOpen={signTarget !== null}
        onClose={() => setSignTarget(null)}
        title="서명 요청"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setSignTarget(null)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleSign} loading={savingId === signTarget?.bookingId}>서명 완료 처리</Button>
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
              <AlertTriangle size={12} /> 현재 DB에는 예약별 서명 이미지 원장이 없어 수업 단위 서명 완료 시각만 저장합니다.
            </p>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
