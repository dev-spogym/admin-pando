/**
 * 상품 관련 API 함수
 */
import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** 상품 정보 */
export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  duration?: number; // 기간 (일)
  sessions?: number; // 횟수
  description?: string;
  isActive: boolean;
  branchId: number;
}

/** 상품 생성/수정 요청 */
export interface ProductRequest {
  name: string;
  category: string;
  price: number;
  duration?: number;
  sessions?: number;
  description?: string;
  isActive?: boolean;
}

/** 상품 목록 조회 */
export const getProducts = async (
  params?: PaginationParams & { category?: string; isActive?: boolean }
): Promise<ApiResponse<PaginatedResponse<Product>>> => {
  // const response = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/products', { params });
  // return response.data;

  void apiClient; void params;
  const mockList: Product[] = [
    { id: 1, name: 'PT 10회', category: 'PT', price: 300000, sessions: 10, isActive: true, branchId: 1 },
    { id: 2, name: 'PT 20회', category: 'PT', price: 550000, sessions: 20, isActive: true, branchId: 1 },
    { id: 3, name: '1개월 회원권', category: 'MEMBERSHIP', price: 80000, duration: 30, isActive: true, branchId: 1 },
    { id: 4, name: '3개월 회원권', category: 'MEMBERSHIP', price: 210000, duration: 90, isActive: true, branchId: 1 },
  ];
  return {
    success: true,
    data: {
      data: mockList,
      pagination: { page: 1, size: 10, total: 4, totalPages: 1 },
    },
  };
};

/** 상품 생성 */
export const createProduct = async (data: ProductRequest): Promise<ApiResponse<Product>> => {
  // const response = await apiClient.post<ApiResponse<Product>>('/products', data);
  // return response.data;

  return {
    success: true,
    data: { id: Date.now(), ...data, isActive: data.isActive ?? true, branchId: 1 },
    message: '상품이 등록되었습니다.',
  };
};

/** 상품 수정 */
export const updateProduct = async (id: number, data: Partial<ProductRequest>): Promise<ApiResponse<Product>> => {
  // const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, data);
  // return response.data;

  return {
    success: true,
    data: {
      id,
      name: data.name ?? '상품',
      category: data.category ?? 'PT',
      price: data.price ?? 0,
      duration: data.duration,
      sessions: data.sessions,
      description: data.description,
      isActive: data.isActive ?? true,
      branchId: 1,
    },
    message: '상품이 수정되었습니다.',
  };
};

/** 상품 삭제 */
export const deleteProduct = async (id: number): Promise<ApiResponse<null>> => {
  // const response = await apiClient.delete<ApiResponse<null>>(`/products/${id}`);
  // return response.data;

  void id;
  return { success: true, data: null, message: '상품이 삭제되었습니다.' };
};
