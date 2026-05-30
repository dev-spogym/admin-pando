// 직원 근태(staff_attendance) API
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

export type AttendanceStatus = '정상' | '지각' | '결근' | '조퇴' | '외근' | '휴가';

// 근태 출처 배지 4종 (PAY-STF-01-06)
export type AttendanceSource = '키오스크' | 'IoT' | '수동 보정' | '누락 추가';

// 보정 이력 항목
export interface AttendanceCorrection {
  at: string;       // 보정 일시
  by: string;       // 보정자
  reason: string;   // 보정 사유
  before: string;   // 변경 전 요약
  after: string;    // 변경 후 요약
}

export interface StaffAttendanceItem {
  id: number;
  staffId: number;
  staffName: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  workMinutes: number | null;
  status: AttendanceStatus;
  source: AttendanceSource;
  corrections: AttendanceCorrection[];
  memo: string;
  branchId: number;
}

const STATUS_TO_KO: Record<string, AttendanceStatus> = {
  normal: '정상',
  late: '지각',
  early_leave: '조퇴',
  absent: '결근',
  정상: '정상',
  지각: '지각',
  결근: '결근',
  조퇴: '조퇴',
  외근: '외근',
  휴가: '휴가',
};

const toDateOnly = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string' && value.length >= 10) return value.slice(0, 10);
  return fallback;
};

const toTimeOnly = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value) return null;
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  if (value.length >= 16) return value.slice(11, 16);
  return null;
};

const combineDateTime = (date: string, time?: string | null): string | null => {
  if (!time) return null;
  if (time.includes('T')) return time;
  const normalized = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  return `${date}T${normalized}`;
};

const calculateWorkMinutes = (clockIn?: string | null, clockOut?: string | null): number | null => {
  if (!clockIn || !clockOut) return null;
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.round((end.getTime() - start.getTime()) / 60000);
};

const mapAttendanceRow = (row: Record<string, unknown>, fallbackDate = ''): StaffAttendanceItem => {
  const date = toDateOnly(row.date ?? row.clockIn, fallbackDate);
  const workMinutes =
    row.workMinutes != null
      ? Number(row.workMinutes)
      : row.workHours != null
        ? Math.round(Number(row.workHours) * 60)
        : null;

  return {
    id: row.id as number,
    staffId: row.staffId as number,
    staffName: (row.staffName as string) ?? '',
    date,
    clockIn: toTimeOnly(row.clockIn),
    clockOut: toTimeOnly(row.clockOut),
    workMinutes,
    status: STATUS_TO_KO[String(row.status ?? '정상')] ?? '정상',
    source: ((row.source as AttendanceSource) ?? '키오스크'),
    corrections: Array.isArray(row.corrections) ? (row.corrections as AttendanceCorrection[]) : [],
    memo: (row.memo as string) ?? (row.notes as string) ?? '',
    branchId: row.branchId as number,
  };
};

// 특정 날짜 근태 목록 조회
export async function getStaffAttendance(branchId?: number, date?: string): Promise<{ data: StaffAttendanceItem[] | null; error: string | null }> {
  const bid = branchId ?? getBranchId();
  let query = supabase
    .from('staff_attendance')
    .select('*')
    .eq('branchId', bid);

  if (date) query = query.eq('date', date);

  const { data, error } = await query.order('staffName', { ascending: true });

  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []).map((row: Record<string, unknown>) => mapAttendanceRow(row, date)),
    error: null,
  };
}

// 출근 기록
export async function clockIn(staffId: number, staffName: string, date: string): Promise<{ id: number | null; error: string | null }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('staff_attendance')
    .insert({
      staffId: staffId,
      staffName: staffName,
      date,
      clockIn: now,
      branchId: getBranchId(),
      status: '정상',
      source: '키오스크',
    })
    .select('id')
    .single();

  if (error) return { id: null, error: error.message };
  return { id: (data as { id: number }).id, error: null };
}

// 퇴근 기록
export async function clockOut(staffId: number, attendanceId: number): Promise<{ error: string | null }> {
  const { data: existing } = await supabase
    .from('staff_attendance')
    .select('clockIn')
    .eq('id', attendanceId)
    .single();

  const now = new Date();
  const clockInTime = existing?.clockIn ? new Date(existing.clockIn as string) : null;
  const workMinutes = clockInTime ? Math.round((now.getTime() - clockInTime.getTime()) / 60000) : null;

  const { error } = await supabase
    .from('staff_attendance')
    .update({ clockOut: now.toISOString(), workMinutes, workHours: workMinutes == null ? null : Number((workMinutes / 60).toFixed(1)) })
    .eq('id', attendanceId);

  return { error: error?.message ?? null };
}

// 누락 근태 추가
export async function createStaffAttendance(data: {
  staffId: number;
  staffName: string;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  status: AttendanceStatus;
  source?: AttendanceSource;
  corrections?: AttendanceCorrection[];
  memo?: string;
  branchId?: number;
}): Promise<{ data: StaffAttendanceItem | null; error: string | null }> {
  const clockInValue = combineDateTime(data.date, data.clockIn);
  const clockOutValue = combineDateTime(data.date, data.clockOut);
  const workMinutes = calculateWorkMinutes(clockInValue, clockOutValue);
  const { data: inserted, error } = await supabase
    .from('staff_attendance')
    .insert({
      staffId: data.staffId,
      staffName: data.staffName,
      date: data.date,
      clockIn: clockInValue,
      clockOut: clockOutValue,
      status: data.status,
      source: data.source ?? '누락 추가',
      corrections: data.corrections ?? [],
      memo: data.memo ?? null,
      notes: data.memo ?? null,
      workMinutes,
      workHours: workMinutes == null ? null : Number((workMinutes / 60).toFixed(1)),
      branchId: data.branchId ?? getBranchId(),
    })
    .select('*')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: mapAttendanceRow(inserted as Record<string, unknown>, data.date), error: null };
}

// 근태 수정
export async function updateStaffAttendance(id: number, data: Partial<{
  date: string;
  clockIn: string;
  clockOut: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  corrections: AttendanceCorrection[];
  memo: string;
}>): Promise<{ data: StaffAttendanceItem | null; error: string | null }> {
  const { data: existing, error: fetchError } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) return { data: null, error: fetchError.message };

  const existingRow = existing as Record<string, unknown>;
  const date = data.date ?? toDateOnly(existingRow.date ?? existingRow.clockIn);
  const nextClockIn = data.clockIn !== undefined ? combineDateTime(date, data.clockIn) : existingRow.clockIn as string | null;
  const nextClockOut = data.clockOut !== undefined ? combineDateTime(date, data.clockOut) : existingRow.clockOut as string | null;
  const workMinutes = calculateWorkMinutes(nextClockIn, nextClockOut);
  const payload: Record<string, unknown> = {};
  if (data.date !== undefined) payload.date = data.date;
  if (data.clockIn !== undefined) payload.clockIn = nextClockIn;
  if (data.clockOut !== undefined) payload.clockOut = nextClockOut;
  if (data.status !== undefined) payload.status = data.status;
  if (data.source !== undefined) payload.source = data.source;
  if (data.corrections !== undefined) payload.corrections = data.corrections;
  if (data.memo !== undefined) {
    payload.memo = data.memo;
    payload.notes = data.memo;
  }
  payload.workMinutes = workMinutes;
  payload.workHours = workMinutes == null ? null : Number((workMinutes / 60).toFixed(1));

  const { data: updated, error } = await supabase
    .from('staff_attendance')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: mapAttendanceRow(updated as Record<string, unknown>, date), error: null };
}
