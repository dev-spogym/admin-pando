'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  FileSignature,
  RefreshCw,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { getBranchId } from '@/lib/getBranchId';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { deriveLessonSessionType, formatLessonSessionType } from '@/lib/lessonSessionTypes';

type AttendanceStatus =
  | 'pending'
  | 'attended'
  | 'completed'
  | 'missingSign'
  | 'pushSent'
  | 'noshow'
  | 'cancelled'
  | 'waitlist';

interface LessonOption {
  id: number;
  time: string;
  title: string;
  trainer: string;
  room: string;
  capacity: number;
  booked: number;
  sessionType: string;
  status: string;
  startTime: string;
  endTime: string;
  signatureAt: string | null;
}

interface LessonMember {
  bookingId: number;
  memberId: number | null;
  name: string;
  phone: string;
  membership: string;
  lessonCountId: number | null;
  remainCount: number | null;
  status: AttendanceStatus;
  processedAt: string;
  processedBy: string;
  accessHint: string;
  pushSentAt: string | null;
  completedAt: string | null;
  lessonCountDelta: number;
}

interface BookingRow {
  id: number;
  scheduleId: number;
  memberId: number | null;
  memberName: string | null;
  status: string | null;
  branchId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  attendedAt?: string | null;
  noShowAt?: string | null;
  completedAt?: string | null;
  pushSentAt?: string | null;
  processedBy?: string | null;
  lessonCountId?: number | null;
  lessonCountDelta?: number | null;
}

interface MemberRow {
  id: number;
  name: string | null;
  phone: string | null;
}

interface LessonCountRow {
  id: number;
  memberId: number;
  productName: string | null;
  totalCount: number | null;
  usedCount: number | null;
  endDate: string | null;
}

interface AttendanceRow {
  memberId: number;
  checkInAt: string;
  checkOutAt: string | null;
  checkInMethod?: string | null;
}

const STATUS_META: Record<AttendanceStatus, { label: string; className: string }> = {
  pending: { label: '처리 대기', className: 'bg-gray-100 text-gray-700' },
  attended: { label: '출석 처리', className: 'bg-emerald-100 text-emerald-700' },
  completed: { label: '완료', className: 'bg-blue-100 text-blue-700' },
  missingSign: { label: '서명/확인 누락', className: 'bg-amber-100 text-amber-700' },
  pushSent: { label: 'Push 발송됨', className: 'bg-indigo-100 text-indigo-700' },
  noshow: { label: '노쇼', className: 'bg-red-100 text-red-700' },
  cancelled: { label: '취소', className: 'bg-slate-100 text-slate-600' },
  waitlist: { label: '대기', className: 'bg-orange-100 text-orange-700' },
};

const pad = (value: number) => String(value).padStart(2, '0');

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const formatTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16) || value;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const normalizeBookingStatus = (
  booking: BookingRow,
  lesson: LessonOption,
  activeCount: LessonCountRow | undefined
): AttendanceStatus => {
  const status = (booking.status ?? '').toUpperCase();
  if (status === 'CANCELLED' || status === 'CANCELED') return 'cancelled';
  if (status === 'WAITLIST' || status === 'WAITING') return 'waitlist';
  if (status === 'NOSHOW' || status === 'NO_SHOW') return 'noshow';
  if (booking.completedAt) return 'completed';
  if (booking.pushSentAt) return 'pushSent';
  if (status === 'ATTENDED') {
    const needsSignature = lesson.sessionType === 'PT' && !lesson.signatureAt;
    return needsSignature && activeCount ? 'missingSign' : 'attended';
  }
  return 'pending';
};

const isTerminalStatus = (status: AttendanceStatus) =>
  status === 'completed' || status === 'noshow' || status === 'cancelled' || status === 'waitlist';

