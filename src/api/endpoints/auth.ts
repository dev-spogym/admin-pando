/**
 * 인증 관련 API 함수
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse } from '../types';
import { createAuditLog, AUDIT_ACTIONS } from './auditLog';
import { isPreviewMode } from '@/lib/preview';
import { previewBranches } from '@/mocks/memberPreview';

/** 로그인 요청 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** 로그인 응답 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
    branchId: number;
    // 멀티테넌트 신규 필드
    tenantId: number;
    isSuperAdmin: boolean;
    currentBranchId: number | null;
  };
}

/** 비밀번호 변경 요청 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** 토큰 갱신 요청 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * users 테이블에서 username 기준으로 프로필 조회
 * Supabase Auth 성공 후 호출
 * tenantId, isSuperAdmin, currentBranchId는 DB에 없을 수 있으므로 fallback 처리
 */
const fetchUserProfile = async (username: string) => {
  const { data: rows, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('isActive', true)
    .single();

  if (error || !rows) return null;

  // 신규 멀티테넌트 필드 fallback (DB 컬럼 미존재 시 기본값 사용)
  return {
    ...rows,
    tenantId: rows.tenantId ?? 1,
    isSuperAdmin: rows.isSuperAdmin ?? false,
    currentBranchId: rows.currentBranchId ?? null,
  };
};

/** 로그인 */
export const login = async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  // 1단계: Supabase Auth로 로그인 시도 (email = username@spogym.local)
  const email = `${data.username}@spogym.local`;

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (!authError && authData.session) {
      // Supabase Auth 성공 → users 테이블에서 프로필 조회
      const profile = await fetchUserProfile(data.username);

      if (!profile) {
        return {
          success: false,
          data: null as unknown as LoginResponse,
          message: '사용자 프로필을 찾을 수 없습니다.',
        };
      }

      return {
        success: true,
        data: {
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          user: {
            id: profile.id,
            username: profile.username,
            name: profile.name,
            role: profile.role,
            branchId: profile.branchId,
            tenantId: profile.tenantId,
            isSuperAdmin: profile.isSuperAdmin,
            currentBranchId: profile.currentBranchId,
          },
        },
        message: '로그인 성공',
      };
    }
  } catch {
    // Supabase Auth 호출 자체가 실패한 경우 fallback으로 진행
  }

  // 2단계: Supabase Auth 실패 시 평문 비밀번호 방식으로 fallback
  // (마이그레이션 기간 호환 — seed-auth-users.ts 실행 전까지 유지)
  try {
    const { data: rows, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', data.username)
      .eq('password', data.password)
      .eq('isActive', true);

    if (error || !rows || rows.length === 0) {
      return {
        success: false,
        data: null as unknown as LoginResponse,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
      };
    }

    const user = rows[0];
    // fallback 기간에는 mock 토큰 사용
    const accessToken = `mock-access-token-${user.id}`;
    const refreshToken = `mock-refresh-token-${user.id}`;

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
          // fallback: DB에 없으면 기본값
          tenantId: user.tenantId ?? 1,
          isSuperAdmin: user.isSuperAdmin ?? false,
          currentBranchId: user.currentBranchId ?? null,
        },
      },
      message: '로그인 성공',
    };
  } catch {
    createAuditLog({ action: AUDIT_ACTIONS.LOGIN_FAILED, detail: { username: data.username } });
    return {
      success: false,
      data: null as unknown as LoginResponse,
      message: '아이디 또는 비밀번호가 올바르지 않습니다.',
    };
  }
};

/** 로그아웃 */
export const logout = async (): Promise<ApiResponse<null>> => {
  // 히스토리 로그 기록 (세션 종료 전에 기록)
  createAuditLog({ action: AUDIT_ACTIONS.LOGOUT });
  // Supabase Auth 세션 종료
  await supabase.auth.signOut();
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  return { success: true, data: null, message: '로그아웃 성공' };
};

/** 토큰 갱신 */
export const refreshToken = async (data: RefreshTokenRequest): Promise<ApiResponse<{ accessToken: string }>> => {
  void data;

  // Supabase Auth 세션이 있으면 자동 갱신된 토큰 반환
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    return { success: true, data: { accessToken: sessionData.session.access_token } };
  }

  return { success: true, data: { accessToken: 'new-mock-access-token' } };
};

/** 비밀번호 변경 */
export const changePassword = async (data: ChangePasswordRequest): Promise<ApiResponse<null>> => {
  try {
    // 1단계: 현재 비밀번호 확인 (Supabase Auth 세션 기반)
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session) {
      // Supabase Auth 사용자: updateUser API로 비밀번호 변경
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) {
        return { success: false, data: null, message: error.message || '비밀번호 변경에 실패했습니다.' };
      }

      return { success: true, data: null, message: '비밀번호가 변경되었습니다.' };
    }

    // 2단계: Fallback (평문 비밀번호 방식 — 마이그레이션 기간)
    // 현재 비밀번호 확인
    const { data: userRows, error: verifyError } = await supabase
      .from('users')
      .select('id')
      .eq('password', data.currentPassword)
      .eq('isActive', true);

    if (verifyError || !userRows || userRows.length === 0) {
      return { success: false, data: null, message: '현재 비밀번호가 올바르지 않습니다.' };
    }

    // 비밀번호 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: data.newPassword })
      .eq('id', userRows[0].id);

    if (updateError) {
      return { success: false, data: null, message: '비밀번호 변경에 실패했습니다.' };
    }

    return { success: true, data: null, message: '비밀번호가 변경되었습니다.' };
  } catch {
    return { success: false, data: null, message: '비밀번호 변경 중 오류가 발생했습니다.' };
  }
};

/** 로그인 화면용 지점 정보 */
export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  status: string;
}

/**
 * 지점 목록 조회 (로그인 화면용 — active 지점만)
 * tenantId 파라미터가 있으면 해당 테넌트의 지점만 반환 (슈퍼관리자 지점 필터)
 */
export const getBranches = async (tenantId?: number): Promise<ApiResponse<Branch[]>> => {
  if (isPreviewMode()) {
    void tenantId;
    return { success: true, data: previewBranches };
  }

  let query = supabase
    .from('branches')
    .select('id, name, address, phone, status')
    .order('id');

  // tenantId 필터링 — branches 테이블에 tenantId 컬럼이 있을 때만 적용
  // 현재 DB에 tenantId 컬럼 미존재 → 전체 지점 반환
  // if (tenantId !== undefined) {
  //   query = query.eq('tenantId', tenantId);
  // }

  const { data: branches, error } = await query;

  if (error) {
    return { success: false, data: [], message: '지점 목록을 불러오지 못했습니다.' };
  }

  return { success: true, data: branches ?? [] };
};
