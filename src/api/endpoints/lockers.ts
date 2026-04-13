/**
 * 락커 관련 API 함수 (Supabase 연동)
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** branchId 가져오기 */
const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 락커 정보 */
export interface Locker {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
  memberId?: number;
  memberName?: string;
  assignedAt?: string;
  expiresAt?: string;
  branchId: number;
}

/** 락커 배정 요청 */
export interface AssignLockerRequest {
  lockerId: number;
  memberId: number;
  memberName: string;
  expiresAt: string;
}

/** 락커 상태 변경 요청 */
export interface UpdateLockerStatusRequest {
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
}

/** 락커 목록 조회 */
export const getLockers = async (
  params?: PaginationParams & { status?: string }
): Promise<ApiResponse<PaginatedResponse<Locker>>> => {
  try {
    const page = params?.page ?? 1;
    const size = params?.size ?? 50;
    const from = (page - 1) * size;
    const to = from + size - 1;

    let query = supabase
      .from('lockers')
      .select('*', { count: 'exact' })
      .eq('branchId', getBranchId())
      .order('number', { ascending: true })
      .range(from, to);

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;
    return {
      success: true,
      data: {
        data: (data ?? []) as Locker[],
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '락커 목록 조회에 실패했습니다.';
    return { success: false, data: { data: [], pagination: { page: 1, size: 50, total: 0, totalPages: 0 } }, message };
  }
};

/** 락커 배정 */
export const assignLocker = async (data: AssignLockerRequest): Promise<ApiResponse<Locker>> => {
  try {
    const { data: updated, error } = await supabase
      .from('lockers')
      .update({
        status: 'IN_USE',
        memberId: data.memberId,
        memberName: data.memberName,
        assignedAt: new Date().toISOString(),
        expiresAt: data.expiresAt,
      })
      .eq('id', data.lockerId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Locker,
      message: '락커가 배정되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '락커 배정에 실패했습니다.';
    return { success: false, data: null as unknown as Locker, message };
  }
};

/** 락커 반납 */
export const releaseLocker = async (lockerId: number): Promise<ApiResponse<Locker>> => {
  try {
    const { data: updated, error } = await supabase
      .from('lockers')
      .update({
        status: 'AVAILABLE',
        memberId: null,
        memberName: null,
        assignedAt: null,
        expiresAt: null,
      })
      .eq('id', lockerId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Locker,
      message: '락커가 반납되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '락커 반납에 실패했습니다.';
    return { success: false, data: null as unknown as Locker, message };
  }
};

/** 락커 상태 변경 (예: 점검 처리) */
export const updateLockerStatus = async (
  lockerId: number,
  data: UpdateLockerStatusRequest
): Promise<ApiResponse<Locker>> => {
  try {
    const { data: updated, error } = await supabase
      .from('lockers')
      .update({ status: data.status })
      .eq('id', lockerId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Locker,
      message: '락커 상태가 변경되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '락커 상태 변경에 실패했습니다.';
    return { success: false, data: null as unknown as Locker, message };
  }
};
