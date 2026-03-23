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
    .eq('branch_id', bid)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      name: (row.name as string) ?? '',
      type: (row.type as 'percentage' | 'fixed') ?? 'percentage',
      value: Number(row.value) || 0,
      minDuration: row.min_period != null ? Number(row.min_period) : null,
      maxDiscount: row.max_discount != null ? Number(row.max_discount) : null,
      isActive: (row.is_active as boolean) ?? true,
      branchId: (row.branch_id as number),
      createdAt: (row.created_at as string) ?? '',
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
    name: data.name,
    type: data.type,
    value: data.value,
    min_period: data.minDuration,
    max_discount: data.maxDiscount,
    is_active: data.isActive,
    branch_id: getBranchId(),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbData: Record<string, any> = {};
  if (data.name !== undefined) dbData.name = data.name;
  if (data.type !== undefined) dbData.type = data.type;
  if (data.value !== undefined) dbData.value = data.value;
  if (data.minDuration !== undefined) dbData.min_period = data.minDuration;
  if (data.maxDiscount !== undefined) dbData.max_discount = data.maxDiscount;
  if (data.isActive !== undefined) dbData.is_active = data.isActive;
  const { error } = await supabase.from('discount_policies').update(dbData).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteDiscountPolicy(id: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from('discount_policies').delete().eq('id', id);
  return { error: error?.message ?? null };
}
