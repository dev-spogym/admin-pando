/**
 * 직원 관련 API 함수 (Supabase 연동)
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 직원 상태 */
export type StaffStatus = 'ACTIVE' | 'RESIGNED' | 'TRANSFERRED' | 'ON_LEAVE' | 'LOCKED';

/** 직원 정보 */
export interface Staff {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: string;
  position: string;
  hireDate: string;
  salary?: number;
  color?: string;
  isActive: boolean;
  branchId: number;
  // 라이프사이클 필드
  staffStatus?: StaffStatus;
  resignedAt?: string;
  resignReason?: string;
  resignScheduledAt?: string;
  previousEmployeeId?: number;
  leaveStartAt?: string;
  leaveEndAt?: string;
  leaveReason?: string;
  transferredFromBranchId?: number;
  transferredAt?: string;
}

/** 직원 생성/수정 요청 */
export interface StaffRequest {
  name: string;
  phone: string;
  email?: string;
  role: string;
  position: string;
  hireDate: string;
  salary?: number;
  color?: string;
}

/** 직원 목록 조회 */
export const getStaff = async (
  params?: PaginationParams & { role?: string; isActive?: boolean; staffStatus?: string }
): Promise<ApiResponse<PaginatedResponse<Staff>>> => {
  try {
    const page = params?.page ?? 1;
    const size = params?.size ?? 20;
    const from = (page - 1) * size;
    const to = from + size - 1;

    let query = supabase
      .from('staff')
      .select('*', { count: 'exact' })
      .eq('branchId', getBranchId())
      .order('name', { ascending: true })
      .range(from, to);

    if (params?.role) {
      query = query.eq('role', params.role);
    }

    if (params?.staffStatus === 'ALL') {
      // 필터 없이 전체 반환
    } else if (params?.staffStatus) {
      query = query.eq('staffStatus', params.staffStatus);
    } else if (params?.isActive !== undefined) {
      query = query.eq('isActive', params.isActive);
    } else {
      // 기본값: 활성 직원만
      query = query.eq('isActive', true);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;
    return {
      success: true,
      data: {
        data: (data ?? []) as Staff[],
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '직원 목록 조회에 실패했습니다.';
    return { success: false, data: { data: [], pagination: { page: 1, size: 20, total: 0, totalPages: 0 } }, message };
  }
};

/** 직원 단건 조회 */
export const getStaffById = async (id: number): Promise<ApiResponse<Staff>> => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { success: true, data: data as Staff };
  } catch (err) {
    const message = err instanceof Error ? err.message : '직원 조회에 실패했습니다.';
    return { success: false, data: null as unknown as Staff, message };
  }
};

/** 직원 생성 */
export const createStaff = async (data: StaffRequest): Promise<ApiResponse<Staff>> => {
  try {
    const { data: inserted, error } = await supabase
      .from('staff')
      .insert({
        ...data,
        isActive: true,
        staffStatus: 'ACTIVE',
        branchId: getBranchId(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: inserted as Staff,
      message: '직원이 등록되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '직원 등록에 실패했습니다.';
    return { success: false, data: null as unknown as Staff, message };
  }
};

/** 직원 수정 */
export const updateStaff = async (id: number, data: Partial<StaffRequest>): Promise<ApiResponse<Staff>> => {
  try {
    const { data: updated, error } = await supabase
      .from('staff')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Staff,
      message: '직원 정보가 수정되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '직원 수정에 실패했습니다.';
    return { success: false, data: null as unknown as Staff, message };
  }
};

/** 직원 삭제 (비활성화 + 퇴사 처리) */
export const deleteStaff = async (id: number): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase
      .from('staff')
      .update({ isActive: false, staffStatus: 'RESIGNED' })
      .eq('id', id);

    if (error) throw error;

    return { success: true, data: null, message: '직원이 삭제되었습니다.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : '직원 삭제에 실패했습니다.';
    return { success: false, data: null, message };
  }
};

/** 퇴사 예정 등록 요청 */
export interface ResignStaffRequest {
  resignScheduledAt: string;
  resignReason?: string;
}

/** 직원 퇴사 예정 등록 */
export const scheduleResignation = async (
  staffId: number,
  data: ResignStaffRequest
): Promise<ApiResponse<Staff>> => {
  try {
    const { data: updated, error } = await supabase
      .from('staff')
      .update({
        resignScheduledAt: data.resignScheduledAt,
        resignReason: data.resignReason ?? null,
        // staffStatus는 ACTIVE 유지 (예정일이므로)
      })
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Staff,
      message: '퇴사 예정일이 등록되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '퇴사 예정 등록에 실패했습니다.';
    return { success: false, data: null as unknown as Staff, message };
  }
};

/** 직원 퇴사 확정 처리 */
export const confirmResignation = async (
  staffId: number
): Promise<ApiResponse<Staff>> => {
  try {
    const { data: updated, error } = await supabase
      .from('staff')
      .update({
        staffStatus: 'RESIGNED',
        resignedAt: new Date().toISOString(),
        isActive: false,
      })
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Staff,
      message: '퇴사 처리가 완료되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '퇴사 처리에 실패했습니다.';
    return { success: false, data: null as unknown as Staff, message };
  }
};

/** 직원 휴직 등록 요청 */
export interface StaffLeaveRequest {
  leaveStartAt: string;
  leaveEndAt: string;
  leaveReason: string;
}

/** 직원 휴직 등록 */
export const startStaffLeave = async (
  staffId: number,
  data: StaffLeaveRequest
): Promise<ApiResponse<Staff>> => {
  try {
    const { data: updated, error } = await supabase
      .from('staff')
      .update({
        staffStatus: 'ON_LEAVE',
        leaveStartAt: data.leaveStartAt,
        leaveEndAt: data.leaveEndAt,
        leaveReason: data.leaveReason,
        isActive: false,
      })
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Staff,
      message: '휴직 처리가 완료되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '휴직 처리에 실패했습니다.';
    return { success: false, data: null as unknown as Staff, message };
  }
};

/** 직원 복직 처리 */
export const endStaffLeave = async (
  staffId: number
): Promise<ApiResponse<Staff>> => {
  try {
    const { data: updated, error } = await supabase
      .from('staff')
      .update({
        staffStatus: 'ACTIVE',
        isActive: true,
        // leaveStartAt, leaveEndAt, leaveReason 이력 유지
      })
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Staff,
      message: '복직 처리가 완료되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '복직 처리에 실패했습니다.';
    return { success: false, data: null as unknown as Staff, message };
  }
};

/** 직원 역할 변경 요청 */
export interface ChangeRoleRequest {
  newRole: string;
  newPosition?: string;
}

/** 직원 역할 변경 */
export const changeStaffRole = async (
  staffId: number,
  data: ChangeRoleRequest
): Promise<ApiResponse<Staff>> => {
  try {
    const updatePayload: Record<string, string> = { role: data.newRole };
    if (data.newPosition !== undefined) {
      updatePayload.position = data.newPosition;
    }

    const { data: updated, error } = await supabase
      .from('staff')
      .update(updatePayload)
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Staff,
      message: '역할이 변경되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '역할 변경에 실패했습니다.';
    return { success: false, data: null as unknown as Staff, message };
  }
};

/** 직원 지점 이동(전보) 요청 */
export interface TransferStaffRequest {
  toBranchId: number;
  newRole?: string;
  effectiveDate: string;
}

/** 직원 지점 이동 (전보) */
export const transferStaff = async (
  staffId: number,
  data: TransferStaffRequest
): Promise<ApiResponse<Staff>> => {
  try {
    // 1. 기존 직원 레코드 조회
    const { data: existing, error: fetchError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single();

    if (fetchError) throw fetchError;

    // 2. 기존 레코드: TRANSFERRED 상태로 비활성화
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        staffStatus: 'TRANSFERRED',
        transferredAt: data.effectiveDate,
        isActive: false,
      })
      .eq('id', staffId);

    if (updateError) throw updateError;

    // 3. 새 지점에 새 레코드 생성
    const { name, phone, email, position, hireDate, salary, color } = existing as Staff;
    const newRole = data.newRole ?? (existing as Staff).role;

    const { data: inserted, error: insertError } = await supabase
      .from('staff')
      .insert({
        name,
        phone,
        email,
        role: newRole,
        position,
        hireDate,
        salary,
        color,
        isActive: true,
        staffStatus: 'ACTIVE',
        branchId: data.toBranchId,
        transferredFromBranchId: (existing as Staff).branchId,
        previousEmployeeId: staffId,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      success: true,
      data: inserted as Staff,
      message: '전보 처리가 완료되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '전보 처리에 실패했습니다.';
    return { success: false, data: null as unknown as Staff, message };
  }
};

/** 직원 담당 회원 조회 */
export const getStaffMembers = async (
  staffId: number
): Promise<ApiResponse<{ id: number; name: string; phone: string; hasPtRemaining: boolean }[]>> => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, phone, ptRemaining')
      .eq('staffId', staffId);

    if (error) throw error;

    const result = (data ?? []).map((m: { id: number; name: string; phone: string; ptRemaining?: number | null }) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      hasPtRemaining: Number(m.ptRemaining ?? 0) > 0,
    }));

    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : '담당 회원 조회에 실패했습니다.';
    return { success: false, data: [], message };
  }
};

/** 담당 회원 일괄 재배정 요청 */
export interface ReassignMembersRequest {
  assignments: { memberId: number; newStaffId: number }[];
}

/** 담당 회원 일괄 재배정 */
export const reassignMembers = async (
  data: ReassignMembersRequest
): Promise<ApiResponse<null>> => {
  try {
    const updates = data.assignments.map(({ memberId, newStaffId }) =>
      supabase
        .from('members')
        .update({ staffId: newStaffId })
        .eq('id', memberId)
    );

    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) throw firstError;

    return { success: true, data: null, message: `${data.assignments.length}명의 담당 직원이 재배정되었습니다.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : '담당 회원 재배정에 실패했습니다.';
    return { success: false, data: null, message };
  }
};
