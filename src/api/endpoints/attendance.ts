/**
 * 출석 관련 API 함수 (Supabase 연동)
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** branchId 가져오기 */
const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 출석 기록 */
export interface Attendance {
  id: number;
  memberId: number;
  memberName: string;
  checkInAt: string;
  checkOutAt?: string;
  type: 'REGULAR' | 'PT' | 'GX' | 'MANUAL';
  checkInMethod: 'KIOSK' | 'APP' | 'MANUAL';
  isOtherBranch?: boolean;
  phone?: string;
  branchId: number;
}

/** 출석 생성 요청 */
export interface AttendanceRequest {
  memberId: number;
  memberName: string;
  type: 'REGULAR' | 'PT' | 'GX' | 'MANUAL';
  checkInMethod?: 'KIOSK' | 'APP' | 'MANUAL';
  phone?: string;
}

/** 체크아웃 요청 */
export interface CheckOutRequest {
  checkOutAt?: string;
}

/** 출석 통계 */
export interface AttendanceStats {
  todayTotal: number;
  currentlyIn: number;
  thisMonthTotal: number;
}

/** 출석 목록 조회 */
export const getAttendance = async (
  params?: PaginationParams & { date?: string; memberId?: number }
): Promise<ApiResponse<PaginatedResponse<Attendance>>> => {
  try {
    const page = params?.page ?? 1;
    const size = params?.size ?? 20;
    const from = (page - 1) * size;
    const to = from + size - 1;

    let query = supabase
      .from('attendance')
      .select('*', { count: 'exact' })
      .eq('branchId', getBranchId())
      .order('checkInAt', { ascending: false })
      .range(from, to);

    if (params?.date) {
      const dateStart = `${params.date}T00:00:00`;
      const dateEnd = `${params.date}T23:59:59`;
      query = query.gte('checkInAt', dateStart).lte('checkInAt', dateEnd);
    }

    if (params?.memberId) {
      query = query.eq('memberId', params.memberId);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;
    return {
      success: true,
      data: {
        data: (data ?? []) as Attendance[],
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '출석 목록 조회에 실패했습니다.';
    return { success: false, data: { data: [], pagination: { page: 1, size: 20, total: 0, totalPages: 0 } }, message };
  }
};

/** 체크인 기록 생성 */
export const createAttendance = async (data: AttendanceRequest): Promise<ApiResponse<Attendance>> => {
  try {
    const { data: inserted, error } = await supabase
      .from('attendance')
      .insert({
        memberId: data.memberId,
        memberName: data.memberName,
        checkInAt: new Date().toISOString(),
        type: data.type,
        checkInMethod: data.checkInMethod ?? 'MANUAL',
        phone: data.phone,
        isOtherBranch: false,
        branchId: getBranchId(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: inserted as Attendance,
      message: '체크인이 기록되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '체크인 기록에 실패했습니다.';
    return { success: false, data: null as unknown as Attendance, message };
  }
};

/** 체크아웃 처리 */
export const checkOut = async (
  attendanceId: number,
  data?: CheckOutRequest
): Promise<ApiResponse<Attendance>> => {
  try {
    const { data: updated, error } = await supabase
      .from('attendance')
      .update({ checkOutAt: data?.checkOutAt ?? new Date().toISOString() })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Attendance,
      message: '체크아웃이 기록되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '체크아웃 기록에 실패했습니다.';
    return { success: false, data: null as unknown as Attendance, message };
  }
};

/** 퇴장 처리 — checkOutAt을 현재 시각으로 업데이트 */
export const checkOutMember = async (attendanceId: number): Promise<ApiResponse<Attendance>> => {
  return checkOut(attendanceId, { checkOutAt: new Date().toISOString() });
};

/** 출석 통계 조회 */
export const getAttendanceStats = async (): Promise<ApiResponse<AttendanceStats>> => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';

    const [todayRes, currentlyInRes, monthRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('branchId', getBranchId())
        .gte('checkInAt', `${today}T00:00:00`)
        .lte('checkInAt', `${today}T23:59:59`),
      supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('branchId', getBranchId())
        .gte('checkInAt', `${today}T00:00:00`)
        .is('checkOutAt', null),
      supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('branchId', getBranchId())
        .gte('checkInAt', `${monthStart}T00:00:00`),
    ]);

    return {
      success: true,
      data: {
        todayTotal: todayRes.count ?? 0,
        currentlyIn: currentlyInRes.count ?? 0,
        thisMonthTotal: monthRes.count ?? 0,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '출석 통계 조회에 실패했습니다.';
    return { success: false, data: { todayTotal: 0, currentlyIn: 0, thisMonthTotal: 0 }, message };
  }
};
