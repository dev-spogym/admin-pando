import { create } from 'zustand';

// 사용자 정보 타입
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string;
  branchName: string;
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
  // 지점 변경
  setBranch: (branchId: string, branchName: string) => void;
}

const STORAGE_KEY_TOKEN = 'auth_token';
const STORAGE_KEY_USER = 'auth_user';

// localStorage에서 초기값 복원
function restoreFromStorage(): Pick<AuthState, 'user' | 'token' | 'isAuthenticated'> {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const userRaw = localStorage.getItem(STORAGE_KEY_USER);
    if (token && userRaw) {
      const user: User = JSON.parse(userRaw);
      return { user, token, isAuthenticated: true };
    }
  } catch {
    // 파싱 실패 시 초기화
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
  }
  return { user: null, token: null, isAuthenticated: false };
}

export const useAuthStore = create<AuthState>((set) => ({
  // localStorage에서 복원한 초기 상태
  ...restoreFromStorage(),

  login: (user, token) => {
    // localStorage에 저장
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    // localStorage 클리어
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    set({ user: null, token: null, isAuthenticated: false });
  },

  setBranch: (branchId, branchName) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, branchId, branchName };
      // 변경된 유저 정보를 localStorage에도 반영
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
}));
