/**
 * 매출 관련 React Query 커스텀 훅
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSales, createSale, getSalesStats } from '../endpoints/sales';
import type { SaleRequest } from '../endpoints/sales';
import type { PaginationParams } from '../types';

/** 쿼리 키 상수 */
export const SALES_KEYS = {
  all: ['sales'] as const,
  lists: () => [...SALES_KEYS.all, 'list'] as const,
  list: (params?: PaginationParams & { startDate?: string; endDate?: string; memberId?: number }) =>
    [...SALES_KEYS.lists(), params] as const,
  stats: (params?: { startDate?: string; endDate?: string }) =>
    [...SALES_KEYS.all, 'stats', params] as const,
};

/** 매출 목록 조회 훅 */
export const useSales = (
  params?: PaginationParams & { startDate?: string; endDate?: string; memberId?: number }
) => {
  return useQuery({
    queryKey: SALES_KEYS.list(params),
    queryFn: () => getSales(params),
  });
};

/** 매출 생성 훅 */
export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaleRequest) => createSale(data),
    onSuccess: () => {
      // 목록 및 통계 캐시 무효화
      queryClient.invalidateQueries({ queryKey: SALES_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SALES_KEYS.all });
    },
  });
};

/** 매출 통계 조회 훅 */
export const useSalesStats = (params?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: SALES_KEYS.stats(params),
    queryFn: () => getSalesStats(params),
  });
};
