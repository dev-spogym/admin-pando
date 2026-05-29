'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Users,
  UserCheck,
  Bell,
  ShieldCheck,
  CalendarClock,
  Search,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge, { type BadgeVariant } from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { getBranchId } from '@/lib/getBranchId';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';
import { deriveLessonSessionType } from '@/lib/lessonSessionTypes';

type RawRecord = Record<string, any>;
type WaitlistMemberStatus = '대기중' | '배정가능' | '취소';

interface WaitlistClass {
  id: string;
  numericId: number;
  name: string;
  schedule: string;
  sessionType: string;
  capacity: number;
  reserved: number;
  instructor: string;
  room: string;
}

interface WaitlistEntry {
  id: string;
  bookingId: number;
  classId: string;
  scheduleId: number;
  rank: number;
  memberId: number | null;
  memberName: string;
  memberPhone: string;
  requestedAt: string;
  passValid: boolean;
  autoAssignAgreed: boolean;
  hasPenalty: boolean;
  status: WaitlistMemberStatus;
}

interface AlternativeSlot {
  id: string;
  className: string;
  sessionType: string;
  date: string;
  time: string;
  instructor: string;
  room: string;
  remainingSeats: number;
}

const STATUS_VARIANT: Record<WaitlistMemberStatus, BadgeVariant> = {
  대기중: 'warning',
  배정가능: 'success',
  취소: 'default',
};

const AUTO_ASSIGN_POLICY_ON = true;

const pad = (value: number) => String(value).padStart(2, '0');

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatSchedule = (row: RawRecord) => {
  const start = formatDateTime(row.startTime);
  const end = new Date(row.endTime ?? '');
  if (Number.isNaN(end.getTime())) return start;
  return `${start}~${pad(end.getHours())}:${pad(end.getMinutes())}`;
};

const uniqueNumbers = (values: Array<number | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is number => Number.isFinite(value ?? NaN))));

const isPassValid = (member: RawRecord | undefined) => {
  if (!member) return true;
  const status = String(member.status ?? '').toUpperCase();
  if (['WITHDRAWN', 'INACTIVE', 'EXPIRED', 'SUSPENDED'].includes(status)) return false;
  if (!member.membershipExpiry) return true;
  return new Date(member.membershipExpiry).getTime() >= Date.now();
};

