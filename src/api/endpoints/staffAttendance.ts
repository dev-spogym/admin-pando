// 직원 근태(staff_attendance) API
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

export type AttendanceStatus = '정상' | '지각' | '조퇴' | '결근' | '연차' | '휴무';

export interface StaffAttendanceItem {
  id: number;
  staffId: number;
  staffName: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  workMinutes: number | null;
  status: AttendanceStatus;
  memo: string;
  branchId: number;
}

// 특정 날짜 근태 목록 조회
export async function getStaffAttendance(branchId?: number, date?: string): Promise<{ data: StaffAttendanceItem[] | null; error: string | null }> {
  const bid = branchId ?? getBranchId();
  let query = supabase
    .from('staff_attendance')
    .select('*')
    .eq('branchId', bid);

  if (date) query = query.gte('clockIn', `${date}T00:00:00`).lte('clockIn', `${date}T23:59:59`);

  const { data, error } = await query.order('staffName', { ascending: true });

  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      staffId: row.staffId as number,
      staffName: (row.staffName as string) ?? '',
      date: row.clockIn ? (row.clockIn as string).slice(0, 10) : (date ?? ''),
      clockIn: row.clockIn ? (row.clockIn as string).slice(11, 16) : null,
      clockOut: row.clockOut ? (row.clockOut as string).slice(11, 16) : null,
      workMinutes: row.workMinutes != null ? Number(row.workMinutes) : null,
      status: (row.status as AttendanceStatus) ?? '정상',
      memo: (row.memo as string) ?? '',
      branchId: row.branchId as number,
    })),
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
      clockIn: now,
      branchId: getBranchId(),
      status: '정상',
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
    .update({ clockOut: now.toISOString(), workMinutes })
    .eq('id', attendanceId);

  return { error: error?.message ?? null };
}

// 근태 수정
export async function updateStaffAttendance(id: number, data: Partial<{
  clockIn: string;
  clockOut: string;
  status: AttendanceStatus;
  memo: string;
}>): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (data.clockIn !== undefined) payload.clockIn = data.clockIn;
  if (data.clockOut !== undefined) payload.clockOut = data.clockOut;
  if (data.status !== undefined) payload.status = data.status;
  if (data.memo !== undefined) payload.memo = data.memo;

  const { error } = await supabase.from('staff_attendance').update(payload).eq('id', id);
  return { error: error?.message ?? null };
}
