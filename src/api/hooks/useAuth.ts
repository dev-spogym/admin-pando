/**
 * 인증 관련 React Query 커스텀 훅
 */
import { useMutation } from '@tanstack/react-query';
import { login, logout, refreshToken, changePassword } from '../endpoints/auth';
import type { LoginRequest, ChangePasswordRequest, RefreshTokenRequest } from '../endpoints/auth';

/** 로그인 훅 */
export const useLogin = () => {
  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: (response) => {
      // 토큰 저장
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    },
  });
};

/** 로그아웃 훅 */
export const useLogout = () => {
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // 토큰 제거
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
  });
};

/** 토큰 갱신 훅 */
export const useRefreshToken = () => {
  return useMutation({
    mutationFn: (data: RefreshTokenRequest) => refreshToken(data),
    onSuccess: (response) => {
      localStorage.setItem('accessToken', response.data.accessToken);
    },
  });
};

/** 비밀번호 변경 훅 */
export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => changePassword(data),
  });
};
