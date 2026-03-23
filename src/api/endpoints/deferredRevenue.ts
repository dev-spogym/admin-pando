// 선수익금 API
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

export interface DeferredRevenueItem {
  id: number;
  saleId: number;
  memberId: number;
  memberName: string;
  productName: string;
  totalAmount: number;
  recognizedAmount: number;
  remainingAmount: number;
  startDate: string;
  endDate: string;
  progressPct: number;
  branchId: number;
  createdAt: string;
}

// 선수익금 목록 조회
export async function getDeferredRevenues(branchId?: number): Promise<{ data: DeferredRevenueItem[] | null; error: string | null }> {
  const bid = branchId ?? getBranchId();
  const { data, error } = await supabase
    .from('deferred_revenue')
    .select('*')
    .eq('branch_id', bid)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };

  const items: DeferredRevenueItem[] = (data ?? []).map((row: Record<string, unknown>) => {
    const total = Number(row.total_amount) || 0;
    const recognized = Number(row.recognized_amount) || 0;
    const remaining = total - recognized;
    const progressPct = total > 0 ? Math.round((recognized / total) * 100) : 0;
    return {
      id: row.id as number,
      saleId: (row.sale_id as number),
      memberId: (row.member_id as number),
      memberName: (row.member_name as string) ?? '',
      productName: (row.product_name as string) ?? '',
      totalAmount: total,
      recognizedAmount: recognized,
      remainingAmount: remaining,
      startDate: (row.start_date as string)?.slice(0, 10) ?? '',
      endDate: (row.end_date as string)?.slice(0, 10) ?? '',
      progressPct,
      branchId: (row.branch_id as number),
      createdAt: (row.created_at as string) ?? '',
    };
  });

  return { data: items, error: null };
}

// 특정 매출의 선수익금 계산 (일할 인식)
export async function calculateDeferredRevenue(saleId: number): Promise<{
  totalAmount: number;
  recognizedAmount: number;
  remainingAmount: number;
  progressPct: number;
} | null> {
  const { data, error } = await supabase
    .from('deferred_revenue')
    .select('total_amount, recognized_amount, start_date, end_date')
    .eq('sale_id', saleId)
    .single();

  if (error || !data) return null;

  const total = Number(data.total_amount) || 0;
  const startDate = new Date(data.start_date as string);
  const endDate = new Date(data.end_date as string);
  const today = new Date();

  // 일할 인식: (오늘까지 경과일 / 총 기간) * 총액
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
  const recognized = Math.round((elapsedDays / totalDays) * total);
  const remaining = total - recognized;
  const progressPct = total > 0 ? Math.round((recognized / total) * 100) : 0;

  return { totalAmount: total, recognizedAmount: recognized, remainingAmount: remaining, progressPct };
}
