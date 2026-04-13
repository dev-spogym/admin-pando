// 상품분류(product_groups) API
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => { if (typeof window === "undefined") return 1;
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
    .eq('branch_id', bid)
    .order('sort_order', { ascending: true });

  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      name: (row.name as string) ?? '',
      sortOrder: Number(row.sort_order) || 0,
      isActive: (row.is_active as boolean) ?? true,
      branchId: (row.branch_id as number),
      createdAt: (row.created_at as string) ?? '',
    })),
    error: null,
  };
}

export async function createProductGroup(data: { name: string; sortOrder: number; isActive: boolean }): Promise<{ error: string | null }> {
  const { error } = await supabase.from('product_groups').insert({
    name: data.name,
    sort_order: data.sortOrder,
    is_active: data.isActive,
    branch_id: getBranchId(),
  });
  return { error: error?.message ?? null };
}

export async function updateProductGroup(id: number, data: Partial<{ name: string; sortOrder: number; isActive: boolean }>): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbData: Record<string, any> = {};
  if (data.name !== undefined) dbData.name = data.name;
  if (data.sortOrder !== undefined) dbData.sort_order = data.sortOrder;
  if (data.isActive !== undefined) dbData.is_active = data.isActive;
  const { error } = await supabase.from('product_groups').update(dbData).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteProductGroup(id: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from('product_groups').delete().eq('id', id);
  return { error: error?.message ?? null };
}
