/**
 * 수업 관리 관련 API 함수 - Supabase 연동
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse } from '../types';

/** branchId 가져오기 */
const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 수업 정보 */
export interface Lesson {
  id: number;
  branchId: number;
  name: string;
  type: string;
  instructorId?: number;
  instructorName?: string;
  capacity?: number;
  duration?: number;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 수업 생성/수정 요청 */
export interface LessonRequest {
  branchId?: number;
  name: string;
  type: string;
  instructorId?: number;
  instructorName?: string;
  capacity?: number;
  duration?: number;
  color?: string;
}

/** 수업 일정 */
export interface LessonSchedule {
  id: number;
  lessonId: number;
  branchId: number;
  instructorId?: number;
  startAt: string;
  endAt: string;
  capacity?: number;
  currentCount?: number;
  status?: string;
  createdAt?: string;
}

/** 수업 일정 생성/수정 요청 */
export interface ScheduleRequest {
  lessonId: number;
  branchId?: number;
  instructorId?: number;
  startAt: string;
  endAt: string;
  capacity?: number;
}

/** 예약 정보 */
export interface Booking {
  id: number;
  scheduleId: number;
  memberId: number;
  memberName: string;
  status: 'BOOKED' | 'ATTENDED' | 'CANCELLED' | 'NOSHOW';
  cancelReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 예약 생성 요청 */
export interface BookingRequest {
  scheduleId: number;
  memberId: number;
  memberName: string;
}

/** 수업 목록 조회 */
export const getLessons = async (branchId?: number): Promise<ApiResponse<Lesson[]>> => {
  const resolvedBranchId = branchId ?? getBranchId();

  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('branchId', resolvedBranchId)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return { success: true, data: (data ?? []) as Lesson[] };
  } catch (err) {
    console.error('getLessons 오류:', err);
    throw err;
  }
};

/** 수업 생성 */
export const createLesson = async (payload: LessonRequest): Promise<ApiResponse<Lesson>> => {
  const branchId = payload.branchId ?? getBranchId();

  try {
    const { data, error } = await supabase
      .from('lessons')
      .insert({ ...payload, branchId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as Lesson, message: '수업이 등록되었습니다.' };
  } catch (err) {
    console.error('createLesson 오류:', err);
    throw err;
  }
};

/** 수업 수정 */
export const updateLesson = async (
  id: number,
  payload: Partial<LessonRequest>
): Promise<ApiResponse<Lesson>> => {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as Lesson, message: '수업이 수정되었습니다.' };
  } catch (err) {
    console.error('updateLesson 오류:', err);
    throw err;
  }
};

/** 수업 삭제 */
export const deleteLesson = async (id: number): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true, data: null, message: '수업이 삭제되었습니다.' };
  } catch (err) {
    console.error('deleteLesson 오류:', err);
    throw err;
  }
};

/** 수업 일정 목록 조회 */
export const getLessonSchedules = async (
  branchId?: number,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<LessonSchedule[]>> => {
  const resolvedBranchId = branchId ?? getBranchId();

  try {
    let query = supabase
      .from('lesson_schedules')
      .select('*')
      .eq('branchId', resolvedBranchId)
      .order('startAt', { ascending: true });

    if (startDate) query = query.gte('startAt', startDate);
    if (endDate) query = query.lte('startAt', endDate);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { success: true, data: (data ?? []) as LessonSchedule[] };
  } catch (err) {
    console.error('getLessonSchedules 오류:', err);
    throw err;
  }
};

/** 수업 일정 생성 */
export const createSchedule = async (
  payload: ScheduleRequest
): Promise<ApiResponse<LessonSchedule>> => {
  const branchId = payload.branchId ?? getBranchId();

  try {
    const { data, error } = await supabase
      .from('lesson_schedules')
      .insert({ ...payload, branchId, currentCount: 0, status: 'OPEN' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as LessonSchedule, message: '일정이 등록되었습니다.' };
  } catch (err) {
    console.error('createSchedule 오류:', err);
    throw err;
  }
};

/** 수업 일정 수정 */
export const updateSchedule = async (
  id: number,
  payload: Partial<ScheduleRequest>
): Promise<ApiResponse<LessonSchedule>> => {
  try {
    const { data, error } = await supabase
      .from('lesson_schedules')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as LessonSchedule, message: '일정이 수정되었습니다.' };
  } catch (err) {
    console.error('updateSchedule 오류:', err);
    throw err;
  }
};

/** 수업 일정 삭제 */
export const deleteSchedule = async (id: number): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase.from('lesson_schedules').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true, data: null, message: '일정이 삭제되었습니다.' };
  } catch (err) {
    console.error('deleteSchedule 오류:', err);
    throw err;
  }
};

/** 예약 목록 조회 */
export const getBookings = async (scheduleId: number): Promise<ApiResponse<Booking[]>> => {
  try {
    const { data, error } = await supabase
      .from('lesson_bookings')
      .select('*')
      .eq('scheduleId', scheduleId)
      .order('createdAt', { ascending: true });

    if (error) throw new Error(error.message);
    return { success: true, data: (data ?? []) as Booking[] };
  } catch (err) {
    console.error('getBookings 오류:', err);
    throw err;
  }
};

/** 예약 생성 */
export const createBooking = async (payload: BookingRequest): Promise<ApiResponse<Booking>> => {
  try {
    const { data, error } = await supabase
      .from('lesson_bookings')
      .insert({ ...payload, status: 'BOOKED' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as Booking, message: '예약이 완료되었습니다.' };
  } catch (err) {
    console.error('createBooking 오류:', err);
    throw err;
  }
};

/** 예약 취소 */
export const cancelBooking = async (
  id: number,
  reason?: string
): Promise<ApiResponse<Booking>> => {
  try {
    const { data, error } = await supabase
      .from('lesson_bookings')
      .update({ status: 'CANCELLED', cancelReason: reason ?? null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as Booking, message: '예약이 취소되었습니다.' };
  } catch (err) {
    console.error('cancelBooking 오류:', err);
    throw err;
  }
};

/** 출석 처리 */
export const attendBooking = async (id: number): Promise<ApiResponse<Booking>> => {
  try {
    const { data, error } = await supabase
      .from('lesson_bookings')
      .update({ status: 'ATTENDED' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as Booking, message: '출석 처리되었습니다.' };
  } catch (err) {
    console.error('attendBooking 오류:', err);
    throw err;
  }
};
