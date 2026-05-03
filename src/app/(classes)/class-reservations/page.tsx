'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import DataTable from '@/components/common/DataTable';
import StatusBadge, { type BadgeVariant } from '@/components/common/StatusBadge';
import { supabase } from '@/lib/supabase';
import { getBranchScope } from '@/lib/branchScope';
import { exportToExcel } from '@/lib/exportExcel';
import { useAuthStore } from '@/stores/authStore';
import { hasFeature, normalizeRole } from '@/lib/permissions';
import { AUDIT_ACTIONS, createAuditLog } from '@/api/endpoints/auditLog';
import { deriveLessonSessionType, formatLessonSessionType } from '@/lib/lessonSessionTypes';

type RawRecord = Record<string, any>;
type DateBasis = 'lesson' | 'reserved';
type ReservationStatus = 'BOOKED' | 'ATTENDED' | 'CANCELLED' | 'NOSHOW' | 'WAITLIST' | 'PENDING' | 'UNKNOWN';

interface ReservationRow {
  id: string;
  bookingId: number | null;
  scheduleId: number | null;
  branchId: number | null;
  branchName: string;
  reservedAt: string | null;
  lessonStartAt: string | null;
  lessonEndAt: string | null;
  lessonTimeText: string | null;
  className: string;
  classType: string | null;
  sessionTypeLabel: string;
  staffName: string;
  memberId: number | null;
  memberName: string;
  memberPhone: string;
  status: ReservationStatus;
  statusRaw: string | null;
  cancelReason: string | null;
  handledBy: string;
  handledAt: string | null;
  duplicate: boolean;
}

const STATUS_OPTIONS: Array<{ value: ReservationStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'BOOKED', label: '예약완료' },
  { value: 'ATTENDED', label: '출석완료' },
  { value: 'CANCELLED', label: '취소' },
  { value: 'NOSHOW', label: '노쇼' },
  { value: 'WAITLIST', label: '대기' },
];

const STATUS_META: Record<ReservationStatus, { label: string; variant: BadgeVariant }> = {
  BOOKED: { label: '예약완료', variant: 'info' },
  ATTENDED: { label: '출석완료', variant: 'success' },
  CANCELLED: { label: '취소', variant: 'default' },
  NOSHOW: { label: '노쇼', variant: 'error' },
  WAITLIST: { label: '대기', variant: 'warning' },
  PENDING: { label: '미처리', variant: 'warning' },
  UNKNOWN: { label: '확인필요', variant: 'secondary' },
};

const pad = (value: number) => String(value).padStart(2, '0');

const formatDateInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getDefaultDateRange = () => {
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + 7);
  return { start: formatDateInput(start), end: formatDateInput(end) };
};

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizePhone = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');

const normalizeStatus = (status: string | null | undefined): ReservationStatus => {
  const normalized = (status ?? '').trim().toUpperCase().replace(/[-\s]/g, '_');
  if (normalized === 'SHOW' || normalized === 'ATTENDED') return 'ATTENDED';
  if (normalized === 'NO_SHOW' || normalized === 'NOSHOW') return 'NOSHOW';
  if (normalized === 'BOOKED' || normalized === 'CONFIRMED') return 'BOOKED';
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'CANCELLED';
  if (normalized === 'WAITLIST' || normalized === 'WAITING') return 'WAITLIST';
  if (normalized === 'PENDING' || normalized === '') return 'PENDING';
  return 'UNKNOWN';
};

const getDateKey = (value: string | null | undefined) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : formatDateInput(date);
};

