/**
 * 회원 관련 API 함수
 */
import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** 회원 정보 */
export interface Member {
  id: number;
  name: string;
  phone: string;
  email?: string;
  gender: 'M' | 'F';
  birthDate?: string;
  registeredAt: string;
  membershipType: string;
  membershipExpiry?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  branchId: number;
}

/** 회원 생성/수정 요청 */
export interface MemberRequest {
  name: string;
  phone: string;
  email?: string;
  gender: 'M' | 'F';
  birthDate?: string;
  membershipType: string;
  membershipExpiry?: string;
}

/** 회원 통계 */
export interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  expiredThisMonth: number;
  newThisMonth: number;
}

/** 회원 목록 조회 */
export const getMembers = async (
  params?: PaginationParams & { search?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<Member>>> => {
  // const response = await apiClient.get<ApiResponse<PaginatedResponse<Member>>>('/members', { params });
  // return response.data;

  void apiClient; void params;
  const mockMembers: Member[] = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `회원${i + 1}`,
    phone: `010-0000-${String(i + 1).padStart(4, '0')}`,
    gender: i % 2 === 0 ? 'M' : 'F',
    registeredAt: '2024-01-01',
    membershipType: 'PT',
    status: 'ACTIVE',
    branchId: 1,
  }));
  return {
    success: true,
    data: {
      data: mockMembers,
      pagination: { page: 1, size: 10, total: 100, totalPages: 10 },
    },
  };
};

/** 회원 단건 조회 */
export const getMember = async (id: number): Promise<ApiResponse<Member>> => {
  // const response = await apiClient.get<ApiResponse<Member>>(`/members/${id}`);
  // return response.data;

  void id;
  return {
    success: true,
    data: {
      id,
      name: `회원${id}`,
      phone: '010-0000-0001',
      gender: 'M',
      registeredAt: '2024-01-01',
      membershipType: 'PT',
      status: 'ACTIVE',
      branchId: 1,
    },
  };
};

/** 회원 생성 */
export const createMember = async (data: MemberRequest): Promise<ApiResponse<Member>> => {
  // const response = await apiClient.post<ApiResponse<Member>>('/members', data);
  // return response.data;

  return {
    success: true,
    data: { id: Date.now(), ...data, registeredAt: new Date().toISOString(), status: 'ACTIVE', branchId: 1 },
    message: '회원이 등록되었습니다.',
  };
};

/** 회원 수정 */
export const updateMember = async (id: number, data: Partial<MemberRequest>): Promise<ApiResponse<Member>> => {
  // const response = await apiClient.put<ApiResponse<Member>>(`/members/${id}`, data);
  // return response.data;

  void data;
  return {
    success: true,
    data: {
      id,
      name: data.name ?? `회원${id}`,
      phone: data.phone ?? '010-0000-0001',
      gender: data.gender ?? 'M',
      registeredAt: '2024-01-01',
      membershipType: data.membershipType ?? 'PT',
      status: 'ACTIVE',
      branchId: 1,
    },
    message: '회원 정보가 수정되었습니다.',
  };
};

/** 회원 삭제 */
export const deleteMember = async (id: number): Promise<ApiResponse<null>> => {
  // const response = await apiClient.delete<ApiResponse<null>>(`/members/${id}`);
  // return response.data;

  void id;
  return { success: true, data: null, message: '회원이 삭제되었습니다.' };
};

/** 회원 통계 조회 */
export const getMemberStats = async (): Promise<ApiResponse<MemberStats>> => {
  // const response = await apiClient.get<ApiResponse<MemberStats>>('/members/stats');
  // return response.data;

  return {
    success: true,
    data: {
      total: 320,
      active: 280,
      inactive: 25,
      expiredThisMonth: 15,
      newThisMonth: 42,
    },
  };
};
