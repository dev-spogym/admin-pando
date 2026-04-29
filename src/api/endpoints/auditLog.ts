/**
 * 히스토리 로그 API (Supabase 연동)
 * - 슈퍼관리자/센터장 전용 히스토리 로그 조회
 * - 모든 중요 활동 자동 기록
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** 히스토리 로그 항목 */
export interface AuditLogEntry {
  id: number;
  tenantId: number;
  userId: number;
  userName?: string;
  action: string; // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, BRANCH_SWITCH, ROLE_CHANGE, EXPORT 등
  targetType?: string; // member, staff, sale, branch, settings 등
  targetId?: number;
  fromBranchId?: number;
  toBranchId?: number;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  detail?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

/** 히스토리 로그 조회 파라미터 */
export interface AuditLogParams extends PaginationParams {
  action?: string;
  userId?: number;
  targetType?: string;
  fromDate?: string;
  toDate?: string;
  branchId?: number;
}

/** tenantId 가져오기 */
const getTenantId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('tenantId');
  return stored ? Number(stored) : 1;
};

/** 히스토리 로그 목록 조회 */
export const getAuditLogs = async (
  params?: AuditLogParams
): Promise<ApiResponse<PaginatedResponse<AuditLogEntry>>> => {
  // tenantId 필터 필수
  // params의 각 필터 조건 적용
  // order by createdAt desc
  // pagination 처리
  try {
    const page = params?.page ?? 1;
    const size = params?.size ?? 50;
    const from = (page - 1) * size;
    const to = from + size - 1;

    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('tenantId', getTenantId())
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (params?.action) query = query.eq('action', params.action);
    if (params?.userId) query = query.eq('userId', params.userId);
    if (params?.targetType) query = query.eq('targetType', params.targetType);
    if (params?.branchId) query = query.eq('fromBranchId', params.branchId);
    if (params?.fromDate) query = query.gte('createdAt', params.fromDate);
    if (params?.toDate) query = query.lte('createdAt', params.toDate);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? 0;
    return {
      success: true,
      data: {
        data: (data ?? []) as AuditLogEntry[],
        pagination: { page, size, total, totalPages: Math.ceil(total / size) },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '히스토리 로그 조회에 실패했습니다.';
    return { success: false, data: { data: [], pagination: { page: 1, size: 50, total: 0, totalPages: 0 } }, message };
  }
};

/** 히스토리 로그 기록 (다른 API에서 호출) */
export const createAuditLog = async (entry: {
  action: string;
  targetType?: string;
  targetId?: number;
  fromBranchId?: number;
  toBranchId?: number;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  detail?: Record<string, unknown>;
}): Promise<void> => {
  try {
    // localStorage에서 현재 사용자 정보 가져오기
    const userRaw = localStorage.getItem('auth_user');
    const user = userRaw ? JSON.parse(userRaw) : null;

    await supabase.from('audit_log').insert({
      tenantId: getTenantId(),
      userId: user?.id ? Number(user.id) : 0,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      fromBranchId: entry.fromBranchId ?? null,
      toBranchId: entry.toBranchId ?? null,
      beforeValue: entry.beforeValue ?? null,
      afterValue: entry.afterValue ?? null,
      detail: entry.detail ?? null,
      ipAddress: null, // 브라우저에서는 직접 가져올 수 없음
      userAgent: navigator.userAgent,
    });
  } catch {
    // 히스토리 로그 실패는 조용히 무시 (메인 동작 차단하지 않음)
    console.error('히스토리 로그 기록 실패');
  }
};

/** 히스토리 로그 액션 타입 상수 */
export const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  BRANCH_SWITCH: 'BRANCH_SWITCH',
  ROLE_CHANGE: 'ROLE_CHANGE',
  RESIGN: 'RESIGN',
  TRANSFER: 'TRANSFER',
  LEAVE_START: 'LEAVE_START',
  LEAVE_END: 'LEAVE_END',
  MEMBER_TRANSFER: 'MEMBER_TRANSFER',
  MEMBER_WITHDRAW: 'MEMBER_WITHDRAW',
  REFUND: 'REFUND',
  EXPORT: 'EXPORT',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  BRANCH_CREATE: 'BRANCH_CREATE',
  BRANCH_CLOSE: 'BRANCH_CLOSE',
  SUPER_ADMIN_GRANT: 'SUPER_ADMIN_GRANT',
  SUPER_ADMIN_REVOKE: 'SUPER_ADMIN_REVOKE',
} as const;
