// 상품분류(product_groups) API
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

export interface ProductGroup {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  branchId: number;
  createdAt: string;
}

export async function getProductGroups(branchId?: number): Promise<{ data: ProductGroup[] | null; error: string | null }> {
  const bid = branchId ?? getBranchId();
  const { data, error } = await supabase
    .from('product_groups')
    .select('*')
    .eq('branchId', bid)
    .order('sortOrder', { ascending: true });

  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      name: (row.name as string) ?? '',
      sortOrder: Number(row.sortOrder) || 0,
      isActive: (row.isActive as boolean) ?? true,
      branchId: row.branchId as number,
      createdAt: (row.createdAt as string) ?? '',
    })),
    error: null,
  };
}

export async function createProductGroup(data: { name: string; sortOrder: number; isActive: boolean }): Promise<{ error: string | null }> {
  const { error } = await supabase.from('product_groups').insert({
    ...data,
    branchId: getBranchId(),
  });
  return { error: error?.message ?? null };
}

export async function updateProductGroup(id: number, data: Partial<{ name: string; sortOrder: number; isActive: boolean }>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('product_groups').update(data).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteProductGroup(id: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from('product_groups').delete().eq('id', id);
  return { error: error?.message ?? null };
}
