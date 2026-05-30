import { supabase } from '@/lib/supabase';

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

const getTenantId = (): number => {
  if (typeof window === 'undefined') return 1;
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

export type SeasonalDiscountType = 'fixed_price' | 'fixed_amount' | 'percentage';

export interface ProductSeasonalPrice {
  id: number;
  branchId: number;
  name: string;
  productIds: number[];
  productNames: string[];
  primaryProductId: number | null;
  primaryProductName: string | null;
  originalPrice: number;
  discountedPrice: number;
  discountRate: number;
  discountType: SeasonalDiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  endedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSeasonalPricePayload {
  name: string;
  productIds: number[];
  productNames: string[];
  primaryProductId: number;
  primaryProductName: string;
  originalPrice: number;
  discountedPrice: number;
  discountRate: number;
  discountType: SeasonalDiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const mapSeason = (row: Record<string, unknown>): ProductSeasonalPrice => ({
  id: Number(row.id),
  branchId: Number(row.branchId),
  name: String(row.name ?? ''),
  productIds: Array.isArray(row.productIds) ? (row.productIds as unknown[]).map(Number) : [],
  productNames: Array.isArray(row.productNames) ? (row.productNames as string[]) : [],
  primaryProductId: row.primaryProductId == null ? null : Number(row.primaryProductId),
  primaryProductName: row.primaryProductName == null ? null : String(row.primaryProductName),
  originalPrice: Number(row.originalPrice ?? 0),
  discountedPrice: Number(row.discountedPrice ?? 0),
  discountRate: Number(row.discountRate ?? 0),
  discountType: (row.discountType as SeasonalDiscountType) ?? 'fixed_price',
  discountValue: Number(row.discountValue ?? 0),
  startDate: String(row.startDate ?? ''),
  endDate: String(row.endDate ?? ''),
  isActive: Boolean(row.isActive),
  endedAt: row.endedAt == null ? null : String(row.endedAt),
  createdBy: row.createdBy == null ? null : String(row.createdBy),
  createdAt: String(row.createdAt ?? ''),
  updatedAt: String(row.updatedAt ?? ''),
});

const logSeasonalPriceChange = async (
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  targetId: number,
  beforeValue: Record<string, unknown> | null,
  afterValue: Record<string, unknown> | null,
) => {
  const user = getCurrentUser();
  await supabase.from('audit_log').insert({
    tenantId: getTenantId(),
    userId: user.id,
    action,
    targetType: 'product_seasonal_price',
    targetId,
    fromBranchId: getBranchId(),
    beforeValue,
    afterValue,
    detail: {
      userName: user.name,
      title: `${action === 'CREATE' ? '등록' : action === 'UPDATE' ? '수정' : '삭제'}: ${afterValue?.name ?? beforeValue?.name ?? ''}`,
    },
    userAgent: typeof navigator === 'undefined' ? null : navigator.userAgent,
  }).then(() => undefined);
};

const toDbPayload = (payload: ProductSeasonalPricePayload) => ({
  name: payload.name,
  productIds: payload.productIds,
  productNames: payload.productNames,
  primaryProductId: payload.primaryProductId,
  primaryProductName: payload.primaryProductName,
  originalPrice: payload.originalPrice,
  discountedPrice: payload.discountedPrice,
  discountRate: payload.discountRate,
  discountType: payload.discountType,
  discountValue: payload.discountValue,
  startDate: payload.startDate,
  endDate: payload.endDate,
  isActive: payload.isActive,
});

export async function getProductSeasonalPrices(branchId?: number): Promise<{ data: ProductSeasonalPrice[]; error: string | null }> {
  const { data, error } = await supabase
    .from('product_seasonal_prices')
    .select('*')
    .eq('branchId', branchId ?? getBranchId())
    .order('startDate', { ascending: false })
    .order('id', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []).map(row => mapSeason(row as Record<string, unknown>)), error: null };
}

export async function createProductSeasonalPrice(
  payload: ProductSeasonalPricePayload,
): Promise<{ data: ProductSeasonalPrice | null; error: string | null }> {
  const user = getCurrentUser();
  const { data, error } = await supabase
    .from('product_seasonal_prices')
    .insert({
      ...toDbPayload(payload),
      branchId: getBranchId(),
      createdBy: user.name || null,
    })
    .select()
    .single();

  if (error || !data) return { data: null, error: error?.message ?? '시즌 특가 저장에 실패했습니다.' };
  const mapped = mapSeason(data as Record<string, unknown>);
  await logSeasonalPriceChange('CREATE', mapped.id, null, mapped as unknown as Record<string, unknown>);
  return { data: mapped, error: null };
}

export async function updateProductSeasonalPrice(
  id: number,
  payload: ProductSeasonalPricePayload,
): Promise<{ data: ProductSeasonalPrice | null; error: string | null }> {
  const { data: before } = await supabase.from('product_seasonal_prices').select('*').eq('id', id).maybeSingle();
  const { data, error } = await supabase
    .from('product_seasonal_prices')
    .update(toDbPayload(payload))
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return { data: null, error: error?.message ?? '시즌 특가 수정에 실패했습니다.' };
  const mapped = mapSeason(data as Record<string, unknown>);
  await logSeasonalPriceChange(
    'UPDATE',
    mapped.id,
    before ? (mapSeason(before as Record<string, unknown>) as unknown as Record<string, unknown>) : null,
    mapped as unknown as Record<string, unknown>,
  );
  return { data: mapped, error: null };
}

export async function endProductSeasonalPrice(id: number): Promise<{ error: string | null }> {
  const { data: before } = await supabase.from('product_seasonal_prices').select('*').eq('id', id).maybeSingle();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('product_seasonal_prices')
    .update({ isActive: false, endDate: today, endedAt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? '시즌 특가 종료에 실패했습니다.' };
  await logSeasonalPriceChange(
    'UPDATE',
    id,
    before ? (mapSeason(before as Record<string, unknown>) as unknown as Record<string, unknown>) : null,
    mapSeason(data as Record<string, unknown>) as unknown as Record<string, unknown>,
  );
  return { error: null };
}

export async function deleteProductSeasonalPrice(id: number): Promise<{ error: string | null }> {
  const { data: before } = await supabase.from('product_seasonal_prices').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('product_seasonal_prices').delete().eq('id', id);
  if (error) return { error: error.message };
  if (before) {
    await logSeasonalPriceChange(
      'DELETE',
      id,
      mapSeason(before as Record<string, unknown>) as unknown as Record<string, unknown>,
      null,
    );
  }
  return { error: null };
}
