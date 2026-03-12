/**
 * 회원 관련 API 함수 - Supabase 연동
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** 회원 정보 */
export interface Member {
  id: number;
  name: string;
  phone: string;
  email?: string;
  gender: 'M' | 'F';
  birthDate?: string;
  profileImage?: string;
  registeredAt: string;
  membershipType: string;
  membershipStart?: string;
  membershipExpiry?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'HOLDING' | 'SUSPENDED';
  mileage?: number;
  memo?: string;
  height?: number;
  staffId?: number;
  deletedAt?: string;
  branchId: number;
  createdAt?: string;
  updatedAt?: string;
}

/** 회원 생성/수정 요청 */
export interface MemberRequest {
  name: string;
  phone: string;
  email?: string;
  gender: 'M' | 'F';
  birthDate?: string;
  profileImage?: string;
  membershipType: string;
  membershipStart?: string;
  membershipExpiry?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'HOLDING' | 'SUSPENDED';
  mileage?: number;
  memo?: string;
  height?: number;
  branchId?: number;
}

/** 회원 통계 */
export interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  holding: number;
  suspended: number;
  expiredThisMonth: number;
  newThisMonth: number;
}

/** Supabase row → Member 변환 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMember(row: Record<string, any>): Member {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    gender: row.gender,
    birthDate: row.birthDate ?? row.birth_date ?? undefined,
    profileImage: row.profileImage ?? row.profile_image ?? undefined,
    registeredAt: row.registeredAt ?? row.registered_at ?? row.created_at,
    membershipType: row.membershipType ?? row.membership_type ?? '',
    membershipStart: row.membershipStart ?? row.membership_start ?? undefined,
    membershipExpiry: row.membershipExpiry ?? row.membership_expiry ?? undefined,
    status: row.status ?? 'INACTIVE',
    mileage: row.mileage ?? 0,
    memo: row.memo ?? undefined,
    height: row.height ?? undefined,
    staffId: row.staffId ?? row.staff_id ?? undefined,
    deletedAt: row.deletedAt ?? row.deleted_at ?? undefined,
    branchId: row.branchId ?? row.branch_id ?? 1,
    createdAt: row.createdAt ?? row.created_at ?? undefined,
    updatedAt: row.updatedAt ?? row.updated_at ?? undefined,
  };
}

/** branchId 가져오기 (localStorage 또는 기본값 1) */
function getCurrentBranchId(): number {
  const raw = localStorage.getItem('branchId');
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return isNaN(parsed) ? 1 : parsed;
}

/** 회원 목록 조회 파라미터 */
export interface MemberListParams extends PaginationParams {
  search?: string;
  status?: string;
  gender?: string;
  staffId?: string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
}

/** 회원 목록 조회 */
export const getMembers = async (
  params?: MemberListParams
): Promise<ApiResponse<PaginatedResponse<Member>>> => {
  const page = params?.page ?? 1;
  const size = params?.size ?? 20;
  const branchId = getCurrentBranchId();

  let query = supabase
    .from('members')
    .select('*', { count: 'exact' })
    .eq('branchId', branchId)
    .is('deletedAt', null); // soft delete 필터

  if (params?.status && params.status !== 'all') {
    query = query.eq('status', params.status.toUpperCase());
  }

  if (params?.search) {
    const keyword = `%${params.search}%`;
    query = query.or(`name.ilike.${keyword},phone.ilike.${keyword}`);
  }

  // 성별 필터
  if (params?.gender && params.gender !== 'all') {
    query = query.eq('gender', params.gender === 'male' ? 'M' : 'F');
  }

  // 담당FC 필터
  if (params?.staffId) {
    query = query.eq('staffId', params.staffId);
  }

  const from = (page - 1) * size;
  const to = from + size - 1;

  // 서버사이드 정렬
  const orderCol = params?.sortKey || 'createdAt';
  const ascending = params?.sortDirection === 'asc';
  query = query.range(from, to).order(orderCol, { ascending });

  const { data, error, count } = await query;

  if (error) {
    return { success: false, data: { data: [], pagination: { page, size, total: 0, totalPages: 0 } }, message: error.message };
  }

  const total = count ?? 0;
  const members = (data ?? []).map(rowToMember);

  return {
    success: true,
    data: {
      data: members,
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
    },
  };
};

