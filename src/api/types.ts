/**
 * API 공통 타입 정의
 */

/** 공통 API 응답 래퍼 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

/** API 에러 타입 */
export interface ApiError {
  success: false;
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
}

/** 페이지네이션 메타 */
export interface Pagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

/** 페이지네이션 응답 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/** 페이지네이션 요청 파라미터 */
export interface PaginationParams {
  page?: number;
  size?: number;
}
