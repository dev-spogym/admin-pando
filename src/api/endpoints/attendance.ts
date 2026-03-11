/**
 * 출석 관련 API 함수
 */
import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** 출석 기록 */
export interface Attendance {
  id: number;
  memberId: number;
  memberName: string;
  checkInAt: string;
  checkOutAt?: string;
  type: 'CHECKIN' | 'CHECKOUT';
  branchId: number;
}

/** 출석 생성 요청 */
export interface AttendanceRequest {
  memberId: number;
  type: 'CHECKIN' | 'CHECKOUT';
}

/** 출석 목록 조회 */
export const getAttendance = async (
  params?: PaginationParams & { date?: string; memberId?: number }
): Promise<ApiResponse<PaginatedResponse<Attendance>>> => {
  // const response = await apiClient.get<ApiResponse<PaginatedResponse<Attendance>>>('/attendance', { params });
  // return response.data;

  void apiClient; void params;
  const mockList: Attendance[] = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    memberId: i + 1,
    memberName: `회원${i + 1}`,
    checkInAt: new Date().toISOString(),
    type: 'CHECKIN',
    branchId: 1,
  }));
  return {
    success: true,
    data: {
      data: mockList,
      pagination: { page: 1, size: 10, total: 50, totalPages: 5 },
    },
  };
};

/** 출석 기록 생성 */
export const createAttendance = async (data: AttendanceRequest): Promise<ApiResponse<Attendance>> => {
  // const response = await apiClient.post<ApiResponse<Attendance>>('/attendance', data);
  // return response.data;

  return {
    success: true,
    data: {
      id: Date.now(),
      memberId: data.memberId,
      memberName: `회원${data.memberId}`,
      checkInAt: new Date().toISOString(),
      type: data.type,
      branchId: 1,
    },
    message: '출석이 기록되었습니다.',
  };
};
