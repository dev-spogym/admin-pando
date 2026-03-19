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
    .eq('branchId', bid)
    .order('createdAt', { ascending: false });

  if (error) return { data: null, error: error.message };

  const items: DeferredRevenueItem[] = (data ?? []).map((row: Record<string, unknown>) => {
    const total = Number(row.totalAmount) || 0;
    const recognized = Number(row.recognizedAmount) || 0;
    const remaining = total - recognized;
    const progressPct = total > 0 ? Math.round((recognized / total) * 100) : 0;
    return {
      id: row.id as number,
      saleId: row.saleId as number,
      memberId: row.memberId as number,
      memberName: (row.memberName as string) ?? '',
      productName: (row.productName as string) ?? '',
      totalAmount: total,
      recognizedAmount: recognized,
      remainingAmount: remaining,
      startDate: (row.startDate as string)?.slice(0, 10) ?? '',
      endDate: (row.endDate as string)?.slice(0, 10) ?? '',
      progressPct,
      branchId: row.branchId as number,
      createdAt: (row.createdAt as string) ?? '',
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
    .select('totalAmount, recognizedAmount, startDate, endDate')
    .eq('saleId', saleId)
    .single();

  if (error || !data) return null;

  const total = Number(data.totalAmount) || 0;
  const startDate = new Date(data.startDate as string);
  const endDate = new Date(data.endDate as string);
  const today = new Date();

  // 일할 인식: (오늘까지 경과일 / 총 기간) * 총액
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
  const recognized = Math.round((elapsedDays / totalDays) * total);
  const remaining = total - recognized;
  const progressPct = total > 0 ? Math.round((recognized / total) * 100) : 0;

  return { totalAmount: total, recognizedAmount: recognized, remainingAmount: remaining, progressPct };
}
