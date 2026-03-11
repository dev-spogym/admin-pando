/**
 * 상품 관련 React Query 커스텀 훅
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../endpoints/products';
import type { ProductRequest } from '../endpoints/products';
import type { PaginationParams } from '../types';

/** 쿼리 키 상수 */
export const PRODUCT_KEYS = {
  all: ['products'] as const,
  lists: () => [...PRODUCT_KEYS.all, 'list'] as const,
  list: (params?: PaginationParams & { category?: string; isActive?: boolean }) =>
    [...PRODUCT_KEYS.lists(), params] as const,
};

/** 상품 목록 조회 훅 */
export const useProducts = (
  params?: PaginationParams & { category?: string; isActive?: boolean }
) => {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(params),
    queryFn: () => getProducts(params),
  });
};

/** 상품 생성 훅 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductRequest) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.lists() });
    },
  });
};

/** 상품 수정 훅 */
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductRequest> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.lists() });
    },
  });
};

/** 상품 삭제 훅 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.lists() });
    },
  });
};
