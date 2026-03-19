import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu,
  Search,
  Plus,
  Bell,
  ChevronDown,
  Check,
  User,
  Lock,
  LogOut,
  X,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { moveToPage } from "@/internal";
import { useAuthStore } from "@/stores/authStore";
import { normalizeRole, hasPermission } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { changePassword } from "@/api/endpoints/auth";

// ─── 타입 정의 ─────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  branchName?: string;
  userName?: string;
  notificationCount?: number;
}

interface MemberSearchResult {
  id: number;
  name: string;
  phone: string;
  status: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Notification {
  id: number;
  message: string;
  time: string;
  read: boolean;
}

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

function getBranchId(): string {
  return localStorage.getItem('branchId') || '1';
}

/** 지정 시간 이후 "n분 전" / "n시간 전" 형태로 반환 */
function formatRelativeTime(minutesAgo: number): string {
  if (minutesAgo < 1) return '방금 전';
  if (minutesAgo < 60) return `${minutesAgo}분 전`;
  const h = Math.floor(minutesAgo / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// ─── 하드코딩 알림 목록 ────────────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, message: '이용권 만료 임박 회원 3명이 있습니다.', time: formatRelativeTime(5), read: false },
  { id: 2, message: '미수금 알림: 미결제 회원 2명 확인 필요', time: formatRelativeTime(32), read: false },
  { id: 3, message: '새 회원 등록이 완료되었습니다.', time: formatRelativeTime(61), read: false },
];

/** 즐겨찾기 회원 ID 목록 가져오기 */
async function getFavoriteIds(): Promise<number[]> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('branchId', getBranchId())
    .eq('key', 'favorites')
    .single();
  if (!data?.value) return [];
  try { return JSON.parse(data.value); } catch { return []; }
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────────

const AppHeader = ({
  onToggleSidebar,
  branchName: branchNameProp,
  userName: userNameProp,
}: AppHeaderProps) => {
  const authUser = useAuthStore((s) => s.user);
  const setBranch = useAuthStore((s) => s.setBranch);

  // props 우선, 없으면 스토어 값 사용
  const displayBranchName = branchNameProp ?? authUser?.branchName ?? '스포짐';
  const displayUserName = userNameProp ?? authUser?.name ?? '사용자';

  // ── 드롭다운 열림 상태: 하나만 열리도록 단일 키로 관리 ──
  type DropdownKey = 'branch' | 'notification' | 'profile' | null;
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);

  const toggleDropdown = (key: DropdownKey) =>
    setOpenDropdown((prev) => (prev === key ? null : key));

  // ── 글로벌 검색 상태 ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 비밀번호 변경 모달 ──
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);

  // ── 지점 목록 ──
  const [branches, setBranches] = useState<Branch[]>([]);

  // ── 알림 상태 ──
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  // ── 즐겨찾기 회원 입장 실시간 알림 (Supabase Realtime) ──
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
            const now = new Date();
            const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

