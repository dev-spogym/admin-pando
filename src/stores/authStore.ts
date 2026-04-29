import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// 사용자 정보 타입
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string;
  branchName: string;
  // 멀티테넌트 신규 필드
  tenantId: string;
  isSuperAdmin: boolean;
  currentBranchId: string | null; // 슈퍼관리자 지점 전환용
}

// 스토어 상태 타입
interface AuthState {
  user: User | null;
  token: string | null;
  // computed: 인증 여부
  isAuthenticated: boolean;
  // 로그인: 상태 설정 + localStorage 저장
  login: (user: User, token: string) => void;
  // 로그아웃: 상태 초기화 + localStorage 클리어
  logout: () => void;
  // 지점 변경 (기존 호환성 유지 — 내부적으로 switchBranch 호출)
  setBranch: (branchId: string, branchName: string) => void;
  // 슈퍼관리자 지점 전환
  switchBranch: (branchId: string, branchName: string) => void;
}

const STORAGE_KEY_TOKEN = 'auth_token';
const STORAGE_KEY_USER = 'auth_user';

// localStorage에서 초기값 복원
function restoreFromStorage(): Pick<AuthState, 'user' | 'token' | 'isAuthenticated'> {
  if (typeof window === 'undefined') return { user: null, token: null, isAuthenticated: false };
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const userRaw = localStorage.getItem(STORAGE_KEY_USER);
    if (token && userRaw) {
      const parsed = JSON.parse(userRaw);
      // 기존 저장값에 신규 필드가 없을 경우 fallback 적용
      const user: User = {
        ...parsed,
        tenantId: parsed.tenantId ?? '1',
        isSuperAdmin: parsed.isSuperAdmin ?? false,
        currentBranchId: parsed.currentBranchId ?? null,
      };
      return { user, token, isAuthenticated: true };
    }
  } catch {
    // 파싱 실패 시 초기화
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
  }
  return { user: null, token: null, isAuthenticated: false };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // localStorage에서 복원한 초기 상태
  ...restoreFromStorage(),

  login: (user, token) => {
    const scopedBranchId = user.currentBranchId || user.branchId || '1';
    // localStorage에 저장
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    localStorage.setItem('branchId', scopedBranchId);
    localStorage.setItem('tenantId', user.tenantId);
    if (user.currentBranchId) {
      localStorage.setItem('currentBranchId', user.currentBranchId);
    } else {
      localStorage.removeItem('currentBranchId');
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    // localStorage 클리어 (신규 필드 포함)
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem('branchId');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('currentBranchId');
    set({ user: null, token: null, isAuthenticated: false });
  },

  // 슈퍼관리자 지점 전환: currentBranchId + branchId/branchName 모두 업데이트
  switchBranch: (branchId, branchName) => {
    set((state) => {
      if (!state.user) return state;
      const isAllBranches = branchId === '' || branchId === 'all';
      const scopedBranchId = isAllBranches ? (state.user.branchId || '1') : branchId;
      const updatedUser: User = {
        ...state.user,
        branchId: scopedBranchId,
        branchName: isAllBranches ? '전체 지점 (통합)' : branchName,
        currentBranchId: isAllBranches ? null : branchId,
      };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
      localStorage.setItem('branchId', scopedBranchId);
      if (isAllBranches) {
        localStorage.removeItem('currentBranchId');
      } else {
        localStorage.setItem('currentBranchId', branchId);
      }
      return { user: updatedUser };
    });
  },

  // 기존 setBranch — 호환성 유지, 내부적으로 switchBranch 호출
  setBranch: (branchId, branchName) => {
    get().switchBranch(branchId, branchName);
  },
}));

/**
 * Supabase Auth 세션 변경 리스너 초기화
 * main.tsx 또는 App.tsx에서 한 번만 호출
 * - 세션 만료(SIGNED_OUT) 시 자동 로그아웃
 * - 세션 갱신(TOKEN_REFRESHED) 시 토큰 업데이트
 */
export function initAuthListener() {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    const store = useAuthStore.getState();

    if (event === 'SIGNED_OUT' || !session) {
      // mock 토큰(fallback 로그인)인 경우 Supabase Auth 세션이 없어도 정상
      // SIGNED_OUT 이벤트만 처리 (초기 INITIAL_SESSION 등은 무시)
      if (store.isAuthenticated && store.token && !store.token.startsWith('mock-') && event === 'SIGNED_OUT') {
        store.logout();
      }
      return;
    }

    if (event === 'TOKEN_REFRESHED' && session) {
      // 토큰 갱신 → localStorage와 스토어의 토큰만 업데이트
      localStorage.setItem(STORAGE_KEY_TOKEN, session.access_token);
      useAuthStore.setState({ token: session.access_token });
    }
  });

  // 언마운트 시 구독 해제를 위한 cleanup 함수 반환
  return () => subscription.unsubscribe();
}

/**
 * 앱 시작 시 Supabase 세션 유효성 확인
 * localStorage 토큰이 있더라도 Supabase 세션이 만료됐으면 로그아웃 처리
 * mock 토큰(fallback 기간)은 검증 생략
 */
export async function restoreSupabaseSession() {
  const store = useAuthStore.getState();

  // 로그인 상태가 아니면 확인 불필요
  if (!store.isAuthenticated || !store.token) return;

  // mock 토큰은 Supabase Auth를 사용하지 않으므로 건너뜀
  if (store.token.startsWith('mock-')) return;

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Supabase 세션 없음 → 로그아웃 처리
    store.logout();
  }
}
