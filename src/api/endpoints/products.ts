/**
 * 상품 관련 API 함수 - Supabase 연동
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** branchId 가져오기 */
const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 상품 정보 */
export interface Product {
  id: number;
  name: string;
  category: 'PT' | 'MEMBERSHIP' | 'GX' | 'PRODUCT' | 'SERVICE';
  price: number;
  duration?: number;
  sessions?: number;
  description?: string;
  isActive: boolean;
  branchId: number;
}

/** 상품 생성/수정 요청 */
export interface ProductRequest {
  name: string;
  category: 'PT' | 'MEMBERSHIP' | 'GX' | 'PRODUCT' | 'SERVICE';
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
  const branchId = getBranchId();
  const page = params?.page ?? 1;
  const size = params?.size ?? 50;
  const from = (page - 1) * size;
  const to = from + size - 1;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('branchId', branchId)
    .order('name', { ascending: true })
    .range(from, to);

  if (params?.category) query = query.eq('category', params.category);
  if (params?.isActive !== undefined) query = query.eq('isActive', params.isActive);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    success: true,
    data: {
      data: (data ?? []) as Product[],
      pagination: { page, size, total, totalPages: Math.ceil(total / size) },
    },
  };
};

/** 상품 상세 조회 */
export const getProduct = async (id: number): Promise<ApiResponse<Product>> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return { success: true, data: data as Product };
};

/** 상품 생성 */
export const createProduct = async (payload: ProductRequest): Promise<ApiResponse<Product>> => {
  const branchId = getBranchId();

  const { data, error } = await supabase
    .from('products')
    .insert({ ...payload, isActive: payload.isActive ?? true, branchId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { success: true, data: data as Product, message: '상품이 등록되었습니다.' };
};

/** 상품 수정 (가격 변경 시 히스토리 로그 기록) */
export const updateProduct = async (id: number, payload: Partial<ProductRequest>): Promise<ApiResponse<Product>> => {
  // 가격 변경 이력 기록을 위해 기존 상품 조회
  let prevPrice: number | null = null;
  if (payload.price !== undefined) {
    const { data: prev } = await supabase.from('products').select('price').eq('id', id).single();
    if (prev) prevPrice = Number(prev.price);
  }

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 가격이 실제로 변경되었으면 히스토리 로그 기록
  if (prevPrice !== null && payload.price !== undefined && prevPrice !== payload.price) {
    await supabase.from('audit_logs').insert({
      branchId: getBranchId(),
      userId: null,
      userName: '시스템',
      action: 'UPDATE',
      targetType: 'product',
      targetId: id,
      detail: {
        field: 'price',
        prevValue: prevPrice,
        newValue: payload.price,
        productName: (data as Product)?.name ?? '',
      },
    }).then(() => {/* 로그 실패해도 무시 */});
  }

  return { success: true, data: data as Product, message: '상품이 수정되었습니다.' };
};

/** 상품 삭제 */
export const deleteProduct = async (id: number): Promise<ApiResponse<null>> => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true, data: null, message: '상품이 삭제되었습니다.' };
};
