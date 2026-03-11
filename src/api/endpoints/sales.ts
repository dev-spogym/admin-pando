/**
 * 매출 관련 API 함수
 */
import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** 매출 항목 */
export interface Sale {
  id: number;
  memberId: number;
  memberName: string;
  productId: number;
  productName: string;
  amount: number;
  paymentMethod: 'CARD' | 'CASH' | 'TRANSFER';
  saleDate: string;
  staffId?: number;
  branchId: number;
}

/** 매출 생성 요청 */
export interface SaleRequest {
  memberId: number;
  productId: number;
  amount: number;
  paymentMethod: 'CARD' | 'CASH' | 'TRANSFER';
  staffId?: number;
}

/** 매출 통계 */
export interface SalesStats {
  totalAmount: number;
  totalCount: number;
  monthlyAmount: number;
  monthlyCount: number;
  byPaymentMethod: Record<string, number>;
}

/** 매출 목록 조회 */
export const getSales = async (
  params?: PaginationParams & { startDate?: string; endDate?: string; memberId?: number }
): Promise<ApiResponse<PaginatedResponse<Sale>>> => {
  // const response = await apiClient.get<ApiResponse<PaginatedResponse<Sale>>>('/sales', { params });
  // return response.data;

  void apiClient; void params;
  const mockList: Sale[] = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    memberId: i + 1,
    memberName: `회원${i + 1}`,
    productId: 1,
    productName: 'PT 10회',
    amount: 300000,
    paymentMethod: 'CARD',
    saleDate: new Date().toISOString(),
    branchId: 1,
  }));
  return {
    success: true,
    data: {
      data: mockList,
      pagination: { page: 1, size: 10, total: 200, totalPages: 20 },
    },
  };
};

/** 매출 생성 */
export const createSale = async (data: SaleRequest): Promise<ApiResponse<Sale>> => {
  // const response = await apiClient.post<ApiResponse<Sale>>('/sales', data);
  // return response.data;

  return {
    success: true,
    data: {
      id: Date.now(),
      memberId: data.memberId,
      memberName: `회원${data.memberId}`,
      productId: data.productId,
      productName: '상품',
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      saleDate: new Date().toISOString(),
      staffId: data.staffId,
      branchId: 1,
    },
    message: '매출이 등록되었습니다.',
  };
};

/** 매출 통계 조회 */
export const getSalesStats = async (params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<SalesStats>> => {
  // const response = await apiClient.get<ApiResponse<SalesStats>>('/sales/stats', { params });
  // return response.data;

  void params;
  return {
    success: true,
    data: {
      totalAmount: 15000000,
      totalCount: 120,
      monthlyAmount: 4500000,
      monthlyCount: 35,
      byPaymentMethod: { CARD: 10000000, CASH: 3000000, TRANSFER: 2000000 },
    },
  };
};
