/**
 * 일정 요청 관련 API 함수 (Supabase 연동)
 * approvalStatus: 'pending' | 'approved' | 'rejected'
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse } from '../types';

const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

export interface ScheduleRequest {
  id: number;
  branchId: number;
  title: string;
  type: string;
  scheduleCategory: string | null;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  targetType: string | null;
  memberName: string | null;
  staffId: number | null;
  staffName: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string | null;
}

/** 미승인(pending) 일정 목록 조회 */
export const getScheduleRequests = async (branchId?: number): Promise<ApiResponse<ScheduleRequest[]>> => {
  try {
    const bid = branchId ?? getBranchId();
    const { data, error } = await supabase
      .from('classes')
      .select('id, branchId, title, type, scheduleCategory, approvalStatus, targetType, memberName, staffId, staffName, startTime, endTime, createdAt')
      .eq('branchId', bid)
      .eq('approvalStatus', 'pending')
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: (data ?? []) as ScheduleRequest[],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '일정 요청 목록 조회에 실패했습니다.';
    return { success: false, data: [], message };
  }
};

/** 일정 승인 */
export const approveSchedule = async (classId: number): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase
      .from('classes')
      .update({ approvalStatus: 'approved' })
      .eq('id', classId);

    if (error) throw error;

    return { success: true, data: null, message: '일정이 승인되었습니다.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : '일정 승인에 실패했습니다.';
    return { success: false, data: null, message };
  }
};

/** 일정 거절 */
export const rejectSchedule = async (classId: number, reason?: string): Promise<ApiResponse<null>> => {
  try {
    void reason;
    const { error } = await supabase
      .from('classes')
      .update({ approvalStatus: 'rejected' })
      .eq('id', classId);

    if (error) throw error;

    return { success: true, data: null, message: '일정이 거절되었습니다.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : '일정 거절에 실패했습니다.';
    return { success: false, data: null, message };
  }
};
