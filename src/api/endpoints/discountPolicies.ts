// 할인 정책(discount_policies) API
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

export interface DiscountPolicy {
  id: number;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minDuration: number | null;
  maxDiscount: number | null;
  isActive: boolean;
  branchId: number;
  createdAt: string;
}

export async function getDiscountPolicies(branchId?: number): Promise<{ data: DiscountPolicy[] | null; error: string | null }> {
  const bid = branchId ?? getBranchId();
  const { data, error } = await supabase
    .from('discount_policies')
    .select('*')
    .eq('branchId', bid)
    .order('createdAt', { ascending: false });

  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      name: (row.name as string) ?? '',
      type: (row.type as 'percentage' | 'fixed') ?? 'percentage',
      value: Number(row.value) || 0,
      minDuration: row.minDuration != null ? Number(row.minDuration) : null,
      maxDiscount: row.maxDiscount != null ? Number(row.maxDiscount) : null,
      isActive: (row.isActive as boolean) ?? true,
      branchId: row.branchId as number,
      createdAt: (row.createdAt as string) ?? '',
    })),
    error: null,
  };
}

export async function createDiscountPolicy(data: {
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minDuration: number | null;
  maxDiscount: number | null;
  isActive: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('discount_policies').insert({
    ...data,
    branchId: getBranchId(),
  });
  return { error: error?.message ?? null };
}

export async function updateDiscountPolicy(id: number, data: Partial<{
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minDuration: number | null;
  maxDiscount: number | null;
  isActive: boolean;
}>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('discount_policies').update(data).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteDiscountPolicy(id: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from('discount_policies').delete().eq('id', id);
  return { error: error?.message ?? null };
}
