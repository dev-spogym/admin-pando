/**
 * 인증/권한 관련 헬퍼 함수
 * 멀티테넌트 아키텍처 지원
 */
import { useAuthStore } from '@/stores/authStore';

/** 현재 tenantId (localStorage fallback: 1) */
export const getCurrentTenantId = (): number => {
  const stored = localStorage.getItem('tenantId');
  return stored ? Number(stored) : 1;
};

/**
 * 현재 유효한 branchId 반환
 * 슈퍼관리자는 currentBranchId 우선, 없으면 기본 branchId
 */
export const getCurrentBranchId = (): number => {
  const user = useAuthStore.getState().user;
  if (user?.isSuperAdmin && user.currentBranchId) {
    return Number(user.currentBranchId);
  }
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 슈퍼관리자 여부 */
export const isSuperAdmin = (): boolean => {
  const user = useAuthStore.getState().user;
  return user?.isSuperAdmin ?? false;
};

/**
 * 역할 체크
 * 슈퍼관리자는 모든 권한 보유
 */
export const hasRole = (requiredRoles: string[]): boolean => {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  if (user.isSuperAdmin) return true; // 슈퍼관리자는 모든 권한
  return requiredRoles.includes(user.role);
};

/**
 * "전체 지점" 모드 여부
 * 슈퍼관리자가 특정 지점을 선택하지 않은 상태
 */
export const isAllBranchMode = (): boolean => {
  const user = useAuthStore.getState().user;
  return user?.isSuperAdmin === true && !user.currentBranchId;
};
