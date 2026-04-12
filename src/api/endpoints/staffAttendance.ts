// 직원 근태(staff_attendance) API
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => {
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
    .eq('branch_id', bid);

  if (date) query = query.gte('clock_in', `${date}T00:00:00`).lte('clock_in', `${date}T23:59:59`);

  const { data, error } = await query.order('staff_name', { ascending: true });

  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      staffId: row.staff_id as number,
      staffName: (row.staff_name as string) ?? '',
      date: row.clock_in ? (row.clock_in as string).slice(0, 10) : (date ?? ''),
      clockIn: row.clock_in ? (row.clock_in as string).slice(11, 16) : null,
      clockOut: row.clock_out ? (row.clock_out as string).slice(11, 16) : null,
      workMinutes: row.work_hours != null ? Number(row.work_hours) * 60 : null,
      status: (row.status as AttendanceStatus) ?? '정상',
      memo: (row.notes as string) ?? '',
      branchId: row.branch_id as number,
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
      staff_id: staffId,
      staff_name: staffName,
      clock_in: now,
      branch_id: getBranchId(),
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
    .select('clock_in')
    .eq('id', attendanceId)
    .single();

  const now = new Date();
  const clockInTime = existing?.clock_in ? new Date(existing.clock_in as string) : null;
  const workHours = clockInTime ? Math.round((now.getTime() - clockInTime.getTime()) / 3600000 * 100) / 100 : null;

  const { error } = await supabase
    .from('staff_attendance')
    .update({ clock_out: now.toISOString(), work_hours: workHours })
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
  // camelCase → snake_case 변환
  const payload: Record<string, unknown> = {};
  if (data.clockIn !== undefined) payload.clock_in = data.clockIn;
  if (data.clockOut !== undefined) payload.clock_out = data.clockOut;
  if (data.status !== undefined) payload.status = data.status;
  if (data.memo !== undefined) payload.notes = data.memo;

  const { error } = await supabase.from('staff_attendance').update(payload).eq('id', id);
  return { error: error?.message ?? null };
}
