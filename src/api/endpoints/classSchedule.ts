/**
 * 그룹수업 시간표(일괄 등록) 관련 API 함수 - Supabase 연동
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse } from '../types';
import { AUDIT_ACTIONS, createAuditLog } from './auditLog';

/** branchId 가져오기 */
const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 수업 일정 행 */
export interface ClassRow {
  branchId: number;
  staffId: number;
  staffName: string;
  title: string;
  type: string;
  startTime: string;  // ISO datetime
  endTime: string;    // ISO datetime
  capacity: number;
  booked: number;
  room: string | null;
  isRecurring: boolean;
  lesson_status: string;
  targetType: string;
  approvalStatus: string;
}

/** 일괄 생성 입력 */
export interface BulkClassInput {
  templateId: number | null;
  templateName: string;
  instructorId: number | null;
  weekdays: number[]; // 0=일,1=월,...,6=토
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  capacity: number;
  room: string;
}

/** YYYY-MM-DD 문자열 → Date */
const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** 날짜 + HH:mm → ISO datetime 문자열 */
const toISO = (date: Date, time: string): string => {
  const [h, min] = time.split(':').map(Number);
  const dt = new Date(date);
  dt.setHours(h, min, 0, 0);
  return dt.toISOString();
};

const resolveStaff = async (branchId: number, instructorId: number | null): Promise<{ id: number; name: string }> => {
  if (instructorId) {
    const { data } = await supabase
      .from('staff')
      .select('id,name')
      .eq('id', instructorId)
      .maybeSingle();
    if (data) return { id: data.id as number, name: (data.name as string | null) ?? '담당자 미지정' };
  }

  const { data } = await supabase
    .from('staff')
    .select('id,name')
    .eq('branchId', branchId)
    .eq('isActive', true)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data) return { id: data.id as number, name: (data.name as string | null) ?? '담당자 미지정' };
  return { id: 1, name: '담당자 미지정' };
};

/**
 * 선택 요일 × 기간 범위로 수업 일괄 생성
 * @returns 생성된 수업 수
 */
export const bulkCreateClasses = async (
  input: BulkClassInput,
  branchId?: number
): Promise<ApiResponse<number>> => {
  const resolvedBranchId = branchId ?? getBranchId();

  const start = parseDate(input.periodStart);
  const end = parseDate(input.periodEnd);

  if (start > end) {
    return { success: false, data: 0, message: '시작일이 종료일보다 늦습니다.' };
  }

  const staff = await resolveStaff(resolvedBranchId, input.instructorId);
  const rows: ClassRow[] = [];
  const cur = new Date(start);

  while (cur <= end) {
    // cur.getDay(): 0=일,1=월,...,6=토
    if (input.weekdays.includes(cur.getDay())) {
      rows.push({
        branchId: resolvedBranchId,
        staffId: staff.id,
        staffName: staff.name,
        title: input.templateName,
        type: 'GX',
        startTime: toISO(cur, input.startTime),
        endTime: toISO(cur, input.endTime),
        capacity: input.capacity,
        booked: 0,
        room: input.room || null,
        isRecurring: false,
        lesson_status: 'scheduled',
        targetType: 'class',
        approvalStatus: 'approved',
      });
    }
    cur.setDate(cur.getDate() + 1);
  }

  if (rows.length === 0) {
    return { success: false, data: 0, message: '생성할 수업이 없습니다. 요일과 기간을 확인하세요.' };
  }

  try {
    const { error } = await supabase.from('classes').insert(rows);
    if (error) throw new Error(error.message);
    await createAuditLog({
      action: AUDIT_ACTIONS.CREATE,
      targetType: 'lesson',
      fromBranchId: resolvedBranchId,
      afterValue: {
        count: rows.length,
        title: input.templateName,
        staffId: staff.id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
      detail: { message: '레슨 시간표 일괄 생성됨' },
    });
    return { success: true, data: rows.length, message: `${rows.length}개 수업이 생성되었습니다.` };
  } catch (err) {
    console.error('bulkCreateClasses 오류:', err);
    throw err;
  }
};

/** 수업 목록 조회 (기간 필터) */
export const getClasses = async (
  branchId?: number,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<any[]>> => {
  const resolvedBranchId = branchId ?? getBranchId();
  try {
    let query = supabase
      .from('classes')
      .select('*, users(name)')
      .eq('branchId', resolvedBranchId)
      .order('startTime', { ascending: true });
    if (startDate) query = query.gte('startTime', startDate);
    if (endDate) query = query.lte('startTime', endDate);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      startAt: row.startTime,
      endAt: row.endTime,
    }));
    return { success: true, data: rows };
  } catch (err) {
    console.error('getClasses 오류:', err);
    throw err;
  }
};

/** 수업 일괄 수정 */
export const bulkUpdateClasses = async (
  ids: number[],
  updates: Record<string, any>
): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase
      .from('classes')
      .update(updates)
      .in('id', ids);
    if (error) throw new Error(error.message);
    await createAuditLog({
      action: AUDIT_ACTIONS.UPDATE,
      targetType: 'lesson',
      afterValue: { ids, updates },
      detail: { message: '레슨 시간표 일괄 수정됨', count: ids.length },
    });
    return { success: true, data: null, message: `${ids.length}개 수업이 수정되었습니다.` };
  } catch (err) {
    console.error('bulkUpdateClasses 오류:', err);
    throw err;
  }
};

/** 수업 일괄 삭제 */
export const bulkDeleteClasses = async (ids: number[]): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase.from('classes').delete().in('id', ids);
    if (error) throw new Error(error.message);
    await createAuditLog({
      action: AUDIT_ACTIONS.DELETE,
      targetType: 'lesson',
      beforeValue: { ids },
      detail: { message: '레슨 시간표 일괄 삭제됨', count: ids.length },
    });
    return { success: true, data: null, message: `${ids.length}개 수업이 삭제되었습니다.` };
  } catch (err) {
    console.error('bulkDeleteClasses 오류:', err);
    throw err;
  }
};