export default function ClassWaitlistPage() {
  const branchId = getBranchId();
  const authUser = useAuthStore((s) => s.user);
  const role = normalizeRole(authUser?.role ?? '');
  const canManage = authUser?.isSuperAdmin || isRoleAtLeast(role, 'manager') || role === 'fc' || role === 'staff';

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<WaitlistClass[]>([]);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const [altTarget, setAltTarget] = useState<WaitlistEntry | null>(null);
  const [altSlotId, setAltSlotId] = useState('');
  const [altMessage, setAltMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: bookingRows, error: bookingError }, { data: classRows, error: classError }] = await Promise.all([
        supabase
          .from('lesson_bookings')
          .select('*')
          .eq('branchId', branchId)
          .eq('status', 'WAITLIST')
          .order('createdAt', { ascending: true }),
        supabase
          .from('classes')
          .select('*')
          .eq('branchId', branchId)
          .order('startTime', { ascending: false })
          .limit(200),
      ]);

      if (bookingError) throw bookingError;
      if (classError) throw classError;

      const bookings = (bookingRows ?? []) as RawRecord[];
      const sourceClasses = (classRows ?? []) as RawRecord[];
      const scheduleIds = uniqueNumbers(bookings.map((row) => Number(row.scheduleId)));
      const memberIds = uniqueNumbers(bookings.map((row) => Number(row.memberId)));

      const [{ data: memberRows }, { data: penaltyRows }] = await Promise.all([
        memberIds.length
          ? supabase.from('members').select('id, phone, status, membershipExpiry').in('id', memberIds)
          : Promise.resolve({ data: [] as RawRecord[] }),
        memberIds.length
          ? supabase.from('penalties').select('memberId').eq('branchId', branchId).in('memberId', memberIds)
          : Promise.resolve({ data: [] as RawRecord[] }),
      ]);

      const memberMap = new Map((memberRows ?? []).map((row: RawRecord) => [Number(row.id), row]));
      const penaltyMemberIds = new Set((penaltyRows ?? []).map((row: RawRecord) => Number(row.memberId)));

      const classMap = new Map(sourceClasses.map((row) => [Number(row.id), row]));
      const optionClasses = sourceClasses
        .filter((row) => scheduleIds.includes(Number(row.id)) || Number(row.booked ?? 0) >= Number(row.capacity ?? 0))
        .map((row) => ({
          id: String(row.id),
          numericId: Number(row.id),
          name: row.title ?? `수업 ${row.id}`,
          schedule: formatSchedule(row),
          sessionType: deriveLessonSessionType(row),
          capacity: Number(row.capacity ?? 0),
          reserved: Number(row.booked ?? 0),
          instructor: row.staffName ?? '-',
          room: row.room ?? '-',
        }));

      const counts = new Map<number, number>();
      const waitlistRows = bookings.map((row) => {
        const scheduleId = Number(row.scheduleId);
        const memberId = Number(row.memberId);
        const rank = (counts.get(scheduleId) ?? 0) + 1;
        counts.set(scheduleId, rank);
        const lesson = classMap.get(scheduleId);
        const member = memberMap.get(memberId);
        const openSeats = Math.max(0, Number(lesson?.capacity ?? 0) - Number(lesson?.booked ?? 0));
        return {
          id: String(row.id),
          bookingId: Number(row.id),
          classId: String(scheduleId),
          scheduleId,
          rank,
          memberId: Number.isFinite(memberId) ? memberId : null,
          memberName: row.memberName ?? '-',
          memberPhone: member?.phone ?? '-',
          requestedAt: formatDateTime(row.createdAt),
          passValid: isPassValid(member),
          autoAssignAgreed: false,
          hasPenalty: penaltyMemberIds.has(memberId),
          status: openSeats > 0 && rank <= openSeats ? '배정가능' : '대기중',
        } satisfies WaitlistEntry;
      });

      setClasses(optionClasses);
      setEntries(waitlistRows);
      setClassId((prev) => (prev && optionClasses.some((item) => item.id === prev) ? prev : optionClasses[0]?.id ?? ''));
    } catch (error) {
      console.error(error);
      toast.error('대기열 데이터를 불러오지 못했습니다.');
      setClasses([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) ?? null, [classes, classId]);

  const classEntries = useMemo(
    () => entries.filter((e) => e.classId === classId).sort((a, b) => a.rank - b.rank),
    [entries, classId]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return classEntries;
    return classEntries.filter((e) => e.memberName.includes(q) || e.memberPhone.replace(/\D/g, '').includes(q.replace(/\D/g, '')));
  }, [classEntries, search]);

  const alternativeSlots = useMemo<AlternativeSlot[]>(() => {
    if (!selectedClass) return [];
    return classes
      .filter((item) => item.id !== selectedClass.id && item.sessionType === selectedClass.sessionType && item.capacity > item.reserved)
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        className: item.name,
        sessionType: item.sessionType,
        date: item.schedule.slice(0, 10),
        time: item.schedule.includes(' ') ? item.schedule.split(' ').slice(1).join(' ') : item.schedule,
        instructor: item.instructor,
        room: item.room,
        remainingSeats: Math.max(0, item.capacity - item.reserved),
      }));
  }, [classes, selectedClass]);

  const stats = useMemo(() => {
    const waiting = classEntries.length;
    const assignable = classEntries.filter((e) => e.status === '배정가능').length;
    const seatsOpen = selectedClass ? Math.max(0, selectedClass.capacity - selectedClass.reserved) : 0;
    return { waiting, assignable, seatsOpen };
  }, [classEntries, selectedClass]);

  const handleAssign = async (entry: WaitlistEntry) => {
    if (!entry.passValid) {
      toast.error('이용권이 만료된 회원입니다. 횟수 충전 후 배정할 수 있습니다.');
      return;
    }
    if (entry.hasPenalty) {
      toast.error('페널티 보유 회원입니다. 페널티 해제 후 배정할 수 있습니다.');
      return;
    }
    setSavingId(entry.bookingId);
    const { error } = await supabase.rpc('promote_waitlist_booking', { p_booking_id: entry.bookingId });
    setSavingId(null);
    if (error) {
      const message = error.message?.includes('class_full')
        ? '잔여 자리가 없어 배정할 수 없습니다.'
        : '대기자를 예약 확정 처리하지 못했습니다.';
      toast.error(message);
      return;
    }
    toast.success(`${entry.memberName}님을 예약 확정 처리했습니다.`);
    loadData();
  };

  const handleNotify = (entry: WaitlistEntry) => {
    toast.success(`${entry.memberName}님에게 자리 발생 알림 발송 요청을 기록했습니다.`);
  };

  const handleCancel = async (entry: WaitlistEntry) => {
    setSavingId(entry.bookingId);
    const { error } = await supabase
      .from('lesson_bookings')
      .update({ status: 'CANCELLED', cancelReason: '대기 신청 취소' })
      .eq('id', entry.bookingId)
      .eq('status', 'WAITLIST');
    setSavingId(null);
    if (error) {
      toast.error('대기 신청을 취소하지 못했습니다.');
      return;
    }
    toast.success(`${entry.memberName}님의 대기 신청을 취소했습니다.`);
    loadData();
  };

  const handleSendAlternative = () => {
    if (!altTarget) return;
    if (!altSlotId) {
      toast.error('제안할 대안 일정을 선택해주세요.');
      return;
    }
    const slot = alternativeSlots.find((s) => s.id === altSlotId);
    setAltTarget(null);
    setAltSlotId('');
    setAltMessage('');
    toast.success(`${altTarget.memberName}님에게 대안 일정(${slot?.date} ${slot?.time}) 발송 요청을 기록했습니다.`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="대기열 관리"
        description="만석 수업의 대기 신청자를 순번대로 관리하고 자리 발생 시 배정·알림을 처리합니다."
        actions={
          <div className="flex items-center gap-xs">
            <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={loadData} loading={loading}>
              새로고침
            </Button>
            <StatusBadge variant={AUTO_ASSIGN_POLICY_ON ? 'mint' : 'default'} dot>
              <ShieldCheck size={12} className="mr-[2px]" />
              자동 배정 정책 {AUTO_ASSIGN_POLICY_ON ? 'ON' : 'OFF'}
            </StatusBadge>
          </div>
        }
      />

      <div className="mb-lg flex flex-col gap-md lg:flex-row lg:items-center">
        <div className="w-full lg:w-[360px]">
          <Select
            label="대기열 조회 수업"
            value={classId}
            onChange={setClassId}
            options={classes.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.schedule}) · ${c.reserved}/${c.capacity}`,
            }))}
          />
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-md py-sm text-[12px] text-amber-700">
          자동 배정 동의값은 현재 예약 원장에 별도 필드가 없어 알림만 상태로 표시합니다. 동의값 스키마가 추가되면 자동 배정 대상 판정에 반영해야 합니다.
        </div>
      </div>

      <StatCardGrid cols={3} className="mb-xl">
        <StatCard label="전체 대기" value={`${stats.waiting}명`} icon={<Users />} variant="peach" loading={loading} />
        <StatCard label="배정 가능" value={`${stats.assignable}명`} icon={<UserCheck />} variant="mint" loading={loading} />
        <StatCard label="발생 자리" value={`${stats.seatsOpen}석`} icon={<CalendarClock />} loading={loading} />
      </StatCardGrid>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-lg">
          <h3 className="text-[14px] font-semibold text-content">
            {selectedClass ? `${selectedClass.name} 대기 신청자` : '대기 신청자'}
          </h3>
          <div className="relative w-[240px]">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
            <input
              type="text"
              placeholder="회원명·연락처 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-[6px] bg-surface-secondary border border-line rounded-lg text-[13px] text-content placeholder-content-tertiary focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-md px-lg py-4">
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-tertiary" />
                <div className="h-4 w-32 animate-pulse rounded bg-surface-tertiary" />
                <div className="ml-auto h-7 w-48 animate-pulse rounded bg-surface-tertiary" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search ? Search : Users}
            title={search ? '검색 결과가 없어요' : '대기 신청자가 없어요'}
            description={
              search
                ? '회원명이나 연락처를 다시 확인해 보세요.'
                : 'WAITLIST 상태의 예약 원장이 생성되면 이 화면에 순번대로 표시됩니다.'
            }
            action={search ? { label: '검색 초기화', onClick: () => setSearch('') } : undefined}
          />
        ) : (
          <div className="divide-y divide-line/60">
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-md px-lg py-4 hover:bg-surface-secondary/60 transition-colors">
                <div className="flex items-center gap-md">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-[13px] font-bold text-primary">
                    {entry.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-xs">
                      <span className="text-[14px] font-semibold text-content">{entry.memberName}</span>
                      <StatusBadge variant={STATUS_VARIANT[entry.status]} dot>{entry.status}</StatusBadge>
                      {!entry.passValid && <StatusBadge variant="error">이용권 만료</StatusBadge>}
                      {entry.hasPenalty && <StatusBadge variant="warning">페널티</StatusBadge>}
                    </div>
                    <div className="mt-[2px] flex items-center gap-xs text-[11px] text-content-tertiary">
                      <span className="tabular-nums">{entry.memberPhone}</span>
                      <span>·</span>
                      <span>신청 {entry.requestedAt}</span>
                      <span>·</span>
                      <span>{entry.autoAssignAgreed ? '자동 배정 동의' : '알림만'}</span>
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-xs">
                    <Button variant="outline" size="sm" icon={<CalendarClock size={13} />} onClick={() => setAltTarget(entry)}>
                      대안 제시
                    </Button>
                    <Button variant="outline" size="sm" icon={<Bell size={13} />} onClick={() => handleNotify(entry)}>
                      알림
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!entry.passValid || entry.hasPenalty}
                      loading={savingId === entry.bookingId}
                      onClick={() => handleAssign(entry)}
                    >
                      수동 배정
                    </Button>
                    <button
                      onClick={() => handleCancel(entry)}
                      disabled={savingId === entry.bookingId}
                      className="rounded-md border border-line px-2 py-[6px] text-[11px] font-semibold text-content-secondary hover:bg-red-50 hover:text-state-error hover:border-red-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={altTarget !== null}
        onClose={() => { setAltTarget(null); setAltSlotId(''); setAltMessage(''); }}
        title="대안 일정 제시"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => { setAltTarget(null); setAltSlotId(''); setAltMessage(''); }}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleSendAlternative}>제안 발송</Button>
          </div>
        }
      >
        {altTarget && (
          <div className="space-y-md">
            <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">대기 중 수업</p>
              <p className="mt-[2px] text-[13px] font-bold text-content">{selectedClass?.name} · {selectedClass?.schedule}</p>
              <p className="mt-[2px] text-[12px] text-content-secondary">{altTarget.memberName} · 순번 {altTarget.rank}번</p>
            </div>

            <div>
              <p className="mb-sm text-[12px] font-semibold text-content-secondary">대안 일정 선택</p>
              <div className="space-y-xs">
                {alternativeSlots.length === 0 ? (
                  <p className="rounded-xl border border-line bg-surface-secondary/60 px-md py-sm text-[12px] text-content-secondary">
                    같은 유형의 잔여 좌석 수업이 없습니다. 수동으로 다른 일정을 확인해야 합니다.
                  </p>
                ) : (
                  alternativeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setAltSlotId(slot.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border px-md py-sm text-left transition-colors',
                        altSlotId === slot.id ? 'border-primary bg-primary-light/40' : 'border-line bg-surface hover:bg-surface-secondary'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-xs">
                          <span className="text-[13px] font-semibold text-content">{slot.className}</span>
                          <StatusBadge variant="info">{slot.sessionType}</StatusBadge>
                        </div>
                        <div className="mt-[2px] text-[11px] text-content-tertiary">{slot.date} {slot.time} · {slot.instructor} · {slot.room}</div>
                      </div>
                      <span className="text-[12px] font-semibold text-state-success tabular-nums">잔여 {slot.remainingSeats}석</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="mb-xs block text-[12px] font-semibold text-content-secondary">안내 메시지 (선택)</label>
              <Textarea
                rows={2}
                placeholder="회원에게 전달할 추가 메시지를 입력하세요."
                value={altMessage}
                onChange={(e) => setAltMessage(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
