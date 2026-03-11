/**
 * 직원 관련 API 함수
 */
import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

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
  isActive: boolean;
  branchId: number;
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
}

/** 직원 목록 조회 */
export const getStaff = async (
  params?: PaginationParams & { role?: string; isActive?: boolean }
): Promise<ApiResponse<PaginatedResponse<Staff>>> => {
  // const response = await apiClient.get<ApiResponse<PaginatedResponse<Staff>>>('/staff', { params });
  // return response.data;

  void apiClient; void params;
  const mockList: Staff[] = [
    { id: 1, name: '김트레이너', phone: '010-1111-0001', role: 'TRAINER', position: '트레이너', hireDate: '2023-01-01', salary: 3000000, isActive: true, branchId: 1 },
    { id: 2, name: '이매니저', phone: '010-1111-0002', role: 'MANAGER', position: '지점장', hireDate: '2022-06-01', salary: 4000000, isActive: true, branchId: 1 },
  ];
  return {
    success: true,
    data: {
      data: mockList,
      pagination: { page: 1, size: 10, total: 2, totalPages: 1 },
    },
  };
};

/** 직원 생성 */
export const createStaff = async (data: StaffRequest): Promise<ApiResponse<Staff>> => {
  // const response = await apiClient.post<ApiResponse<Staff>>('/staff', data);
  // return response.data;

  return {
    success: true,
    data: { id: Date.now(), ...data, isActive: true, branchId: 1 },
    message: '직원이 등록되었습니다.',
  };
};

/** 직원 수정 */
export const updateStaff = async (id: number, data: Partial<StaffRequest>): Promise<ApiResponse<Staff>> => {
  // const response = await apiClient.put<ApiResponse<Staff>>(`/staff/${id}`, data);
  // return response.data;

  return {
    success: true,
    data: {
      id,
      name: data.name ?? '직원',
      phone: data.phone ?? '',
      role: data.role ?? 'TRAINER',
      position: data.position ?? '트레이너',
      hireDate: data.hireDate ?? '',
      salary: data.salary,
      isActive: true,
      branchId: 1,
    },
    message: '직원 정보가 수정되었습니다.',
  };
};

/** 직원 삭제 */
export const deleteStaff = async (id: number): Promise<ApiResponse<null>> => {
  // const response = await apiClient.delete<ApiResponse<null>>(`/staff/${id}`);
  // return response.data;

  void id;
  return { success: true, data: null, message: '직원이 삭제되었습니다.' };
};
