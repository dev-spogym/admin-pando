import { supabase } from '@/lib/supabase';

export const getCurrentBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

export async function loadBranchSetting<T>(key: string, fallback: T, branchId = getCurrentBranchId()): Promise<T> {
  const { data, error } = await supabase
    .from('branch_settings')
    .select('value')
    .eq('branchId', branchId)
    .eq('key', key)
    .maybeSingle();

  if (error || !data?.value) return fallback;
  return data.value as T;
}

export async function saveBranchSetting<T>(key: string, value: T, branchId = getCurrentBranchId()): Promise<string | null> {
  const { error } = await supabase
    .from('branch_settings')
    .upsert({
      branchId,
      key,
      value,
      updatedAt: new Date().toISOString(),
    }, { onConflict: 'branchId,key' });

  return error?.message ?? null;
}
