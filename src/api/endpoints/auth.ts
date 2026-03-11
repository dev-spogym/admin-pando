/**
 * 인증 관련 API 함수
 */
import apiClient from '../client';
import type { ApiResponse } from '../types';

/** 로그인 요청 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** 로그인 응답 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
    branchId: number;
  };
}

/** 비밀번호 변경 요청 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** 토큰 갱신 요청 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** 로그인 */
export const login = async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  // TODO: 실제 API 연동 시 주석 해제
  // const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data);
  // return response.data;

  // Mock 데이터
  void apiClient;
  return {
    success: true,
    data: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 1,
        username: data.username,
        name: '관리자',
        role: 'ADMIN',
        branchId: 1,
      },
    },
    message: '로그인 성공',
  };
};

/** 로그아웃 */
export const logout = async (): Promise<ApiResponse<null>> => {
  // const response = await apiClient.post<ApiResponse<null>>('/auth/logout');
  // return response.data;

  return { success: true, data: null, message: '로그아웃 성공' };
};

/** 토큰 갱신 */
export const refreshToken = async (data: RefreshTokenRequest): Promise<ApiResponse<{ accessToken: string }>> => {
  // const response = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', data);
  // return response.data;

  void data;
  return { success: true, data: { accessToken: 'new-mock-access-token' } };
};

/** 비밀번호 변경 */
export const changePassword = async (data: ChangePasswordRequest): Promise<ApiResponse<null>> => {
  // const response = await apiClient.put<ApiResponse<null>>('/auth/password', data);
  // return response.data;

  void data;
  return { success: true, data: null, message: '비밀번호가 변경되었습니다.' };
};
