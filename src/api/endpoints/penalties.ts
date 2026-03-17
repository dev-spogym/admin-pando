/**
 * 페널티 관리 관련 API 함수 - Supabase 연동
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse, PaginatedResponse } from '../types';

/** branchId 가져오기 */
const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 페널티 정보 */
export interface Penalty {
  id: number;
  branchId: number;
  memberId: number;
  memberName: string;
  scheduleId?: number;
  type: 'NOSHOW' | 'LATE_CANCEL' | 'EARLY_LEAVE' | 'OTHER';
  deductCount?: number;
  reason?: string;
  appliedBy?: string;
  createdAt?: string;
}

/** 페널티 생성 요청 */
export interface PenaltyRequest {
  branchId?: number;
  memberId: number;
  memberName: string;
  scheduleId?: number;
  type: 'NOSHOW' | 'LATE_CANCEL' | 'EARLY_LEAVE' | 'OTHER';
  deductCount?: number;
  reason?: string;
  appliedBy?: string;
}

/** 페널티 목록 조회 */
export const getPenalties = async (
  branchId?: number,
  page = 1,
  size = 20
): Promise<ApiResponse<PaginatedResponse<Penalty>>> => {
  const resolvedBranchId = branchId ?? getBranchId();
  const from = (page - 1) * size;
  const to = from + size - 1;

  try {
    const { data, error, count } = await supabase
      .from('penalties')
      .select('*', { count: 'exact' })
      .eq('branchId', resolvedBranchId)
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    const total = count ?? 0;
    return {
      success: true,
      data: {
        data: (data ?? []) as Penalty[],
        pagination: { page, size, total, totalPages: Math.ceil(total / size) },
      },
    };
  } catch (err) {
    console.error('getPenalties 오류:', err);
    throw err;
  }
};

/** 페널티 생성 */
export const createPenalty = async (
  payload: PenaltyRequest
): Promise<ApiResponse<Penalty>> => {
  const branchId = payload.branchId ?? getBranchId();

  try {
    const { data, error } = await supabase
      .from('penalties')
      .insert({ ...payload, branchId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as Penalty, message: '페널티가 등록되었습니다.' };
  } catch (err) {
    console.error('createPenalty 오류:', err);
    throw err;
  }
};

/** 페널티 삭제 */
export const deletePenalty = async (id: number): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase.from('penalties').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true, data: null, message: '페널티가 삭제되었습니다.' };
  } catch (err) {
    console.error('deletePenalty 오류:', err);
    throw err;
  }
};
