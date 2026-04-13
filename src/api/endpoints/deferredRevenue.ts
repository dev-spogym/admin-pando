// 선수익금 API
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => { if (typeof window === "undefined") return 1;
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
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select('id, memberId, memberName, productName, saleDate, type, amount, salePrice, status, branchId')
    .eq('branchId', bid)
    .neq('status', 'REFUNDED')
    .order('saleDate', { ascending: false });

  if (salesError) return { data: null, error: salesError.message };

  const items: DeferredRevenueItem[] = (salesData ?? []).map((row: Record<string, unknown>, index: number) => {
    const total = Number(row.salePrice) || Number(row.amount) || 0;
    const saleDateRaw = (row.saleDate as string) ?? new Date().toISOString();
    const startDate = new Date(saleDateRaw);
    const upperType = String(row.type ?? '').toUpperCase();
    const upperProduct = String(row.productName ?? '').toUpperCase();
    const serviceDays =
      upperType.includes('PT') || upperProduct.includes('PT') ? 30 :
      upperProduct.includes('필라테스') || upperProduct.includes('요가') || upperProduct.includes('GX') ? 45 :
      upperProduct.includes('회원권') || upperProduct.includes('이용권') ? 90 :
      30;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + serviceDays);
    const today = new Date();
    const elapsedDays = Math.max(0, Math.min(serviceDays, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
    const progressPct = total > 0 ? Math.max(0, Math.min(100, Math.round((elapsedDays / serviceDays) * 100))) : 0;
    const recognized = Math.round(total * (progressPct / 100));
    const remaining = Math.max(total - recognized, 0);

    return {
      id: row.id as number,
      saleId: row.id as number,
      memberId: row.memberId as number,
      memberName: (row.memberName as string) ?? '',
      productName: (row.productName as string) ?? '',
      totalAmount: total,
      recognizedAmount: recognized,
      remainingAmount: remaining,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      progressPct,
      branchId: (row.branchId as number) ?? bid,
      createdAt: saleDateRaw || `${Date.now()}-${index}`,
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