const isWithinDateRange = (value: string | null, startDate: string, endDate: string) => {
  const key = getDateKey(value);
  if (!key) return false;
  return key >= startDate && key <= endDate;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatLessonTime = (row: ReservationRow) => {
  if (row.lessonStartAt) {
    const start = formatDateTime(row.lessonStartAt);
    if (!row.lessonEndAt) return start;
    const end = new Date(row.lessonEndAt);
    if (Number.isNaN(end.getTime())) return start;
    return `${start}~${pad(end.getHours())}:${pad(end.getMinutes())}`;
  }
  return row.lessonTimeText || '-';
};

const hasMissingColumn = (error: unknown, columnName: string) => {
  const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: string }).message) : '';
  return (
    message.includes(`'${columnName}' column`) ||
    message.includes(`"${columnName}" column`) ||
    message.includes(`column ${columnName}`) ||
    message.includes(`.${columnName}`) ||
    message.includes(`column "${columnName}"`)
  );
};

const uniqueNumbers = (values: Array<number | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is number => Number.isFinite(value ?? NaN))));

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => (value ?? '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

async function fetchBookingsByClassIds(classIds: number[], scope: { isAllBranches: boolean; branchId: number }) {
  if (classIds.length === 0) return [];
  let includeBranch = true;

  const run = async (includeBranch: boolean, orderColumn: 'createdAt' | 'id') => {
    let query = supabase
      .from('lesson_bookings')
      .select('*')
      .in('scheduleId', classIds);

    if (includeBranch && !scope.isAllBranches) {
      query = query.eq('branchId', scope.branchId);
    }

    return query.order(orderColumn, { ascending: false });
  };

  let result = await run(includeBranch, 'createdAt');
  if (result.error && hasMissingColumn(result.error, 'branchId')) {
    includeBranch = false;
    result = await run(includeBranch, 'createdAt');
  }
  if (result.error && hasMissingColumn(result.error, 'createdAt')) result = await run(includeBranch, 'id');
  if (result.error) throw result.error;
  return (result.data ?? []) as RawRecord[];
}

async function fetchBookingsByCreatedAt(startDate: string, endDate: string, scope: { isAllBranches: boolean; branchId: number }) {
  const start = `${startDate}T00:00:00`;
  const end = `${endDate}T23:59:59`;
  let includeBranch = true;

  const run = async (includeBranch: boolean, includeDate: boolean) => {
    let query = supabase.from('lesson_bookings').select('*');

    if (includeDate) {
      query = query.gte('createdAt', start).lte('createdAt', end);
    }

    if (includeBranch && !scope.isAllBranches) {
      query = query.eq('branchId', scope.branchId);
    }

    return query.order(includeDate ? 'createdAt' : 'id', { ascending: false }).limit(1000);
  };

  let result = await run(includeBranch, true);
  if (result.error && hasMissingColumn(result.error, 'branchId')) {
    includeBranch = false;
    result = await run(includeBranch, true);
  }
  if (result.error && hasMissingColumn(result.error, 'createdAt')) result = await run(includeBranch, false);
  if (result.error) throw result.error;
  return (result.data ?? []) as RawRecord[];
}

export default function ClassReservationsPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;
  const role = normalizeRole(currentUser?.role ?? 'readonly');
  const canDownload = hasFeature(currentUser?.role ?? 'readonly', 'excelDownload', isSuperAdmin);
  const canProcess = isSuperAdmin || ['primary', 'owner', 'manager', 'fc', 'staff'].includes(role);

  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [dateBasis, setDateBasis] = useState<DateBasis>('lesson');
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [instructorFilter, setInstructorFilter] = useState('ALL');
  const [searchValue, setSearchValue] = useState('');
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [scopeLabel, setScopeLabel] = useState('선택 지점');

  const loadReservations = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const scope = getBranchScope();
      setScopeLabel(scope.isAllBranches ? '전체 지점 (통합)' : `${scope.branchId}번 지점`);

      let classes: RawRecord[] = [];
      let bookings: RawRecord[] = [];

      if (dateBasis === 'lesson') {
        let classQuery = supabase
          .from('classes')
          .select('id, title, type, staffId, staffName, room, startTime, endTime, capacity, branchId')
          .gte('startTime', `${startDate}T00:00:00`)
          .lte('startTime', `${endDate}T23:59:59`)
          .order('startTime', { ascending: true });

        if (!scope.isAllBranches) {
          classQuery = classQuery.eq('branchId', scope.branchId);
        }

        const { data: classData, error: classError } = await classQuery;
        if (classError) throw classError;

        classes = (classData ?? []) as RawRecord[];
        bookings = await fetchBookingsByClassIds(uniqueNumbers(classes.map((row) => toNumber(row.id))), scope);
      } else {
        bookings = await fetchBookingsByCreatedAt(startDate, endDate, scope);
      }

      const scheduleIds = uniqueNumbers(bookings.map((row) => toNumber(row.scheduleId)));
      const loadedClassIds = new Set(classes.map((row) => toNumber(row.id)).filter(Boolean));
      const missingClassIds = scheduleIds.filter((id) => !loadedClassIds.has(id));

      if (missingClassIds.length > 0) {
        const { data: moreClasses } = await supabase
          .from('classes')
          .select('id, title, type, staffId, staffName, room, startTime, endTime, capacity, branchId')
          .in('id', missingClassIds);
        classes = [...classes, ...((moreClasses ?? []) as RawRecord[])];
      }

      const memberIds = uniqueNumbers(bookings.map((row) => toNumber(row.memberId)));
      const { data: members } = memberIds.length > 0
        ? await supabase.from('members').select('id, name, phone, branchId, staffId').in('id', memberIds)
        : { data: [] as RawRecord[] };

      const classMap = new Map(classes.map((row) => [toNumber(row.id), row]).filter(([id]) => id !== null) as Array<[number, RawRecord]>);
      const memberMap = new Map(((members ?? []) as RawRecord[]).map((row) => [toNumber(row.id), row]).filter(([id]) => id !== null) as Array<[number, RawRecord]>);
      const branchIds = uniqueNumbers([
        ...classes.map((row) => toNumber(row.branchId)),
        ...bookings.map((row) => toNumber(row.branchId)),
        ...((members ?? []) as RawRecord[]).map((row) => toNumber(row.branchId)),
      ]);
      const { data: branches } = branchIds.length > 0
        ? await supabase.from('branches').select('id, name').in('id', branchIds)
        : { data: [] as RawRecord[] };
      const branchMap = new Map(((branches ?? []) as RawRecord[]).map((row) => [toNumber(row.id), String(row.name ?? '')]).filter(([id]) => id !== null) as Array<[number, string]>);

      const mapped = bookings.map((booking) => {
        const bookingId = toNumber(booking.id);
        const scheduleId = toNumber(booking.scheduleId);
        const classRow = scheduleId ? classMap.get(scheduleId) : undefined;
        const memberId = toNumber(booking.memberId);
        const member = memberId ? memberMap.get(memberId) : undefined;
        const branchId = toNumber(booking.branchId) ?? toNumber(classRow?.branchId) ?? toNumber(member?.branchId);
        const className = String(classRow?.title ?? booking.className ?? booking.lessonName ?? '-');
        const classType = classRow?.type ?? booking.classType ?? booking.type ?? null;
        const lessonDate = booking.lessonDate ? String(booking.lessonDate).slice(0, 10) : null;
        const lessonStartAt = classRow?.startTime ?? booking.startTime ?? (lessonDate && booking.lessonTime ? `${lessonDate}T${String(booking.lessonTime).slice(0, 5)}:00` : lessonDate);

        return {
          id: String(booking.id),
          bookingId,
          scheduleId,
          branchId,
          branchName: String(booking.branchName ?? (branchId ? branchMap.get(branchId) : null) ?? (branchId ? `${branchId}번 지점` : '-')),
          reservedAt: booking.reservedAt ?? booking.bookedAt ?? booking.createdAt ?? null,
          lessonStartAt,
          lessonEndAt: classRow?.endTime ?? booking.endTime ?? null,
          lessonTimeText: booking.lessonTime ?? null,
          className,
          classType: classType ? String(classType) : null,
          sessionTypeLabel: formatLessonSessionType(deriveLessonSessionType(classType ? String(classType) : null, className)),
          staffName: String(classRow?.staffName ?? booking.trainerName ?? booking.staffName ?? '-'),
          memberId,
          memberName: String(member?.name ?? booking.memberName ?? '-'),
          memberPhone: String(member?.phone ?? booking.memberPhone ?? booking.phone ?? '-'),
          status: normalizeStatus(booking.status ?? null),
          statusRaw: booking.status ? String(booking.status) : null,
          cancelReason: booking.cancelReason ?? booking.cancel_reason ?? null,
          handledBy: String(booking.processedByName ?? booking.handlerName ?? booking.updatedByName ?? '-'),
          handledAt: booking.updatedAt ?? booking.cancelledAt ?? booking.attendedAt ?? null,
          duplicate: false,
        } satisfies ReservationRow;
      });

      const duplicateCount = new Map<string, number>();
      mapped.forEach((row) => {
        if (!row.scheduleId || !row.memberId || row.status === 'CANCELLED') return;
        const key = `${row.scheduleId}:${row.memberId}`;
        duplicateCount.set(key, (duplicateCount.get(key) ?? 0) + 1);
      });

      const filteredByDateAndScope = mapped
        .filter((row) => {
          const basisValue = dateBasis === 'lesson' ? row.lessonStartAt : row.reservedAt;
          const inDate = isWithinDateRange(basisValue, startDate, endDate);
          const inBranch = scope.isAllBranches || row.branchId === scope.branchId;
          return inDate && inBranch;
        })
        .map((row) => ({
          ...row,
          duplicate: row.scheduleId !== null && row.memberId !== null && (duplicateCount.get(`${row.scheduleId}:${row.memberId}`) ?? 0) > 1,
        }))
        .sort((a, b) => {
          const aTime = new Date(a.lessonStartAt ?? a.reservedAt ?? 0).getTime();
          const bTime = new Date(b.lessonStartAt ?? b.reservedAt ?? 0).getTime();
          return bTime - aTime;
        });

      setRows(filteredByDateAndScope);
    } catch (error) {
      const message = error instanceof Error ? error.message : '예약 목록을 불러오지 못했습니다.';
      setErrorMessage(message);
      toast.error('예약 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReservations();
  }, [dateBasis, startDate, endDate, currentUser?.branchId, currentUser?.currentBranchId, currentUser?.isSuperAdmin]);

  const classOptions = useMemo(() => uniqueStrings(rows.map((row) => row.className)), [rows]);
  const instructorOptions = useMemo(() => uniqueStrings(rows.map((row) => row.staffName)), [rows]);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const phoneQuery = normalizePhone(query);

    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;
      const matchesClass = classFilter === 'ALL' || row.className === classFilter;
      const matchesInstructor = instructorFilter === 'ALL' || row.staffName === instructorFilter;
      const matchesSearch = !query ||
        row.memberName.toLowerCase().includes(query) ||
        normalizePhone(row.memberPhone).includes(phoneQuery);

      return matchesStatus && matchesClass && matchesInstructor && matchesSearch;
    });
  }, [rows, statusFilter, classFilter, instructorFilter, searchValue]);

  const summary = useMemo(() => {
    const countBy = (status: ReservationStatus) => filteredRows.filter((row) => row.status === status).length;
    return {
      total: filteredRows.length,
      booked: countBy('BOOKED'),
      attended: countBy('ATTENDED'),
      cancelledAndNoShow: countBy('CANCELLED') + countBy('NOSHOW'),
      waitlist: countBy('WAITLIST'),
      duplicates: filteredRows.filter((row) => row.duplicate).length,
    };
  }, [filteredRows]);

  const updateReservationStatus = async (row: ReservationRow, nextStatus: 'ATTENDED' | 'CANCELLED' | 'NOSHOW') => {
    if (!row.bookingId) {
      toast.error('예약 ID를 확인할 수 없습니다.');
      return;
    }

    let cancelReason: string | null = null;
    if (nextStatus === 'CANCELLED') {
      const reason = window.prompt('예약 취소 사유를 입력하세요.');
      if (!reason || !reason.trim()) {
        toast.error('취소 사유는 필수입니다.');
        return;
      }
      cancelReason = reason.trim();
    }

    setProcessingId(row.id);
    const now = new Date().toISOString();
    const statusValue = nextStatus === 'NOSHOW' ? 'NOSHOW' : nextStatus;
    const payload: RawRecord = {
      status: statusValue,
      updatedAt: now,
    };
    if (cancelReason !== null) payload.cancelReason = cancelReason;

    try {
      let { error } = await supabase
        .from('lesson_bookings')
        .update(payload)
        .eq('id', row.bookingId);

      if (error && hasMissingColumn(error, 'updatedAt')) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.updatedAt;
        const fallback = await supabase
          .from('lesson_bookings')
          .update(fallbackPayload)
          .eq('id', row.bookingId);
        error = fallback.error;
      }

      if (error) throw error;

      await createAuditLog({
        action: AUDIT_ACTIONS.UPDATE,
        targetType: 'lesson_booking',
        targetId: row.bookingId,
        fromBranchId: row.branchId ?? undefined,
        beforeValue: {
          status: row.statusRaw ?? row.status,
          cancelReason: row.cancelReason,
        },
        afterValue: {
          status: statusValue,
          cancelReason,
        },
        detail: {
          message:
            nextStatus === 'ATTENDED' ? '예약 출석 처리됨' :
            nextStatus === 'CANCELLED' ? '예약 취소 처리됨' :
            '예약 노쇼 처리됨',
          memberId: row.memberId,
          memberName: row.memberName,
          className: row.className,
          scheduleId: row.scheduleId,
        },
      });

      toast.success(
        nextStatus === 'ATTENDED' ? '출석 처리되었습니다.' :
        nextStatus === 'CANCELLED' ? '예약이 취소되었습니다.' :
        '노쇼 처리되었습니다.'
      );
      await loadReservations();
    } catch (error) {
      const message = error instanceof Error ? error.message : '상태 변경에 실패했습니다.';
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadExcel = async () => {
    if (!canDownload) {
      toast.error('엑셀 다운로드 권한이 없습니다.');
      return;
    }

    exportToExcel(
      filteredRows.map((row) => ({
        reservedAt: formatDateTime(row.reservedAt),
        lessonTime: formatLessonTime(row),
        className: row.className,
        classType: row.classType ?? '',
        sessionType: row.sessionTypeLabel,
        staffName: row.staffName,
        memberName: row.memberName,
        memberPhone: row.memberPhone,
        branchName: row.branchName,
        status: STATUS_META[row.status].label,
        cancelReason: row.cancelReason ?? '',
        handledBy: row.handledBy,
        handledAt: formatDateTime(row.handledAt),
      })),
      [
        { key: 'reservedAt', header: '예약일시' },
        { key: 'lessonTime', header: '수업일시' },
        { key: 'className', header: '수업명' },
        { key: 'classType', header: '수업유형' },
        { key: 'sessionType', header: '강습유형' },
        { key: 'staffName', header: '강사' },
        { key: 'memberName', header: '회원명' },
        { key: 'memberPhone', header: '연락처' },
        { key: 'branchName', header: '지점' },
        { key: 'status', header: '상태' },
        { key: 'cancelReason', header: '취소사유' },
        { key: 'handledBy', header: '처리자' },
        { key: 'handledAt', header: '처리일시' },
      ],
      { filename: `예약목록_${startDate}_${endDate}`, sheetName: '예약 목록' }
    );

    await createAuditLog({
      action: AUDIT_ACTIONS.EXPORT,
      targetType: 'lesson_booking',
      fromBranchId: getBranchScope().isAllBranches ? undefined : getBranchScope().branchId,
      detail: {
        message: '예약 목록 엑셀 다운로드',
        startDate,
        endDate,
        dateBasis,
        statusFilter,
        classFilter,
        instructorFilter,
        rowCount: filteredRows.length,
      },
    });
  };

  const columns = [
    {
      key: 'reservedAt',
      header: '예약일시',
      width: 150,
      render: (_: string, row: ReservationRow) => (
        <span className="font-mono text-[12px] text-content-secondary">{formatDateTime(row.reservedAt)}</span>
      ),
    },
    {
      key: 'lessonStartAt',
      header: '수업일시',
      width: 170,
      render: (_: string, row: ReservationRow) => (
        <span className="font-mono text-[12px]">{formatLessonTime(row)}</span>
      ),
    },
    {
      key: 'className',
      header: '수업명',
      width: 220,
      render: (value: string, row: ReservationRow) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-content">{value}</span>
            {row.duplicate && (
              <span title="동일 회원이 동일 수업에 중복 예약된 의심 건입니다.">
                <AlertTriangle size={14} className="text-amber-500" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge variant="secondary" label={row.classType ?? '유형 없음'} />
            <StatusBadge variant="mint" label={row.sessionTypeLabel} />
          </div>
        </div>
      ),
    },
    {
      key: 'staffName',
      header: '강사',
      width: 110,
      render: (value: string) => <span className="text-[12px] text-content-secondary">{value}</span>,
    },
    {
      key: 'memberName',
      header: '회원',
      width: 150,
      render: (value: string, row: ReservationRow) => (
        <button
          type="button"
          className="text-left font-semibold text-primary hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            if (row.memberId) router.push(`/members/detail?id=${row.memberId}&tab=reservation`);
          }}
        >
          {value}
        </button>
      ),
    },
    {
      key: 'memberPhone',
      header: '연락처',
      width: 130,
      render: (value: string) => <span className="font-mono text-[12px]">{value || '-'}</span>,
    },
    {
      key: 'branchName',
      header: '지점',
      width: 120,
      render: (value: string) => <span className="text-[12px] text-content-secondary">{value}</span>,
    },
    {
      key: 'status',
      header: '상태',
      align: 'center' as const,
      width: 110,
      render: (_: ReservationStatus, row: ReservationRow) => {
        const meta = STATUS_META[row.status];
        return <StatusBadge variant={meta.variant} label={meta.label} dot />;
      },
    },
    {
      key: 'cancelReason',
      header: '취소사유',
      width: 170,
      render: (value: string | null) => (
        <span className="line-clamp-2 text-[12px] text-content-secondary">{value || '-'}</span>
      ),
    },
    {
      key: 'handledAt',
      header: '처리일시',
      width: 150,
      render: (_: string, row: ReservationRow) => (
        <div className="space-y-0.5 text-[12px] text-content-secondary">
          <div>{row.handledBy}</div>
          <div className="font-mono">{formatDateTime(row.handledAt)}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '처리',
      align: 'center' as const,
      width: 190,
      render: (_: unknown, row: ReservationRow) => {
        const disabled = !canProcess || processingId === row.id || row.status === 'CANCELLED';
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={disabled || row.status === 'ATTENDED'}
              onClick={(event) => {
                event.stopPropagation();
                void updateReservationStatus(row, 'ATTENDED');
              }}
            >
              출석
            </button>
            <button
              type="button"
              className="rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={disabled || row.status === 'NOSHOW'}
              onClick={(event) => {
                event.stopPropagation();
                void updateReservationStatus(row, 'NOSHOW');
              }}
            >
              노쇼
            </button>
            <button
              type="button"
              className="rounded-xl border border-line bg-white px-2 py-1 text-[11px] font-semibold text-content-secondary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
              disabled={disabled || row.status === 'ATTENDED' || row.status === 'NOSHOW'}
              onClick={(event) => {
                event.stopPropagation();
                void updateReservationStatus(row, 'CANCELLED');
              }}
            >
              취소
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="예약 목록"
        description="전체 수업 예약을 예약 1건 단위로 조회하고 회원명·연락처, 수업, 강사, 상태 기준으로 검색합니다."
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-line/80 bg-white px-4 py-2 text-[13px] font-semibold text-content-secondary shadow-sm transition-colors hover:bg-surface-secondary"
            onClick={() => void loadReservations()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-md xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr_1fr]">
          <label className="flex flex-col gap-xs text-[12px] font-semibold text-content-secondary">
            조회 범위
            <div className="app-control flex h-[42px] items-center rounded-2xl px-3 text-[13px] text-content">
              {scopeLabel}
            </div>
          </label>
          <label className="flex flex-col gap-xs text-[12px] font-semibold text-content-secondary">
            기간 기준
            <select
              className="app-control h-[42px] rounded-2xl px-3 text-[13px]"
              value={dateBasis}
              onChange={(event) => setDateBasis(event.target.value as DateBasis)}
            >
              <option value="lesson">수업일 기준</option>
              <option value="reserved">예약일 기준</option>
            </select>
          </label>
          <label className="flex flex-col gap-xs text-[12px] font-semibold text-content-secondary">
            시작일
            <input
              type="date"
              className="app-control h-[42px] rounded-2xl px-3 text-[13px]"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-xs text-[12px] font-semibold text-content-secondary">
            종료일
            <input
              type="date"
              className="app-control h-[42px] rounded-2xl px-3 text-[13px]"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-xs text-[12px] font-semibold text-content-secondary">
            수업
            <select
              className="app-control h-[42px] rounded-2xl px-3 text-[13px]"
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
            >
              <option value="ALL">전체 수업</option>
              {classOptions.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-xs text-[12px] font-semibold text-content-secondary">
            강사
            <select
              className="app-control h-[42px] rounded-2xl px-3 text-[13px]"
              value={instructorFilter}
              onChange={(event) => setInstructorFilter(event.target.value)}
            >
              <option value="ALL">전체 강사</option>
              {instructorOptions.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-md flex flex-wrap items-center gap-sm">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-2xl border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                statusFilter === option.value
                  ? 'border-primary bg-primary text-white'
                  : 'border-line bg-white text-content-secondary hover:bg-surface-secondary'
              }`}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {errorMessage && (
        <div className="mb-lg rounded-2xl border border-red-200 bg-red-50 px-lg py-md text-[13px] text-red-700">
          예약 목록 조회 오류: {errorMessage}
        </div>
      )}

      <StatCardGrid cols={5} className="mb-xl">
        <StatCard label="전체 예약" value={`${summary.total}건`} icon={<CalendarCheck />} loading={loading} />
        <StatCard label="예약완료" value={`${summary.booked}건`} icon={<Clock />} variant="peach" loading={loading} />
        <StatCard label="출석완료" value={`${summary.attended}건`} icon={<CheckCircle2 />} variant="mint" loading={loading} />
        <StatCard label="취소·노쇼" value={`${summary.cancelledAndNoShow}건`} icon={<XCircle />} loading={loading} />
        <StatCard label="대기 / 중복의심" value={`${summary.waitlist} / ${summary.duplicates}`} icon={<Users />} loading={loading} />
      </StatCardGrid>

      <DataTable
        title="예약 원장"
        columns={columns}
        data={filteredRows}
        loading={loading}
        emptyMessage="조건에 맞는 예약이 없습니다."
        onSearch={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="회원명 또는 연락처 검색"
        onDownloadExcel={canDownload ? () => void handleDownloadExcel() : undefined}
      />

      {!canProcess && (
        <div className="mt-md flex items-center gap-2 text-[12px] text-content-tertiary">
          <UserCheck size={14} />
          현재 계정은 예약 상태 변경 권한이 없어 조회만 가능합니다.
        </div>
      )}
    </AppLayout>
  );
}
