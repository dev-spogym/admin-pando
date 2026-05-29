import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  Search,
  Plus,
  ChevronDown,
  Check,
  User,
  Lock,
  LogOut,
  X,
  Eye,
  EyeOff,
  Loader2,
  ClipboardList,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import { moveToPage } from "@/internal";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { normalizeRole, hasPermission } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { changePassword } from "@/api/endpoints/auth";
import { readBranchJson } from "@/lib/branchStorage";
import { getBranchScope } from "@/lib/branchScope";
import { OPEN_GLOBAL_SEARCH_EVENT } from "@/components/layout/GlobalSearch";

// ─── 타입 정의 ─────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  branchName?: string;
  userName?: string;
  notificationCount?: number;
}

interface Branch {
  id: number;
  name: string;
}

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

function getBranchId(): string {
  return String(getBranchScope().branchId);
}

/** 즐겨찾기 회원 ID 목록 가져오기 */
async function getFavoriteIds(): Promise<number[]> {
  return readBranchJson<number[]>('favorites', [], getBranchId());
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────────

const AppHeader = ({
  onToggleSidebar,
  branchName: branchNameProp,
  userName: userNameProp,
}: AppHeaderProps) => {
  const authUser = useAuthStore((s) => s.user);
  const setBranch = useAuthStore((s) => s.setBranch);
  const designDocMode = useUiStore((s) => s.designDocMode);
  const toggleDesignDocMode = useUiStore((s) => s.toggleDesignDocMode);

  // props 우선, 없으면 스토어 값 사용
  const displayBranchName = branchNameProp ?? authUser?.branchName ?? 'FitGenie CRM';
  const displayUserName = userNameProp ?? authUser?.name ?? '사용자';

  // ── 드롭다운 열림 상태: 하나만 열리도록 단일 키로 관리 ──
  type DropdownKey = 'branch' | 'profile' | null;
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);

  const toggleDropdown = (key: DropdownKey) =>
    setOpenDropdown((prev) => (prev === key ? null : key));

  // ── 비밀번호 변경 모달 ──
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);

  // ── 지점 목록 ──
  const [branches, setBranches] = useState<Branch[]>([]);

  // ── 즐겨찾기 회원 입장 실시간 알림 (Supabase Realtime) ──
  // 알림 센터(사이드바 NotificationCenter)가 SCR-104 단일 진입점이므로
  // 헤더에는 별도 알림 목록 UI를 두지 않고, 즐겨찾기 입장 토스트/브라우저 알림만 발생시킨다.
  useEffect(() => {
    let favoriteIds: number[] = [];
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      favoriteIds = await getFavoriteIds();
      if (favoriteIds.length === 0) return;

      channel = supabase
        .channel('favorite-attendance')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attendance',
            filter: `branchId=eq.${getBranchId()}`,
          },
          (payload: any) => {
            const record = payload.new;
            if (!record || !favoriteIds.includes(record.memberId)) return;

            const memberName = record.memberName || '회원';

            // toast 알림
            toast.info(`⭐ ${memberName}님 입장! 즐겨찾기 회원입니다.`, { duration: 8000 });

            // 브라우저 알림 (권한 있을 때)
            if (Notification && (window as any).Notification?.permission === 'granted') {
              new (window as any).Notification('즐겨찾기 회원 입장', {
                body: `${memberName}님이 센터에 입장했습니다.`,
                icon: '/favicon.ico',
              });
            }
          }
        )
        .subscribe();
    };

    setup();

    // 브라우저 알림 권한 요청
    if ((window as any).Notification && (window as any).Notification.permission === 'default') {
      (window as any).Notification.requestPermission();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ── 외부 클릭 시 모든 드롭다운 닫기 ──
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // ── 지점 목록 조회 (브랜치 드롭다운 열릴 때) ──
  useEffect(() => {
    if (openDropdown !== 'branch') return;
    (async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      if (!error && data) setBranches(data as Branch[]);
    })();
  }, [openDropdown]);

  // 회원/직원/수업/상품 통합 검색은 GlobalSearch 오버레이(SCR-103)로 일원화됨.
  // 상단 검색창은 트리거 버튼으로만 동작한다.

  // ── 지점 전환 ──
  const handleBranchSelect = (branch: Branch) => {
    setBranch(String(branch.id), branch.name);
    setOpenDropdown(null);
    // 데이터 재로드를 위해 페이지 새로고침
    window.location.reload();
  };

  const handleAllBranchSelect = () => {
    setBranch('all', '전체 지점 (통합)');
    setOpenDropdown(null);
    window.location.reload();
  };

  // ── 로그아웃 ──
  const handleLogout = () => {
    setOpenDropdown(null);
    useAuthStore.getState().logout();
    moveToPage(990);
  };

  // ─── 렌더 ────────────────────────────────────────────────────────────────────

  return (
    <header
      ref={headerRef}
      className="relative z-40 flex h-[72px] shrink-0 items-center justify-between border-b border-line/80 bg-white/72 px-lg backdrop-blur-xl"
    >
      {/* ── Left ── */}
      <div className="flex items-center gap-md">
        {/* 사이드바 토글 */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl text-content-secondary transition-colors hover:bg-white/75 hover:text-content"
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>

        {/* 지점 전환 드롭다운 트리거 */}
        <div className="relative">
          <button
            className="app-control flex h-10 items-center gap-sm rounded-2xl px-md cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => toggleDropdown('branch')}
          >
            <span className="text-[13px] font-semibold text-content">{displayBranchName}</span>
            <ChevronDown
              className={`text-content-tertiary transition-transform ${openDropdown === 'branch' ? 'rotate-180' : ''}`}
              size={14}
            />
          </button>

          {/* 지점 드롭다운 */}
          {openDropdown === 'branch' && (
            <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line/80 bg-white/95 shadow-card-deep backdrop-blur-xl">
              <div className="px-md py-sm border-b border-line">
                <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wide">지점 선택</span>
              </div>
              <ul className="py-xs max-h-60 overflow-y-auto">
                {authUser?.isSuperAdmin && (
                  <li>
                    <button
                      className={`flex w-full items-center justify-between px-md py-[9px] text-[13px] hover:bg-surface-secondary transition-colors ${
                        !authUser.currentBranchId ? 'text-primary font-semibold' : 'text-content'
                      }`}
                      onClick={handleAllBranchSelect}
                    >
                      <span>전체 지점 (통합)</span>
                      {!authUser.currentBranchId && <Check size={14} className="text-primary" />}
                    </button>
                  </li>
                )}
                {branches.length === 0 ? (
                  <li className="px-md py-sm text-[13px] text-content-tertiary">지점 정보 없음</li>
                ) : (
                  branches.map((b) => {
                    const isActive = String(b.id) === getBranchId();
                    return (
                      <li key={b.id}>
                        <button
                          className={`flex w-full items-center justify-between px-md py-[9px] text-[13px] hover:bg-surface-secondary transition-colors ${
                            isActive ? 'text-primary font-semibold' : 'text-content'
                          }`}
                          onClick={() => handleBranchSelect(b)}
                        >
                          <span>{b.name}</span>
                          {isActive && <Check size={14} className="text-primary" />}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Center: 글로벌 검색 트리거 (SCR-103, Cmd+K) ── */}
      <div className="mx-xl flex-1 max-w-[440px]">
        <button
          type="button"
          aria-label="통합 검색 열기"
          className="app-control flex h-10 w-full items-center gap-sm rounded-2xl pl-3 pr-2 text-left transition-all hover:border-primary/40"
          onClick={() => window.dispatchEvent(new Event(OPEN_GLOBAL_SEARCH_EVENT))}
        >
          <Search size={16} className="shrink-0 text-content-tertiary" />
          <span className="flex-1 truncate text-[13px] text-content-tertiary">회원, 직원, 수업, 상품 검색...</span>
          <kbd className="hidden shrink-0 items-center rounded border border-line bg-surface-secondary px-1.5 py-0.5 text-[11px] text-content-tertiary sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-sm">
        <div className="relative group">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl text-content-secondary transition-colors hover:bg-white/75 hover:text-content"
            onClick={() => window.location.assign('/publishing')}
          >
            <LayoutGrid size={18} />
          </button>
          <span className="absolute -bottom-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-content px-2 py-1 text-[11px] text-white opacity-0 transition-opacity pointer-events-none group-hover:opacity-100">
            퍼블리싱 갤러리
          </span>
        </div>

        {/* ── 화면설계서 모드 토글 ── */}
        <div className="relative group">
          <button
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              designDocMode
                ? 'bg-primary/10 text-primary'
                : 'text-content-secondary hover:bg-white/75 hover:text-content'
            }`}
            onClick={toggleDesignDocMode}
          >
            <ClipboardList size={18} />
          </button>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-content px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            화면설계서 모드 (⌘/)
          </span>
        </div>

        {/* 알림은 사이드바 알림 센터(SCR-104)로 일원화되어 헤더에서 제거됨 */}

        {/* ── 프로필 드롭다운 ── */}
        <div className="relative">
          <button
            className="ml-sm flex items-center gap-sm border-l border-line/80 pl-sm cursor-pointer transition-opacity hover:opacity-80"
            onClick={() => toggleDropdown('profile')}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light text-primary text-[12px] font-bold">
              {displayUserName.substring(0, 1)}
            </div>
            <span className="hidden lg:block text-[13px] font-medium text-content">{displayUserName}</span>
            <ChevronDown
              className={`text-content-tertiary transition-transform ${openDropdown === 'profile' ? 'rotate-180' : ''}`}
              size={12}
            />
          </button>

          {/* 프로필 드롭다운 패널 */}
          {openDropdown === 'profile' && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line/80 bg-white/95 shadow-card-deep backdrop-blur-xl">
              {/* 사용자 정보 헤더 */}
              <div className="px-md py-sm border-b border-line">
                <div className="flex items-center gap-sm">
                  <div className="h-9 w-9 rounded-full bg-primary-light flex items-center justify-center text-primary text-[14px] font-bold shrink-0">
                    {displayUserName.substring(0, 1)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-content truncate">{displayUserName}</span>
                    {authUser?.email && (
                      <span className="text-[11px] text-content-tertiary truncate">{authUser.email}</span>
                    )}
                    {authUser?.role && (
                      <span className="text-[11px] text-primary font-medium">{authUser.role}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 메뉴 항목 */}
              <ul className="py-xs">
                <li>
                  <button
                    className="flex w-full items-center gap-sm px-md py-[9px] text-[13px] text-content hover:bg-surface-secondary transition-colors"
                    onClick={() => {
                      setOpenDropdown(null);
                      toast.info(`${displayUserName} (${authUser?.role || '사용자'}) | 지점: ${displayBranchName}`);
                    }}
                  >
                    <User size={15} className="text-content-tertiary" />
                    내 정보
                  </button>
                </li>
                <li>
                  <button
                    className="flex w-full items-center gap-sm px-md py-[9px] text-[13px] text-content hover:bg-surface-secondary transition-colors"
                    onClick={() => {
                      setOpenDropdown(null);
                      setPwForm({ current: '', new: '', confirm: '' });
                      setShowPasswordModal(true);
                    }}
                  >
                    <Lock size={15} className="text-content-tertiary" />
                    비밀번호 변경
                  </button>
                </li>
              </ul>

              {/* 구분선 + 로그아웃 */}
              <div className="border-t border-line py-xs">
                <button
                  className="flex w-full items-center gap-sm px-md py-[9px] text-[13px] text-danger hover:bg-danger/5 transition-colors"
                  onClick={handleLogout}
                >
                  <LogOut size={15} className="text-danger" />
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 회원 등록 버튼 — /members/new 접근 권한이 있는 역할만 표시 */}
        {hasPermission(authUser?.role ?? '', '/members/new', authUser?.isSuperAdmin) && (
          <button
            className="ml-sm flex h-10 items-center gap-xs rounded-2xl bg-gradient-to-r from-primary to-[#ff907f] px-md text-[13px] font-semibold text-white shadow-sm transition-all hover:translate-y-[-1px] hover:shadow-float active:scale-[0.98]"
            onClick={() => moveToPage(986)}
          >
            <Plus size={16} />
            <span>회원등록</span>
          </button>
        )}
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-surface rounded-xl shadow-lg border border-line w-full max-w-[400px] mx-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h3 className="text-[15px] font-bold text-content">비밀번호 변경</h3>
              <button className="text-content-tertiary hover:text-content transition-colors" onClick={() => setShowPasswordModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form
              className="p-lg space-y-md"
              onSubmit={async (e) => {
                e.preventDefault();
                if (pwForm.new.length < 6) { toast.error('새 비밀번호는 6자 이상이어야 합니다.'); return; }
                if (pwForm.new !== pwForm.confirm) { toast.error('새 비밀번호가 일치하지 않습니다.'); return; }
                setPwLoading(true);
                try {
                  const res = await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.new });
                  if (res.success) {
                    toast.success('비밀번호가 변경되었습니다.');
                    setShowPasswordModal(false);
                  } else {
                    toast.error(res.message || '비밀번호 변경에 실패했습니다.');
                  }
                } catch {
                  toast.error('비밀번호 변경 중 오류가 발생했습니다.');
                } finally {
                  setPwLoading(false);
                }
              }}
            >
              <div>
                <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">현재 비밀번호</label>
                <div className="relative">
                  <input
                    type={showPwCurrent ? 'text' : 'password'}
                    className="w-full h-[40px] px-md pr-10 bg-surface-secondary rounded-lg text-[13px] text-content border border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                    value={pwForm.current}
                    onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                    required
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary" onClick={() => setShowPwCurrent(!showPwCurrent)}>
                    {showPwCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">새 비밀번호</label>
                <div className="relative">
                  <input
                    type={showPwNew ? 'text' : 'password'}
                    className="w-full h-[40px] px-md pr-10 bg-surface-secondary rounded-lg text-[13px] text-content border border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                    value={pwForm.new}
                    onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary" onClick={() => setShowPwNew(!showPwNew)}>
                    {showPwNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[11px] text-content-tertiary mt-[2px]">6자 이상 입력하세요</p>
              </div>
              <div>
                <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">새 비밀번호 확인</label>
                <input
                  type="password"
                  className="w-full h-[40px] px-md bg-surface-secondary rounded-lg text-[13px] text-content border border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-sm pt-sm">
                <button
                  type="button"
                  className="flex-1 h-[40px] rounded-lg border border-line text-[13px] font-medium text-content-secondary hover:bg-surface-secondary transition-colors"
                  onClick={() => setShowPasswordModal(false)}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 h-[40px] rounded-lg bg-primary text-[13px] font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-xs"
                >
                  {pwLoading ? <><Loader2 size={15} className="animate-spin" /> 변경 중...</> : '비밀번호 변경'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default AppHeader;

