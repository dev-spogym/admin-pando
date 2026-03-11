/**
 * Axios 인스턴스 설정 및 인터셉터
 */
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiError } from './types';

/** axios 인스턴스 생성 */
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10000, // 10초 타임아웃
  headers: {
    'Content-Type': 'application/json',
  },
});

/** request 인터셉터: JWT 토큰 자동 첨부 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/** response 인터셉터: 401 처리 및 에러 표준화 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // 토큰 만료 또는 인증 실패 → 로그인 페이지로 리다이렉트
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 에러 표준화
    const standardError: ApiError = {
      success: false,
      message: error.response?.data?.message ?? error.message ?? '알 수 없는 오류가 발생했습니다.',
      code: error.response?.data?.code ?? 'UNKNOWN_ERROR',
      status: error.response?.status ?? 0,
      details: error.response?.data?.details,
    };

    return Promise.reject(standardError);
  }
);

export default apiClient;
