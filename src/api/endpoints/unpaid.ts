/**
 * 미수금 관리 관련 API 함수 - Supabase 연동
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse } from '../types';

/** branchId 가져오기 */
const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 미수금 상태 타입 */
export type UnpaidStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';

/** 미수금 정보 */
export interface Unpaid {
  id: number;
  saleId: number;
  branchId: number;
  memberId: number;
  memberName: string;
  productName: string;
  unpaidAmount: number;
  dueDate?: string;
  status: UnpaidStatus;
  createdAt?: string;
  updatedAt?: string;
}

/** 미수금 생성 요청 */
export interface UnpaidRequest {
  saleId: number;
  branchId?: number;
  memberId: number;
  memberName: string;
  productName: string;
  unpaidAmount: number;
  dueDate?: string;
}

/** 미수금 통계 */
export interface UnpaidStats {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
}

/** 미수금 목록 조회 */
export const getUnpaidList = async (branchId?: number): Promise<ApiResponse<Unpaid[]>> => {
  const resolvedBranchId = branchId ?? getBranchId();

  try {
    const { data, error } = await supabase
      .from('unpaid')
      .select('*')
      .eq('branchId', resolvedBranchId)
      .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);

    // Decimal 필드 Number() 래핑
    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      unpaidAmount: Number(r.unpaidAmount),
    }));

    return { success: true, data: rows as Unpaid[] };
  } catch (err) {
    console.error('getUnpaidList 오류:', err);
    throw err;
  }
};

/** 미수금 생성 */
export const createUnpaid = async (payload: UnpaidRequest): Promise<ApiResponse<Unpaid>> => {
  const branchId = payload.branchId ?? getBranchId();

  try {
    const { data, error } = await supabase
      .from('unpaid')
      .insert({ ...payload, branchId, status: 'PENDING' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as Unpaid, message: '미수금이 등록되었습니다.' };
  } catch (err) {
    console.error('createUnpaid 오류:', err);
    throw err;
  }
};

/** 미수금 상태 변경 */
export const updateUnpaidStatus = async (
  id: number,
  status: UnpaidStatus
): Promise<ApiResponse<Unpaid>> => {
  try {
    const { data, error } = await supabase
      .from('unpaid')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as Unpaid, message: '미수금 상태가 변경되었습니다.' };
  } catch (err) {
    console.error('updateUnpaidStatus 오류:', err);
    throw err;
  }
};

/** 미수금 통계 조회 */
export const getUnpaidStats = async (branchId?: number): Promise<ApiResponse<UnpaidStats>> => {
  const resolvedBranchId = branchId ?? getBranchId();

  try {
    const { data, error } = await supabase
      .from('unpaid')
      .select('unpaidAmount, status')
      .eq('branchId', resolvedBranchId);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const totalCount = rows.length;
    const totalAmount = rows.reduce((sum, r) => sum + Number(r.unpaidAmount), 0);
    const pendingRows = rows.filter((r) => r.status === 'PENDING');
    const pendingCount = pendingRows.length;
    const pendingAmount = pendingRows.reduce((sum, r) => sum + Number(r.unpaidAmount), 0);

    return { success: true, data: { totalCount, totalAmount, pendingCount, pendingAmount } };
  } catch (err) {
    console.error('getUnpaidStats 오류:', err);
    throw err;
  }
};
