/**
 * 매출 관련 API 함수 - Supabase 연동
 */
import { supabase } from '../../lib/supabase';
import { createAuditLog, AUDIT_ACTIONS } from './auditLog';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** branchId 가져오기 */
const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 매출 항목 */
export interface Sale {
  id: number;
  memberId: number;
  memberName: string;
  productId: number;
  productName: string;
  saleDate: string;
  type?: string;
  round?: number;
  quantity?: number;
  originalPrice?: number;
  salePrice?: number;
  discountPrice?: number;
  amount: number;
  paymentMethod: 'CARD' | 'CASH' | 'TRANSFER' | 'MILEAGE';
  paymentType?: string;
  cash?: number;
  card?: number;
  mileageUsed?: number;
  cardCompany?: string;
  cardNumber?: string;
  approvalNo?: string;
  status: 'COMPLETED' | 'UNPAID' | 'REFUNDED' | 'PENDING';
  unpaid?: number;
  staffId?: number;
  staffName?: string;
  memo?: string;
  branchId: number;
}

/** 매출 생성 요청 */
export interface SaleRequest {
  memberId: number;
  memberName?: string;
  productId: number;
  productName?: string;
  amount: number;
  salePrice?: number;
  originalPrice?: number;
  discountPrice?: number;
  paymentMethod: 'CARD' | 'CASH' | 'TRANSFER' | 'MILEAGE';
  paymentType?: string;
  cash?: number;
  card?: number;
  mileageUsed?: number;
  cardCompany?: string;
  cardNumber?: string;
  approvalNo?: string;
  status?: 'COMPLETED' | 'UNPAID' | 'REFUNDED' | 'PENDING';
  unpaid?: number;
  staffId?: number;
  staffName?: string;
  memo?: string;
  saleDate?: string;
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
  const branchId = getBranchId();
  const page = params?.page ?? 1;
  const size = params?.size ?? 20;
  const from = (page - 1) * size;
  const to = from + size - 1;

  let query = supabase
    .from('sales')
    .select('*', { count: 'exact' })
    .eq('branchId', branchId)
    .order('saleDate', { ascending: false })
    .range(from, to);

  if (params?.startDate) query = query.gte('saleDate', params.startDate);
  if (params?.endDate) query = query.lte('saleDate', params.endDate);
  if (params?.memberId) query = query.eq('memberId', params.memberId);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    success: true,
    data: {
      data: (data ?? []) as Sale[],
      pagination: { page, size, total, totalPages: Math.ceil(total / size) },
    },
  };
};

/** 매출 상세 조회 */
export const getSale = async (id: number): Promise<ApiResponse<Sale>> => {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return { success: true, data: data as Sale };
};

/** 매출 생성 */
export const createSale = async (payload: SaleRequest): Promise<ApiResponse<Sale>> => {
  const branchId = getBranchId();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('sales')
    .insert({
      ...payload,
      saleDate: payload.saleDate ?? now,
      status: payload.status ?? 'COMPLETED',
      branchId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  createAuditLog({ action: AUDIT_ACTIONS.CREATE, targetType: 'sale', targetId: data.id, afterValue: { memberName: payload.memberName, amount: payload.amount } });
  return { success: true, data: data as Sale, message: '매출이 등록되었습니다.' };
};

/** 매출 수정 */
export const updateSale = async (id: number, payload: Partial<SaleRequest>): Promise<ApiResponse<Sale>> => {
  const { data, error } = await supabase
    .from('sales')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  createAuditLog({ action: AUDIT_ACTIONS.UPDATE, targetType: 'sale', targetId: id });
  return { success: true, data: data as Sale, message: '매출이 수정되었습니다.' };
};

/** 매출 삭제 */
export const deleteSale = async (id: number): Promise<ApiResponse<null>> => {
  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) throw new Error(error.message);
  createAuditLog({ action: AUDIT_ACTIONS.DELETE, targetType: 'sale', targetId: id });
  return { success: true, data: null, message: '매출이 삭제되었습니다.' };
};

/** 매출 통계 조회 */
export const getSalesStats = async (params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<SalesStats>> => {
  const branchId = getBranchId();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // 전체 통계 쿼리
  let totalQuery = supabase
    .from('sales')
    .select('amount, paymentMethod')
    .eq('branchId', branchId)
    .eq('status', 'COMPLETED');

  if (params?.startDate) totalQuery = totalQuery.gte('saleDate', params.startDate);
  if (params?.endDate) totalQuery = totalQuery.lte('saleDate', params.endDate);

  const { data: totalData, error: totalError } = await totalQuery;
  if (totalError) throw new Error(totalError.message);

  // 이번달 통계 쿼리
  const { data: monthlyData, error: monthlyError } = await supabase
    .from('sales')
    .select('amount, paymentMethod')
    .eq('branchId', branchId)
    .eq('status', 'COMPLETED')
    .gte('saleDate', monthStart)
    .lte('saleDate', monthEnd);

  if (monthlyError) throw new Error(monthlyError.message);

  const rows = totalData ?? [];
  const monthRows = monthlyData ?? [];

  const totalAmount = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const totalCount = rows.length;
  const monthlyAmount = monthRows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const monthlyCount = monthRows.length;

  const byPaymentMethod: Record<string, number> = {};
  for (const r of rows) {
    const method = r.paymentMethod as string;
    byPaymentMethod[method] = (byPaymentMethod[method] ?? 0) + (r.amount ?? 0);
  }

  return {
    success: true,
    data: { totalAmount, totalCount, monthlyAmount, monthlyCount, byPaymentMethod },
  };
};