            // 알림 목록에 추가
            const newNotif: Notification = {
              id: Date.now(),
              message: `⭐ 즐겨찾기 회원 ${memberName}님이 입장했습니다. (${timeStr})`,
              time: '방금 전',
              read: false,
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 20));

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
        setShowSearchDrop(false);
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

  // ── 회원 검색 debounce ──
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (value.length < 2) {
      setSearchResults([]);
      setShowSearchDrop(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('members')
        .select('id, name, phone, status')
        .or(`name.ilike.%${value}%,phone.ilike.%${value}%`)
        .eq('branchId', getBranchId())
        .is('deletedAt', null)
        .limit(5);

      setIsSearching(false);
      if (!error && data) {
        setSearchResults(data as MemberSearchResult[]);
        setShowSearchDrop(true);
      }
    }, 300);
  }, []);

  // 검색 실행 (Enter 또는 돋보기 클릭)
  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    setShowSearchDrop(false);
    // /members?search=검색어 이동: internal.ts의 moveToPage 활용
    moveToPage(967);
    // React Router 파라미터 전달을 위해 직접 URL 조작
    setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('search', searchQuery.trim());
      window.history.replaceState(null, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, 50);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearchSubmit();
    if (e.key === 'Escape') {
      setShowSearchDrop(false);
      setSearchQuery('');
    }
  };

  // ── 지점 전환 ──
  const handleBranchSelect = (branch: Branch) => {
    setBranch(String(branch.id), branch.name);
    setOpenDropdown(null);
    // 데이터 재로드를 위해 페이지 새로고침
    window.location.reload();
  };

  // ── 알림 모두 읽음 처리 ──
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
      className="flex h-[56px] items-center justify-between border-b border-line bg-surface px-lg shrink-0 relative z-40"
    >
      {/* ── Left ── */}
      <div className="flex items-center gap-md">
        {/* 사이드바 토글 */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors"
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>

        {/* 지점 전환 드롭다운 트리거 */}
        <div className="relative">
          <button
            className="flex items-center gap-sm rounded-md bg-surface-secondary px-md py-[6px] cursor-pointer hover:bg-surface-tertiary transition-colors"
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
            <div className="absolute left-0 top-full mt-1 w-52 rounded-xl border border-line bg-surface shadow-lg z-50 overflow-hidden">
              <div className="px-md py-sm border-b border-line">
                <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wide">지점 선택</span>
              </div>
              <ul className="py-xs max-h-60 overflow-y-auto">
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

      {/* ── Center: 글로벌 회원 검색 ── */}
      <div className="flex-1 max-w-[420px] mx-xl" ref={searchRef}>
        <div className="relative">
          {/* 돋보기 아이콘 (클릭 시 검색 실행) */}
          <button
            className="absolute left-[12px] top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content transition-colors"
            onClick={handleSearchSubmit}
            tabIndex={-1}
          >
            <Search size={16} />
          </button>

          <input
            className="h-9 w-full rounded-lg border border-line bg-surface-secondary pl-9 pr-8 text-[13px] text-content placeholder:text-content-tertiary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
            type="text"
            placeholder="회원 이름, 연락처 검색..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchDrop(true);
              // 다른 드롭다운 닫기
              setOpenDropdown(null);
            }}
          />

          {/* 검색어 지우기 버튼 */}
          {searchQuery && (
            <button
              className="absolute right-[10px] top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content transition-colors"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchDrop(false);
              }}
            >
              <X size={14} />
            </button>
          )}

          {/* 검색 결과 드롭다운 */}
          {showSearchDrop && (
            <div className="absolute left-0 top-full mt-1 w-full rounded-xl border border-line bg-surface shadow-lg z-50 overflow-hidden">
              {isSearching ? (
                <div className="px-md py-sm text-[13px] text-content-tertiary">검색 중...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-md py-sm text-[13px] text-content-tertiary">검색 결과 없음</div>
              ) : (
                <ul className="py-xs">
                  {searchResults.map((member) => (
                    <li key={member.id}>
                      <button
                        className="flex w-full items-center gap-md px-md py-[9px] hover:bg-surface-secondary transition-colors text-left"
                        onClick={() => {
                          setShowSearchDrop(false);
                          setSearchQuery('');
                          moveToPage(985, { id: member.id });
                        }}
                      >
                        {/* 아바타 */}
                        <div className="h-7 w-7 shrink-0 rounded-full bg-primary-light flex items-center justify-center text-primary text-[11px] font-bold">
                          {member.name.substring(0, 1)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-medium text-content truncate">{member.name}</span>
                          <span className="text-[11px] text-content-tertiary">{member.phone}</span>
                        </div>
                        <span className={`ml-auto shrink-0 text-[11px] px-xs py-[2px] rounded-full font-medium ${
                          member.status === 'active'
                            ? 'bg-success/10 text-success'
                            : 'bg-surface-tertiary text-content-tertiary'
                        }`}>
                          {member.status === 'active' ? '활성' : '만료'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-sm">
        {/* ── 알림 드롭다운 ── */}
        <div className="relative">
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors"
            onClick={() => toggleDropdown('notification')}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {/* 알림 드롭다운 패널 */}
          {openDropdown === 'notification' && (
            <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-line bg-surface shadow-lg z-50 overflow-hidden">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-md py-sm border-b border-line">
                <span className="text-[13px] font-semibold text-content">알림</span>
                {unreadCount > 0 && (
                  <button
                    className="text-[11px] text-primary hover:underline"
                    onClick={handleMarkAllRead}
                  >
                    모두 읽음 처리
                  </button>
                )}
              </div>

              {/* 알림 목록 */}
              <ul className="divide-y divide-line max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`px-md py-[10px] flex items-start gap-sm ${n.read ? 'opacity-50' : ''}`}
                  >
                    {/* 읽지 않은 알림 점 */}
                    <span className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                    <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                      <span className="text-[13px] text-content leading-snug">{n.message}</span>
                      <span className="text-[11px] text-content-tertiary">{n.time}</span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 푸터 */}
              <div className="border-t border-line px-md py-sm">
                <button
                  className="w-full text-center text-[12px] text-content-tertiary hover:text-content transition-colors"
                  onClick={() => {
                    setOpenDropdown(null);
                    moveToPage(966); // 대시보드로 이동 (알림 목록 별도 페이지 없음)
                  }}
                >
                  전체 알림 보기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 프로필 드롭다운 ── */}
        <div className="relative">
          <button
            className="flex items-center gap-sm pl-sm ml-sm border-l border-line cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => toggleDropdown('profile')}
          >
            <div className="h-7 w-7 rounded-full bg-primary-light flex items-center justify-center text-primary text-[12px] font-bold">
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
            <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-line bg-surface shadow-lg z-50 overflow-hidden">
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
            className="ml-sm h-8 rounded-lg bg-primary px-md flex items-center gap-xs text-[13px] font-semibold text-white hover:bg-primary-dark active:scale-[0.97] transition-all"
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