export default function LessonCompletionPage() {
  const branchId = getBranchId();
  const currentUser = useAuthStore((state) => state.user);
  const processedBy = currentUser?.name ?? currentUser?.email ?? '현재 사용자';

  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [members, setMembers] = useState<LessonMember[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [noshowAutoDeduct, setNoshowAutoDeduct] = useState(true);

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  const loadLessons = async () => {
    setLoading(true);
    const start = `${selectedDate}T00:00:00`;
    const end = `${selectedDate}T23:59:59`;

    const { data, error } = await supabase
      .from('classes')
      .select('id,title,type,staffName,room,startTime,endTime,capacity,booked,lesson_status,signature_at')
      .eq('branchId', branchId)
      .gte('startTime', start)
      .lte('startTime', end)
      .order('startTime', { ascending: true });

    if (error) {
      toast.error('수업 목록을 불러오지 못했습니다.');
      setLessons([]);
      setSelectedLessonId(null);
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row: any) => {
      const sessionType = formatLessonSessionType(deriveLessonSessionType(row.type, row.title));
      return {
        id: Number(row.id),
        time: `${formatTime(row.startTime)}-${formatTime(row.endTime)}`,
        title: String(row.title ?? '-'),
        trainer: String(row.staffName ?? '-'),
        room: String(row.room ?? '-'),
        capacity: Number(row.capacity ?? 0),
        booked: Number(row.booked ?? 0),
        sessionType,
        status: String(row.lesson_status ?? 'scheduled'),
        startTime: row.startTime,
        endTime: row.endTime,
        signatureAt: row.signature_at ?? null,
      } satisfies LessonOption;
    });

    setLessons(mapped);
    setSelectedLessonId((current) => {
      if (current && mapped.some((lesson) => lesson.id === current)) return current;
      return mapped[0]?.id ?? null;
    });
    setLoading(false);
  };

  const loadMembers = async () => {
    if (!selectedLesson) {
      setMembers([]);
      return;
    }

    setMemberLoading(true);
    const { data: bookingData, error: bookingError } = await supabase
      .from('lesson_bookings')
      .select('id,scheduleId,memberId,memberName,status,branchId,createdAt,updatedAt,attendedAt,noShowAt,completedAt,pushSentAt,processedBy,lessonCountId,lessonCountDelta')
      .eq('scheduleId', selectedLesson.id)
      .order('createdAt', { ascending: true });

    if (bookingError) {
      toast.error('예약 회원을 불러오지 못했습니다.');
      setMembers([]);
      setMemberLoading(false);
      return;
    }

    const bookings = (bookingData ?? []) as BookingRow[];
    const memberIds = Array.from(new Set(bookings.map((booking) => booking.memberId).filter((id): id is number => Number.isFinite(id ?? NaN))));

    const [{ data: memberData }, { data: countData }, { data: attendanceData }] = await Promise.all([
      memberIds.length > 0
        ? supabase.from('members').select('id,name,phone').in('id', memberIds)
        : Promise.resolve({ data: [] as MemberRow[] }),
      memberIds.length > 0
        ? supabase
            .from('lesson_counts')
            .select('id,memberId,productName,totalCount,usedCount,endDate')
            .eq('branchId', branchId)
            .in('memberId', memberIds)
            .order('endDate', { ascending: true })
        : Promise.resolve({ data: [] as LessonCountRow[] }),
      memberIds.length > 0
        ? supabase
            .from('attendance')
            .select('memberId,checkInAt,checkOutAt,checkInMethod')
            .eq('branchId', branchId)
            .in('memberId', memberIds)
            .gte('checkInAt', `${selectedDate}T00:00:00`)
            .lte('checkInAt', `${selectedDate}T23:59:59`)
        : Promise.resolve({ data: [] as AttendanceRow[] }),
    ]);

    const memberMap = new Map((memberData ?? []).map((member: any) => [Number(member.id), member as MemberRow]));
    const attendanceMap = new Map<number, AttendanceRow>();
    (attendanceData ?? []).forEach((row: any) => {
      const memberId = Number(row.memberId);
      if (!attendanceMap.has(memberId)) attendanceMap.set(memberId, row as AttendanceRow);
    });

    const activeCountByMember = new Map<number, LessonCountRow>();
    (countData ?? []).forEach((row: any) => {
      const count = row as LessonCountRow;
      const remain = Number(count.totalCount ?? 0) - Number(count.usedCount ?? 0);
      if (remain <= 0 || activeCountByMember.has(Number(count.memberId))) return;
      activeCountByMember.set(Number(count.memberId), count);
    });

    setMembers(
      bookings.map((booking) => {
        const member = booking.memberId ? memberMap.get(booking.memberId) : undefined;
        const activeCount = booking.memberId ? activeCountByMember.get(booking.memberId) : undefined;
        const attendance = booking.memberId ? attendanceMap.get(booking.memberId) : undefined;
        const status = normalizeBookingStatus(booking, selectedLesson, activeCount);
        const processedAt = booking.completedAt ?? booking.noShowAt ?? booking.attendedAt ?? booking.pushSentAt ?? booking.updatedAt ?? booking.createdAt;
        const remainCount = activeCount ? Number(activeCount.totalCount ?? 0) - Number(activeCount.usedCount ?? 0) : null;

        return {
          bookingId: booking.id,
          memberId: booking.memberId,
          name: member?.name ?? booking.memberName ?? '-',
          phone: member?.phone ?? '-',
          membership: activeCount?.productName ?? '차감 가능 이용권 없음',
          lessonCountId: activeCount?.id ?? booking.lessonCountId ?? null,
          remainCount,
          status,
          processedAt: formatDateTime(processedAt),
          processedBy: booking.processedBy ?? '-',
          accessHint: attendance
            ? `${formatTime(attendance.checkInAt)} 입장${attendance.checkInMethod ? ` · ${attendance.checkInMethod}` : ''}`
            : '입장 기록 없음',
          pushSentAt: booking.pushSentAt ?? null,
          completedAt: booking.completedAt ?? null,
          lessonCountDelta: Number(booking.lessonCountDelta ?? 0),
        } satisfies LessonMember;
      })
    );
    setMemberLoading(false);
  };

  const loadPolicy = async () => {
    const { data } = await supabase
      .from('lesson_policy_settings')
      .select('noshowAutoDeduct, noShowDeductsSession')
      .eq('branchId', branchId)
      .maybeSingle();
    if (data) setNoshowAutoDeduct(Boolean(data.noShowDeductsSession ?? data.noshowAutoDeduct));
  };

  useEffect(() => {
    void loadPolicy();
    void loadLessons();
  }, [selectedDate, branchId]);

  useEffect(() => {
    void loadMembers();
  }, [selectedLessonId, selectedLesson?.signatureAt]);

  const filteredMembers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const phoneKeyword = query.replace(/\D/g, '');
    return members.filter((member) => {
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      const matchesQuery =
        !keyword ||
        member.name.toLowerCase().includes(keyword) ||
        member.phone.replace(/\D/g, '').includes(phoneKeyword);
      return matchesStatus && matchesQuery;
    });
  }, [query, members, statusFilter]);

  const summary = useMemo(() => {
    const count = (status: AttendanceStatus) => members.filter((member) => member.status === status).length;
    return {
      total: members.length,
      attended: count('attended') + count('completed') + count('missingSign') + count('pushSent'),
      pending: count('pending'),
      missingSign: count('missingSign') + count('pushSent'),
      noshow: count('noshow'),
    };
  }, [members]);

  const refreshCurrent = async () => {
    await loadLessons();
    await loadMembers();
  };

  const processAttendance = async (
    member: LessonMember,
    action: 'attended' | 'completed' | 'noshow' | 'push'
  ) => {
    setProcessingId(member.bookingId);
    const shouldDeduct = action === 'completed' || (action === 'noshow' && noshowAutoDeduct);
    const note =
      action === 'completed'
        ? '수업 완료 확인에서 처리'
        : action === 'noshow'
          ? '수업 출석/완료 확인에서 노쇼 처리'
          : action === 'push'
            ? '서명/확인 요청 Push 발송'
            : '수업 출석 처리';

    const { data, error } = await supabase.rpc('process_lesson_attendance', {
      p_booking_id: member.bookingId,
      p_action: action,
      p_processed_by: processedBy,
      p_note: note,
      p_deduct: shouldDeduct,
    });

    setProcessingId(null);
    if (error) {
      toast.error(`처리에 실패했습니다: ${error.message}`);
      return;
    }

    const deducted = Number((data as { deducted?: number } | null)?.deducted ?? 0);
    const suffix = shouldDeduct
      ? deducted > 0
        ? ' 수강권 1회가 차감되었습니다.'
        : ' 차감 가능한 이용권이 없어 상태만 반영했습니다.'
      : '';

    toast.success(
      action === 'attended'
        ? '출석 처리되었습니다.'
        : action === 'completed'
          ? `완료 처리되었습니다.${suffix}`
          : action === 'noshow'
            ? `노쇼 처리되었습니다.${suffix}`
            : '회원앱 확인 요청 Push 상태로 기록했습니다.'
    );
    await refreshCurrent();
  };

  const markAllNoShow = async () => {
    const targets = members.filter((member) => member.status === 'pending');
    if (targets.length === 0) {
      toast.info('노쇼 처리할 미처리 회원이 없습니다.');
      return;
    }
    const deductText = noshowAutoDeduct ? '수강권이 있으면 1회 차감됩니다.' : '현재 자동 차감 정책은 OFF라 상태만 반영됩니다.';
    if (!window.confirm(`미처리 ${targets.length}명을 노쇼로 반영할까요? ${deductText}`)) return;

    for (const member of targets) {
      setProcessingId(member.bookingId);
      const { error } = await supabase.rpc('process_lesson_attendance', {
        p_booking_id: member.bookingId,
        p_action: 'noshow',
        p_processed_by: processedBy,
        p_note: '미처리 일괄 노쇼 반영',
        p_deduct: noshowAutoDeduct,
      });
      if (error) {
        toast.error(`${member.name} 노쇼 처리 실패: ${error.message}`);
      }
    }

    setProcessingId(null);
    toast.success('미처리 노쇼 반영이 완료되었습니다.');
    await refreshCurrent();
  };

  return (
    <AppLayout>
      <PageHeader
        title="수업 출석/완료 확인"
        description="실제 예약 회원 기준으로 출석, 완료, 서명 누락, 노쇼와 수강권 차감을 처리합니다."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => void refreshCurrent()}
              disabled={loading || memberLoading}
            >
              <RefreshCw size={15} />
              새로고침
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              onClick={markAllNoShow}
              disabled={memberLoading || members.length === 0}
            >
              <XCircle size={15} />
              미처리 노쇼 반영
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[160px_1fr_180px_180px_240px]">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            수업일
            <input
              type="date"
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            수업 선택
            <select
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              value={selectedLessonId ?? ''}
              onChange={(event) => setSelectedLessonId(event.target.value ? Number(event.target.value) : null)}
              disabled={loading || lessons.length === 0}
            >
              {lessons.length === 0 ? (
                <option value="">해당 일자의 수업 없음</option>
              ) : (
                lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.time} · {lesson.title}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            상태
            <select
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AttendanceStatus | 'all')}
            >
              <option value="all">전체</option>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            강사
            <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
              {selectedLesson?.trainer ?? '-'}
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            회원 검색
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                placeholder="회원명 또는 연락처"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>
        </div>
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">예약 인원</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.total}명</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-700">출석/완료</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.attended}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">미처리</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.pending}명</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700">서명/확인 누락</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{summary.missingSign}명</p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700">노쇼</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{summary.noshow}명</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        {selectedLesson
          ? `${selectedLesson.room} · ${selectedLesson.sessionType} · 예약 ${selectedLesson.booked}/${selectedLesson.capacity}명 · 수업 상태 ${selectedLesson.status}`
          : '수업을 선택하면 예약 회원과 출석 처리 상태가 표시됩니다.'}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">회원</th>
              <th className="px-4 py-3 text-left">이용권</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">처리 정보</th>
              <th className="px-4 py-3 text-left">입/출입 참고</th>
              <th className="px-4 py-3 text-right">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMembers.map((member) => {
              const status = STATUS_META[member.status];
              const terminal = isTerminalStatus(member.status);
              const processing = processingId === member.bookingId;
              return (
                <tr key={member.bookingId} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.phone}</div>
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    <div>{member.membership}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {member.remainCount === null ? '잔여 확인 필요' : `잔여 ${member.remainCount}회`}
                      {member.lessonCountDelta > 0 && ` · 차감 ${member.lessonCountDelta}회`}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    <div>{member.processedAt}</div>
                    <div>{member.processedBy}</div>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">{member.accessHint}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => processAttendance(member, 'attended')}
                        disabled={terminal || processing}
                      >
                        <UserCheck size={13} />
                        출석
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => processAttendance(member, 'completed')}
                        disabled={terminal || processing}
                      >
                        <CheckCircle2 size={13} />
                        완료
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => processAttendance(member, 'push')}
                        disabled={terminal || processing}
                      >
                        <Bell size={13} />
                        Push
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => processAttendance(member, 'noshow')}
                        disabled={terminal || processing}
                      >
                        <XCircle size={13} />
                        노쇼
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(loading || memberLoading) && (
          <div className="flex items-center justify-center gap-2 px-4 py-14 text-sm text-gray-500">
            <RefreshCw size={18} className="animate-spin" />
            수업 예약 정보를 불러오는 중입니다.
          </div>
        )}
        {!loading && !memberLoading && filteredMembers.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-sm text-gray-500">
            <Clock size={22} />
            조건에 맞는 예약 회원이 없습니다.
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <FileSignature size={15} className="mt-0.5 shrink-0" />
        완료 처리 시 활성 수강권이 있으면 1회 차감하고 `lesson_count_logs`에 이력을 남깁니다. 노쇼 차감은 자동 페널티 정책({noshowAutoDeduct ? 'ON' : 'OFF'})을 따릅니다.
      </div>
    </AppLayout>
  );
}
