/**
 * 환불 관리 관련 API 함수 - Supabase 연동
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse } from '../types';

/** branchId 가져오기 */
const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 환불 정보 */
export interface Refund {
  id: number;
  saleId: number;
  branchId: number;
  memberId: number;
  memberName: string;
  productName: string;
  refundAmount: number;
  refundMethod: 'CARD' | 'CASH' | 'TRANSFER' | 'MILEAGE';
  reason?: string;
  processedBy?: number;
  processedByName?: string;
  refundedAt: string;
  createdAt?: string;
}

/** 환불 생성 요청 */
export interface RefundRequest {
  saleId: number;
  branchId?: number;
  memberId: number;
  memberName: string;
  productName: string;
  refundAmount: number;
  refundMethod: 'CARD' | 'CASH' | 'TRANSFER' | 'MILEAGE';
  reason?: string;
  processedBy?: number;
  processedByName?: string;
}

/** 환불 통계 */
export interface RefundStats {
  totalCount: number;
  totalAmount: number;
  byMethod: Record<string, number>;
}

/** 환불 목록 조회 */
export const getRefunds = async (
  branchId?: number,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<Refund[]>> => {
  const resolvedBranchId = branchId ?? getBranchId();

  try {
    let query = supabase
      .from('refunds')
      .select('*')
      .eq('branchId', resolvedBranchId)
      .order('refundedAt', { ascending: false });

    if (startDate) query = query.gte('refundedAt', startDate);
    if (endDate) query = query.lte('refundedAt', endDate);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Decimal 필드 Number() 래핑
    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      refundAmount: Number(r.refundAmount),
    }));

    return { success: true, data: rows as Refund[] };
  } catch (err) {
    console.error('getRefunds 오류:', err);
    throw err;
  }
};

/** 환불 생성 */
export const createRefund = async (payload: RefundRequest): Promise<ApiResponse<Refund>> => {
  const branchId = payload.branchId ?? getBranchId();

  try {
    const { data, error } = await supabase
      .from('refunds')
      .insert({ ...payload, branchId, refundedAt: new Date().toISOString() })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as Refund, message: '환불이 처리되었습니다.' };
  } catch (err) {
    console.error('createRefund 오류:', err);
    throw err;
  }
};

/** 환불 통계 조회 */
export const getRefundStats = async (
  branchId?: number,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<RefundStats>> => {
  const resolvedBranchId = branchId ?? getBranchId();

  try {
    let query = supabase
      .from('refunds')
      .select('refundAmount, refundMethod')
      .eq('branchId', resolvedBranchId);

    if (startDate) query = query.gte('refundedAt', startDate);
    if (endDate) query = query.lte('refundedAt', endDate);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const totalCount = rows.length;
    const totalAmount = rows.reduce((sum, r) => sum + Number(r.refundAmount), 0);

    const byMethod: Record<string, number> = {};
    for (const r of rows) {
      const method = r.refundMethod as string;
      byMethod[method] = (byMethod[method] ?? 0) + Number(r.refundAmount);
    }

    return { success: true, data: { totalCount, totalAmount, byMethod } };
  } catch (err) {
    console.error('getRefundStats 오류:', err);
    throw err;
  }
};
