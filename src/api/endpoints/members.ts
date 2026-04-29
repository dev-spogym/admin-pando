/**
 * 회원 관련 API 함수 - Supabase 연동
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';
import { createAuditLog, AUDIT_ACTIONS } from './auditLog';
import { getPreviewScenario, isPreviewMode } from '@/lib/preview';
import {
  getPreviewMemberById,
  getPreviewMembers,
  getPreviewMemberStats,
  previewMembers,
} from '@/mocks/memberPreview';
import { getBranchScope } from '@/lib/branchScope';

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
  branchName?: string;
  createdAt?: string;
  updatedAt?: string;
  /** 관심회원 여부 */
  isFavorite?: boolean;
  /** 마지막 방문일 */
  lastVisitAt?: string;
  /** 회원구분: 일반/기명법인/무기명법인 */
  memberType?: string;
  /** 유입경로 */
  referralSource?: string;
  /** 법인 회사명 */
  companyName?: string;
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
  /** 관심회원 여부 */
  isFavorite?: boolean;
  /** 회원구분 */
  memberType?: string;
  /** 유입경로 */
  referralSource?: string;
  /** 법인 회사명 */
  companyName?: string;
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
  expiringCount: number;
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
    branchName: row.branchName ?? row.branch_name ?? undefined,
    createdAt: row.createdAt ?? row.created_at ?? undefined,
    updatedAt: row.updatedAt ?? row.updated_at ?? undefined,
    isFavorite: row.isFavorite ?? row.is_favorite ?? false,
    lastVisitAt: row.lastVisitAt ?? row.last_visit_at ?? undefined,
    memberType: row.memberType ?? row.member_type ?? undefined,
    referralSource: row.referralSource ?? row.referral_source ?? undefined,
    companyName: row.companyName ?? row.company_name ?? undefined,
  };
}

/** branchId 가져오기 (localStorage 또는 기본값 1) */
function getCurrentBranchId(): number {
  return getBranchScope().branchId;
}

async function getBranchNameMap() {
  const { data } = await supabase
    .from('branches')
    .select('id, name');
  return new Map((data ?? []).map((branch: { id: number; name: string }) => [branch.id, branch.name]));
}

/** 회원 목록 조회 파라미터 */
export interface MemberListParams extends PaginationParams {
  search?: string;
  status?: string;
  gender?: string;
  staffId?: string;
  product?: string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  /** 관심회원만 조회 */
  isFavorite?: boolean;
  /** 미방문 N일 초과 필터 (last_visit_at 기준) */
  daysNoVisit?: number;
  /** 회원구분 필터 */
  memberType?: string;
  /** 유입경로 필터 */
  referralSource?: string;
  /** 상품 ID 기준 구매 이력 있는 회원 조회 */
  productId?: number;
}

/** 회원 목록 조회 */
export const getMembers = async (
  params?: MemberListParams
): Promise<ApiResponse<PaginatedResponse<Member>>> => {
  const page = params?.page ?? 1;
  const size = params?.size ?? 20;

  if (isPreviewMode()) {
    const scenario = getPreviewScenario(undefined, 'default');
    const filteredMembers = getPreviewMembers({ ...params, page: 1, size: previewMembers.length }, scenario);
    const pagedMembers = getPreviewMembers(params, scenario);
    const total = filteredMembers.length;

    return {
      success: true,
      data: {
        data: pagedMembers,
        pagination: {
          page,
          size,
          total,
          totalPages: Math.max(1, Math.ceil(total / size)),
        },
      },
    };
  }

  const scope = getBranchScope();

  let query = supabase
    .from('members')
    .select('*', { count: 'exact' })
    .is('deletedAt', null); // soft delete 필터

  if (!scope.isAllBranches) {
    query = query.eq('branchId', scope.branchId);
  }

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

  // 계약상품(이용권) 필터
  if (params?.product && params.product !== 'all') {
    query = query.ilike('membershipType', `%${params.product}%`);
  }

  // 담당FC 필터
  if (params?.staffId) {
    query = query.eq('staffId', params.staffId);
  }

  // 관심회원 필터
  if (params?.isFavorite === true) {
    query = query.eq('isFavorite', true);
  }

  // 미방문 N일 초과 필터 (lastVisitAt < 기준일)
  if (params?.daysNoVisit) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - params.daysNoVisit);
    query = query.lt('lastVisitAt', cutoff.toISOString());
  }

  // 회원구분 필터
  if (params?.memberType && params.memberType !== 'all') {
    query = query.eq('memberType', params.memberType);
  }

  // 유입경로 필터
  if (params?.referralSource && params.referralSource !== 'all') {
    query = query.eq('referralSource', params.referralSource);
  }

  // 상품별 회원 조회 (sales 테이블 조인 불가 → membershipType 기준 임시 필터)
  // PostgREST 에서 서브쿼리가 지원되지 않으므로 productId는 클라이언트에서 처리
  // (MemberList.tsx에서 상품 목록을 먼저 불러와 membershipType 문자열로 필터)

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
  const branchNameMap = await getBranchNameMap();
  const members = (data ?? []).map((row: Record<string, unknown>) =>
    rowToMember({
      ...row,
      branchName: branchNameMap.get(Number(row.branchId ?? row.branch_id)),
    }),
  );

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
  if (isPreviewMode()) {
    return { success: true, data: getPreviewMemberById(id) };
  }

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return { success: false, data: null as unknown as Member, message: error?.message ?? '회원을 찾을 수 없습니다.' };
  }

  const branchNameMap = await getBranchNameMap();
  return {
    success: true,
    data: rowToMember({
      ...data,
      branchName: branchNameMap.get(Number(data.branchId ?? data.branch_id)),
    }),
  };
};

