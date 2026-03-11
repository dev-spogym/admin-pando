/**
 * 락커 관련 API 함수
 */
import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

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
  expiresAt: string;
}

/** 락커 목록 조회 */
export const getLockers = async (
  params?: PaginationParams & { status?: string }
): Promise<ApiResponse<PaginatedResponse<Locker>>> => {
  // const response = await apiClient.get<ApiResponse<PaginatedResponse<Locker>>>('/lockers', { params });
  // return response.data;

  void apiClient; void params;
  const mockList: Locker[] = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    number: String(i + 1).padStart(3, '0'),
    status: i % 3 === 0 ? 'IN_USE' : 'AVAILABLE',
    memberId: i % 3 === 0 ? i + 1 : undefined,
    memberName: i % 3 === 0 ? `회원${i + 1}` : undefined,
    branchId: 1,
  }));
  return {
    success: true,
    data: {
      data: mockList,
      pagination: { page: 1, size: 20, total: 50, totalPages: 3 },
    },
  };
};

/** 락커 배정 */
export const assignLocker = async (data: AssignLockerRequest): Promise<ApiResponse<Locker>> => {
  // const response = await apiClient.post<ApiResponse<Locker>>('/lockers/assign', data);
  // return response.data;

  return {
    success: true,
    data: {
      id: data.lockerId,
      number: String(data.lockerId).padStart(3, '0'),
      status: 'IN_USE',
      memberId: data.memberId,
      memberName: `회원${data.memberId}`,
      assignedAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
      branchId: 1,
    },
    message: '락커가 배정되었습니다.',
  };
};

/** 락커 반납 */
export const releaseLocker = async (lockerId: number): Promise<ApiResponse<Locker>> => {
  // const response = await apiClient.post<ApiResponse<Locker>>(`/lockers/${lockerId}/release`);
  // return response.data;

  return {
    success: true,
    data: {
      id: lockerId,
      number: String(lockerId).padStart(3, '0'),
      status: 'AVAILABLE',
      branchId: 1,
    },
    message: '락커가 반납되었습니다.',
  };
};
