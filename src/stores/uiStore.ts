import { create } from 'zustand';

// UI 전역 상태 타입
interface UiState {
  // 사이드바 접힘 여부
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  // 현재 활성 경로
  activePath: string;
  setActivePath: (path: string) => void;
  // 화면설계서 모드
  designDocMode: boolean;
  toggleDesignDocMode: () => void;
  setDesignDocMode: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  activePath: '/',

  setActivePath: (path) => {
    set({ activePath: path });
  },

  designDocMode: false,

  toggleDesignDocMode: () => {
    set((state) => ({ designDocMode: !state.designDocMode }));
  },

  setDesignDocMode: (open) => {
    set({ designDocMode: open });
  },
}));