/** 회원 단건 조회 */
export const getMember = async (id: number): Promise<ApiResponse<Member>> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return { success: false, data: null as unknown as Member, message: error?.message ?? '회원을 찾을 수 없습니다.' };
  }

  return { success: true, data: rowToMember(data) };
};

/** 회원 생성 */
export const createMember = async (req: MemberRequest): Promise<ApiResponse<Member>> => {
  const branchId = req.branchId ?? getCurrentBranchId();

  const payload = {
    name: req.name,
    phone: req.phone,
    email: req.email ?? null,
    gender: req.gender,
    birthDate: req.birthDate ?? null,
    profileImage: req.profileImage ?? null,
    membershipType: req.membershipType,
    membershipStart: req.membershipStart ?? null,
    membershipExpiry: req.membershipExpiry ?? null,
    status: req.status ?? 'ACTIVE',
    mileage: req.mileage ?? 0,
    memo: req.memo ?? null,
    height: req.height ?? null,
    branchId,
    registeredAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('members')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    return { success: false, data: null as unknown as Member, message: error?.message ?? '회원 등록에 실패했습니다.' };
  }

  return { success: true, data: rowToMember(data), message: '회원이 등록되었습니다.' };
};

/** 회원 수정 */
export const updateMember = async (id: number, req: Partial<MemberRequest>): Promise<ApiResponse<Member>> => {
  // undefined 필드는 제외하고 전송
  const payload: Record<string, unknown> = {};
  if (req.name !== undefined) payload.name = req.name;
  if (req.phone !== undefined) payload.phone = req.phone;
  if (req.email !== undefined) payload.email = req.email;
  if (req.gender !== undefined) payload.gender = req.gender;
  if (req.birthDate !== undefined) payload.birthDate = req.birthDate;
  if (req.profileImage !== undefined) payload.profileImage = req.profileImage;
  if (req.membershipType !== undefined) payload.membershipType = req.membershipType;
  if (req.membershipStart !== undefined) payload.membershipStart = req.membershipStart;
  if (req.membershipExpiry !== undefined) payload.membershipExpiry = req.membershipExpiry;
  if (req.status !== undefined) payload.status = req.status;
  if (req.mileage !== undefined) payload.mileage = req.mileage;
  if (req.memo !== undefined) payload.memo = req.memo;
  if (req.height !== undefined) payload.height = req.height;
  payload.updatedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('members')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return { success: false, data: null as unknown as Member, message: error?.message ?? '회원 수정에 실패했습니다.' };
  }

  return { success: true, data: rowToMember(data), message: '회원 정보가 수정되었습니다.' };
};

/** 회원 삭제 (soft delete) */
export const deleteMember = async (id: number): Promise<ApiResponse<null>> => {
  const { error } = await supabase
    .from('members')
    .update({ deletedAt: new Date().toISOString(), status: 'INACTIVE' })
    .eq('id', id);

  if (error) {
    return { success: false, data: null, message: error.message };
  }

  return { success: true, data: null, message: '회원이 삭제되었습니다.' };
};

/** 회원 통계 조회 */
export const getMemberStats = async (): Promise<ApiResponse<MemberStats>> => {
  const branchId = getCurrentBranchId();
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  const base = () => supabase.from('members').select('id', { count: 'exact', head: true }).eq('branchId', branchId).is('deletedAt', null);

  const [totalRes, activeRes, inactiveRes, expiredRes, holdingRes, suspendedRes, expiredMonthRes, newRes] = await Promise.all([
    base(),
    base().eq('status', 'ACTIVE'),
    base().eq('status', 'INACTIVE'),
    base().eq('status', 'EXPIRED'),
    base().eq('status', 'HOLDING'),
    base().eq('status', 'SUSPENDED'),
    base().eq('status', 'EXPIRED').gte('membershipExpiry', firstOfMonth).lte('membershipExpiry', lastOfMonth),
    base().gte('registeredAt', firstOfMonth),
  ]);

  return {
    success: true,
    data: {
      total: totalRes.count ?? 0,
      active: activeRes.count ?? 0,
      inactive: inactiveRes.count ?? 0,
      expired: expiredRes.count ?? 0,
      holding: holdingRes.count ?? 0,
      suspended: suspendedRes.count ?? 0,
      expiredThisMonth: expiredMonthRes.count ?? 0,
      newThisMonth: newRes.count ?? 0,
    },
  };
};
