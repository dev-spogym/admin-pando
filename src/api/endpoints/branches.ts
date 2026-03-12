/**
 * 지점 관련 API 함수 (Supabase 연동)
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** 지점 상세 정보 (관리자용) */
export interface BranchDetail {
  id: number;
  name: string;
  address: string;
  phone: string;
  status?: string;
  managerId?: number;
  managerName?: string;
  isActive: boolean;
  createdAt: string;
}

/** 지점 생성/수정 요청 */
export interface BranchRequest {
  name: string;
  address: string;
  phone: string;
  status?: string;
  managerId?: number;
  managerName?: string;
}

/** DB row → BranchDetail 변환 */
function rowToBranchDetail(row: Record<string, unknown>): BranchDetail {
  return {
    id: row.id as number,
    name: row.name as string,
    address: row.address as string,
    phone: row.phone as string,
    status: row.status as string | undefined,
    managerId: row.managerId as number | undefined,
    managerName: row.managerName as string | undefined,
    isActive: row.isActive as boolean,
    createdAt: row.createdAt as string,
  };
}

/** 지점 목록 조회 (페이지네이션) */
export const getBranchesPaginated = async (
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<BranchDetail>>> => {
  const page = params?.page ?? 1;
  const size = params?.size ?? 10;
  const from = (page - 1) * size;
  const to = from + size - 1;

  const { data, error, count } = await supabase
    .from('branches')
    .select('*', { count: 'exact' })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) {
    return { success: false, data: null as unknown as PaginatedResponse<BranchDetail>, message: error.message };
  }

  const total = count ?? 0;

  return {
    success: true,
    data: {
      data: (data ?? []).map((row) => rowToBranchDetail(row as Record<string, unknown>)),
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
    },
  };
};

/** 지점 상세 조회 */
export const getBranch = async (id: number): Promise<ApiResponse<BranchDetail>> => {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { success: false, data: null as unknown as BranchDetail, message: error.message };
  }

  return {
    success: true,
    data: rowToBranchDetail(data as Record<string, unknown>),
  };
};

/** 지점 생성 */
export const createBranch = async (data: BranchRequest): Promise<ApiResponse<BranchDetail>> => {
  const { data: inserted, error } = await supabase
    .from('branches')
    .insert({
      name: data.name,
      address: data.address,
      phone: data.phone,
      status: data.status ?? null,
      managerId: data.managerId ?? null,
      managerName: data.managerName ?? null,
      isActive: true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, data: null as unknown as BranchDetail, message: error.message };
  }

  return {
    success: true,
    data: rowToBranchDetail(inserted as Record<string, unknown>),
    message: '지점이 등록되었습니다.',
  };
};

/** 지점 수정 */
export const updateBranch = async (
  id: number,
  data: Partial<BranchRequest>
): Promise<ApiResponse<BranchDetail>> => {
  const updatePayload: Record<string, unknown> = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.address !== undefined) updatePayload.address = data.address;
  if (data.phone !== undefined) updatePayload.phone = data.phone;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.managerId !== undefined) updatePayload.managerId = data.managerId;
  if (data.managerName !== undefined) updatePayload.managerName = data.managerName;

  const { data: updated, error } = await supabase
    .from('branches')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, data: null as unknown as BranchDetail, message: error.message };
  }

  return {
    success: true,
    data: rowToBranchDetail(updated as Record<string, unknown>),
    message: '지점 정보가 수정되었습니다.',
  };
};
