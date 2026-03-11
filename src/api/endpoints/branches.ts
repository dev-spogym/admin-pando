/**
 * 지점 관련 API 함수
 */
import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** 지점 정보 */
export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
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
  managerId?: number;
}

/** 지점 목록 조회 */
export const getBranches = async (
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Branch>>> => {
  // const response = await apiClient.get<ApiResponse<PaginatedResponse<Branch>>>('/branches', { params });
  // return response.data;

  void apiClient; void params;
  const mockList: Branch[] = [
    { id: 1, name: '판도 강남점', address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678', managerId: 2, managerName: '이매니저', isActive: true, createdAt: '2023-01-01' },
    { id: 2, name: '판도 홍대점', address: '서울시 마포구 홍익로 456', phone: '02-8765-4321', isActive: true, createdAt: '2023-06-01' },
  ];
  return {
    success: true,
    data: {
      data: mockList,
      pagination: { page: 1, size: 10, total: 2, totalPages: 1 },
    },
  };
};

/** 지점 생성 */
export const createBranch = async (data: BranchRequest): Promise<ApiResponse<Branch>> => {
  // const response = await apiClient.post<ApiResponse<Branch>>('/branches', data);
  // return response.data;

  return {
    success: true,
    data: {
      id: Date.now(),
      ...data,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    message: '지점이 등록되었습니다.',
  };
};

/** 지점 수정 */
export const updateBranch = async (id: number, data: Partial<BranchRequest>): Promise<ApiResponse<Branch>> => {
  // const response = await apiClient.put<ApiResponse<Branch>>(`/branches/${id}`, data);
  // return response.data;

  return {
    success: true,
    data: {
      id,
      name: data.name ?? '지점',
      address: data.address ?? '',
      phone: data.phone ?? '',
      managerId: data.managerId,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    message: '지점 정보가 수정되었습니다.',
  };
};
