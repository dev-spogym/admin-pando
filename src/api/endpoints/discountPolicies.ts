// 할인 정책(discount_policies) API
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => { if (typeof window === "undefined") return 1;
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
  conditions: Record<string, unknown> | null;
  isActive: boolean;
  branchId: number;
  createdAt: string;
}

export interface DiscountPolicyHistoryEntry {
  date: string;
  title: string;
  description: string;
}

const getTenantId = (): number => {
  if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem('tenantId');
  return stored ? Number(stored) : 1;
};

const getCurrentUser = (): { id: number; name: string } => {
  if (typeof window === 'undefined') return { id: 0, name: '' };
  try {
    const raw = localStorage.getItem('auth_user');
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      id: parsed?.id ? Number(parsed.id) : 0,
      name: parsed?.name ?? parsed?.email ?? '',
    };
  } catch {
    return { id: 0, name: '' };
  }
};

const mapPolicy = (row: Record<string, unknown>): DiscountPolicy => ({
  id: row.id as number,
  name: (row.name as string) ?? '',
  type: (row.type as 'percentage' | 'fixed') ?? 'percentage',
  value: Number(row.value) || 0,
  minDuration: row.minPeriod != null ? Number(row.minPeriod) : null,
  maxDiscount: row.maxDiscount != null ? Number(row.maxDiscount) : null,
  conditions: (row.conditions as Record<string, unknown> | null) ?? null,
  isActive: (row.isActive as boolean) ?? true,
  branchId: row.branchId as number,
  createdAt: (row.createdAt as string) ?? '',
});

const formatPolicyValue = (policy: Pick<DiscountPolicy, 'type' | 'value' | 'isActive'>): string => {
  const value = policy.type === 'percentage'
    ? `${policy.value}%`
    : `${Number(policy.value).toLocaleString()}원`;
  return `${value} · ${policy.isActive ? '활성' : '비활성'}`;
};

const writePolicyAudit = async (
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  targetId: number,
  beforeValue: DiscountPolicy | null,
  afterValue: DiscountPolicy | null,
) => {
  const user = getCurrentUser();
  const label = action === 'CREATE' ? '등록' : action === 'UPDATE' ? '수정' : '삭제';
  const policy = afterValue ?? beforeValue;
  await supabase.from('audit_log').insert({
    tenantId: getTenantId(),
    userId: user.id,
    action,
    targetType: 'discount_policy',
    targetId,
    fromBranchId: getBranchId(),
    beforeValue,
    afterValue,
    detail: {
      userName: user.name,
      title: `${label}: ${policy?.name ?? ''}`,
      description: policy ? formatPolicyValue(policy) : '',
    },
    userAgent: typeof navigator === 'undefined' ? null : navigator.userAgent,
  }).then(() => undefined);
};

export async function getDiscountPolicies(branchId?: number): Promise<{ data: DiscountPolicy[] | null; error: string | null }> {
  const bid = branchId ?? getBranchId();
  const { data, error } = await supabase
    .from('discount_policies')
    .select('*')
    .eq('branchId', bid)
    .order('createdAt', { ascending: false });

  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []).map((row: Record<string, unknown>) => mapPolicy(row)),
    error: null,
  };
}

export async function createDiscountPolicy(data: {
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minDuration: number | null;
  maxDiscount: number | null;
  conditions?: Record<string, unknown> | null;
  isActive: boolean;
}): Promise<{ data: DiscountPolicy | null; error: string | null }> {
  const { data: inserted, error } = await supabase.from('discount_policies').insert({
    name: data.name,
    type: data.type,
    value: data.value,
    minPeriod: data.minDuration,
    maxDiscount: data.maxDiscount,
    conditions: data.conditions ?? null,
    isActive: data.isActive,
    branchId: getBranchId(),
  }).select().single();
  if (error || !inserted) return { data: null, error: error?.message ?? '등록에 실패했습니다.' };
  const mapped = mapPolicy(inserted as Record<string, unknown>);
  await writePolicyAudit('CREATE', mapped.id, null, mapped);
  return { data: mapped, error: null };
}

export async function updateDiscountPolicy(id: number, data: Partial<{
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minDuration: number | null;
  maxDiscount: number | null;
  conditions: Record<string, unknown> | null;
  isActive: boolean;
}>): Promise<{ data: DiscountPolicy | null; error: string | null }> {
  const { data: before } = await supabase.from('discount_policies').select('*').eq('id', id).maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbData: Record<string, any> = {};
  if (data.name !== undefined) dbData.name = data.name;
  if (data.type !== undefined) dbData.type = data.type;
  if (data.value !== undefined) dbData.value = data.value;
  if (data.minDuration !== undefined) dbData.minPeriod = data.minDuration;
  if (data.maxDiscount !== undefined) dbData.maxDiscount = data.maxDiscount;
  if (data.conditions !== undefined) dbData.conditions = data.conditions;
  if (data.isActive !== undefined) dbData.isActive = data.isActive;
  const { data: updated, error } = await supabase.from('discount_policies').update(dbData).eq('id', id).select().single();
  if (error || !updated) return { data: null, error: error?.message ?? '수정에 실패했습니다.' };
  const mapped = mapPolicy(updated as Record<string, unknown>);
  await writePolicyAudit(
    'UPDATE',
    id,
    before ? mapPolicy(before as Record<string, unknown>) : null,
    mapped,
  );
  return { data: mapped, error: null };
}

export async function deleteDiscountPolicy(id: number): Promise<{ error: string | null }> {
  const { data: before } = await supabase.from('discount_policies').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('discount_policies').delete().eq('id', id);
  if (!error && before) {
    await writePolicyAudit('DELETE', id, mapPolicy(before as Record<string, unknown>), null);
  }
  return { error: error?.message ?? null };
}

export async function getDiscountPolicyHistory(): Promise<{ data: DiscountPolicyHistoryEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('createdAt, action, detail, beforeValue, afterValue')
    .eq('targetType', 'discount_policy')
    .eq('fromBranchId', getBranchId())
    .order('createdAt', { ascending: false })
    .limit(50);

  if (error) return { data: [], error: error.message };

  return {
    data: (data ?? []).map((row: Record<string, unknown>) => {
      const detail = (row.detail ?? {}) as Record<string, unknown>;
      const beforeValue = row.beforeValue as DiscountPolicy | null;
      const afterValue = row.afterValue as DiscountPolicy | null;
      const policy = afterValue ?? beforeValue;
      const action = row.action as string;
      const title = detail.title as string | undefined;
      const description = detail.description as string | undefined;
      return {
        date: new Date(row.createdAt as string).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        title: title ?? `${action === 'CREATE' ? '등록' : action === 'UPDATE' ? '수정' : '삭제'}: ${policy?.name ?? ''}`,
        description: description ?? (policy ? formatPolicyValue(policy) : ''),
      };
    }),
    error: null,
  };
}