/** 회원 생성 */
export const createMember = async (req: MemberRequest): Promise<ApiResponse<Member>> => {
  if (isPreviewMode()) {
    const mockMember = {
      ...getPreviewMemberById(1001),
      ...req,
      id: 1999,
      branchId: req.branchId ?? 1,
      registeredAt: new Date().toISOString(),
    } as Member;
    return { success: true, data: mockMember, message: '프리뷰 모드에서 회원 등록이 시뮬레이션되었습니다.' };
  }

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

  createAuditLog({ action: AUDIT_ACTIONS.CREATE, targetType: 'member', targetId: data.id, afterValue: { name: req.name, phone: req.phone } });
  return { success: true, data: rowToMember(data), message: '회원이 등록되었습니다.' };
};

/** 회원 수정 */
export const updateMember = async (id: number, req: Partial<MemberRequest>): Promise<ApiResponse<Member>> => {
  if (isPreviewMode()) {
    const mockMember = {
      ...getPreviewMemberById(id),
      ...req,
      id,
    } as Member;
    return { success: true, data: mockMember, message: '프리뷰 모드에서 회원 수정이 시뮬레이션되었습니다.' };
  }

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

  createAuditLog({ action: AUDIT_ACTIONS.UPDATE, targetType: 'member', targetId: id, afterValue: payload });
  return { success: true, data: rowToMember(data), message: '회원 정보가 수정되었습니다.' };
};

/** 회원 삭제 (soft delete) */
export const deleteMember = async (id: number): Promise<ApiResponse<null>> => {
  if (isPreviewMode()) {
    void id;
    return { success: true, data: null, message: '프리뷰 모드에서 회원 삭제가 시뮬레이션되었습니다.' };
  }

  const { error } = await supabase
    .from('members')
    .update({ deletedAt: new Date().toISOString(), status: 'INACTIVE' })
    .eq('id', id);

  if (error) {
    return { success: false, data: null, message: error.message };
  }

  createAuditLog({ action: AUDIT_ACTIONS.DELETE, targetType: 'member', targetId: id });
  return { success: true, data: null, message: '회원이 삭제되었습니다.' };
};

/** 관심회원 토글 */
export const toggleFavorite = async (memberId: number, isFavorite: boolean): Promise<ApiResponse<null>> => {
  if (isPreviewMode()) {
    void memberId;
    return { success: true, data: null, message: isFavorite ? '프리뷰 관심회원 등록' : '프리뷰 관심회원 해제' };
  }

  const { error } = await supabase
    .from('members')
    .update({ isFavorite, updatedAt: new Date().toISOString() })
    .eq('id', memberId);

  if (error) {
    return { success: false, data: null, message: error.message };
  }
  return { success: true, data: null, message: isFavorite ? '관심회원으로 등록되었습니다.' : '관심회원에서 해제되었습니다.' };
};

/** 회원 통계 조회 */
export const getMemberStats = async (): Promise<ApiResponse<MemberStats>> => {
  if (isPreviewMode()) {
    const scenario = getPreviewScenario(undefined, 'default');
    return {
      success: true,
      data: getPreviewMemberStats(scenario),
    };
  }

  const scope = getBranchScope();
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const base = () => {
    let query = supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .is('deletedAt', null);

    if (!scope.isAllBranches) {
      query = query.eq('branchId', scope.branchId);
    }

    return query;
  };

  const [totalRes, activeRes, inactiveRes, expiredRes, holdingRes, suspendedRes, expiredMonthRes, newRes, expiringRes] = await Promise.all([
    base(),
    base().eq('status', 'ACTIVE'),
    base().eq('status', 'INACTIVE'),
    base().eq('status', 'EXPIRED'),
    base().eq('status', 'HOLDING'),
    base().eq('status', 'SUSPENDED'),
    base().eq('status', 'EXPIRED').gte('membershipExpiry', firstOfMonth).lte('membershipExpiry', lastOfMonth),
    base().gte('registeredAt', firstOfMonth),
    base().eq('status', 'ACTIVE').gte('membershipExpiry', now.toISOString()).lte('membershipExpiry', in30Days),
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
      expiringCount: expiringRes.count ?? 0,
    },
  };
};
