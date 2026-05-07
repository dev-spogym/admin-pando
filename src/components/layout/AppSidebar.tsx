import React, { useState, useEffect } from "react";
import {
  Home,
  Users,
  Calendar,
  TrendingUp,
  Package,
  Building2,
  DollarSign,
  MessageSquare,
  Settings,
  ChevronDown,
  LogOut,
  User,
  LayoutDashboard,
  BarChart3,
  Shield,
  CreditCard,
  Target,
  ClipboardList,
  FileText,
  BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { moveToPage } from "@/internal";
import { hasPermission, normalizeRole, ROLE_LABELS } from "@/lib/permissions";
import {
  APP_MENU_ITEMS,
  SUPER_ADMIN_MENU_ITEMS,
  getDefaultWorkspace,
  type NavigationIconKey,
  type NavigationMenuItem,
} from "@/lib/appNavigation";
import { getBranchesPaginated, type BranchDetail } from "@/api/endpoints/branches";
import { toast } from "sonner";
import NotificationCenter from "@/components/layout/NotificationCenter";

interface AppSidebarProps {
  collapsed?: boolean;
  onNavigate?: (path: string, viewId?: number) => void;
  activePath?: string;
}

const ICON_MAP: Record<NavigationIconKey, React.ElementType> = {
  home: Home,
  users: Users,
  calendar: Calendar,
  trendingUp: TrendingUp,
  package: Package,
  building2: Building2,
  dollarSign: DollarSign,
  messageSquare: MessageSquare,
  settings: Settings,
  layoutDashboard: LayoutDashboard,
  barChart3: BarChart3,
  shield: Shield,
  creditCard: CreditCard,
  target: Target,
  clipboardList: ClipboardList,
  fileText: FileText,
  bellRing: BellRing,
};

const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed = false,
  onNavigate,
  activePath = "/",
}) => {
  // 현재 경로에 해당하는 메뉴 그룹 자동 열기
  const [openMenus, setOpenMenus] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const item of APP_MENU_ITEMS) {
      if (item.children?.some((child) => activePath === child.path || activePath.startsWith(`${child.path}/`))) {
        initial.add(item.label);
      }
    }
    if (initial.size === 0) initial.add("회원"); // 기본값
    return initial;
  });

  // 지점 목록 상태 (슈퍼관리자 드롭다운용)
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  // 지점 검색 필터
  const [branchSearch, setBranchSearch] = useState("");

  const authUser = useAuthStore((s) => s.user);
  const switchBranch = useAuthStore((s) => s.switchBranch);
  const userRole = authUser?.role || '';
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isSuperAdmin = mounted ? (authUser?.isSuperAdmin ?? false) : false;

  // 슈퍼관리자인 경우 지점 목록 로드
  useEffect(() => {
    if (!isSuperAdmin) return;
    getBranchesPaginated({ page: 1, size: 100 }).then((res) => {
      if (res.success && res.data?.data) {
        setBranches(res.data.data);
      }
    });
  }, [isSuperAdmin]);

  useEffect(() => {
    const currentGroup = APP_MENU_ITEMS.find((item) =>
      item.children?.some((child) => activePath === child.path || activePath.startsWith(`${child.path}/`))
    );
    if (!currentGroup) return;
    setOpenMenus((prev) => {
      if (prev.has(currentGroup.label)) return prev;
      const next = new Set(prev);
      next.add(currentGroup.label);
      return next;
    });
  }, [activePath]);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleNavigate = (path: string, viewId?: number) => {
    onNavigate?.(path, viewId);
  };

  const matchesActivePath = (path?: string) => {
    if (!path) return false;
    return activePath === path || activePath.startsWith(`${path}/`);
  };

  const isMenuGroupActive = (item: NavigationMenuItem) => {
    if (matchesActivePath(item.path)) return true;
    return item.children?.some((child) => matchesActivePath(child.path)) ?? false;
  };

  // 슈퍼관리자 메뉴 항목 렌더링 (단일 항목, 자식 없음)
  const renderSuperAdminMenuItem = (item: NavigationMenuItem) => {
    const isActive = matchesActivePath(item.path);
    const Icon = ICON_MAP[item.iconKey];
    return (
      <div key={item.label} className="mb-px">
        <button
          className={cn(
            "group flex h-[40px] w-full items-center gap-[10px] rounded-xl px-[12px] text-[13px] font-semibold transition-all",
            isActive
              ? "bg-gradient-to-r from-primary-light via-primary-light to-white text-primary shadow-sm"
              : "text-content-secondary hover:bg-white/70 hover:text-content"
          )}
          onClick={() => item.path && handleNavigate(item.path, item.viewId)}
        >
          <Icon
            className={cn(
              "shrink-0",
              isActive ? "text-primary" : "text-content-tertiary group-hover:text-content-secondary"
            )}
            size={17}
            strokeWidth={isActive ? 2 : 1.5}
          />
          {!collapsed && (
            <span className="flex-1 text-left truncate">{item.label}</span>
          )}
        </button>
      </div>
    );
  };

  // 사용자 표시명 생성
  const getUserDisplayName = () => {
    if (!authUser) return '사용자';
    if (isSuperAdmin) return `[본사] ${authUser.name}`;
    if (authUser.branchName) return `[${authUser.branchName}] ${authUser.name}`;
    return authUser.name;
  };

  // 사용자 역할 표시명
  const getUserRoleLabel = () => {
    if (isSuperAdmin) return '슈퍼관리자';
    return ROLE_LABELS[normalizeRole(userRole)] || '지점';
  };

  const defaultWorkspace = getDefaultWorkspace(userRole, isSuperAdmin);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-line/80 bg-white/68 backdrop-blur-xl transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[236px]"
      )}
    >
      {/* 로고 */}
      <div className="flex h-[72px] items-center border-b border-line/80 px-lg shrink-0">
        {!collapsed ? (
          <div className="flex items-center justify-between w-full">
            <div
              className="flex items-center gap-sm cursor-pointer"
              onClick={() => handleNavigate(defaultWorkspace.path, defaultWorkspace.viewId)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-accent text-white text-[13px] font-black shadow-float">
                FG
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-black tracking-tight text-content">FitGenie CRM</span>
                <span className="text-[11px] font-medium text-content-tertiary">Publishing Workspace</span>
              </div>
            </div>
            <NotificationCenter collapsed={false} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-accent text-white text-[12px] font-black shadow-float cursor-pointer"
              onClick={() => handleNavigate(defaultWorkspace.path, defaultWorkspace.viewId)}
            >
              FG
            </div>
            <NotificationCenter collapsed={true} />
          </div>
        )}
      </div>

      {/* 슈퍼관리자 지점 전환 드롭다운 */}
      {isSuperAdmin && !collapsed && (
        <div className="px-3 py-2 border-b border-line">
          <label className="text-xs text-muted-foreground font-medium">지점 전환</label>
          {/* 지점 검색 input */}
          <div className="relative mt-1">
            <input
              type="text"
              placeholder="지점 검색..."
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="w-full px-2 py-1 pr-6 text-xs border border-line rounded-md bg-surface text-content placeholder:text-content-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {branchSearch && (
              <button
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content"
                onClick={() => setBranchSearch("")}
                aria-label="검색 초기화"
              >
                ×
              </button>
            )}
          </div>
          <select
            className="w-full mt-1 px-2 py-1.5 text-sm border border-line rounded-md bg-surface text-content focus:outline-none focus:ring-1 focus:ring-primary"
            value={authUser?.currentBranchId || 'all'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all') {
                switchBranch('', '전체 지점');
              } else {
                const branch = branches.find((b) => String(b.id) === val);
                if (branch) {
                  if (branch.status === 'CLOSED') {
                    toast.info('폐점된 지점입니다. 조회만 가능합니다.');
                  }
                  switchBranch(String(branch.id), branch.name);
                  // 최근 접속 지점 저장 (최대 3개)
                  try {
                    const key = 'recent_branches';
                    const prev: {id:string;name:string}[] = JSON.parse(localStorage.getItem(key) || '[]');
                    const updated = [{id:String(branch.id),name:branch.name}, ...prev.filter(p=>p.id!==String(branch.id))].slice(0,3);
                    localStorage.setItem(key, JSON.stringify(updated));
                  } catch {/* ignore */}
                }
              }
            }}
          >
            <option value="all">전체 지점 (통합)</option>
            {(() => {
              try {
                const recent: {id:string;name:string}[] = JSON.parse(localStorage.getItem('recent_branches') || '[]');
                if (recent.length > 0 && branchSearch.trim() === '') {
                  return [
                    <option key="__recent_label" disabled>── 최근 ──</option>,
                    ...recent.map(r => <option key={`recent-${r.id}`} value={r.id}>⏱ {r.name}</option>),
                    <option key="__all_label" disabled>── 전체 ──</option>,
                  ];
                }
              } catch {/* ignore */}
              return null;
            })()}
            {branches
              .filter((b) =>
                branchSearch.trim() === "" ||
                b.name.includes(branchSearch.trim())
              )
              .map((b) => {
                const suffix = b.status === 'SUSPENDED' ? ' (휴업)' : b.status === 'CLOSED' ? ' (폐점)' : '';
                return (
                  <option key={b.id} value={b.id}>{b.name}{suffix}</option>
                );
              })}
          </select>
        </div>
      )}

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto px-sm py-md scrollbar-hide">
        {/* 슈퍼관리자 전용 본사 관리 섹션 */}
        {isSuperAdmin && (
          <div className="mb-2">
            {!collapsed && (
              <p className="px-[12px] py-[8px] text-[10px] font-black uppercase tracking-[0.18em] text-content-tertiary">
                본사 관리
              </p>
            )}
            {SUPER_ADMIN_MENU_ITEMS.map(renderSuperAdminMenuItem)}
            {/* 구분선 */}
            <div className="mt-2 mb-1 border-b border-line" />
          </div>
        )}

        {/* 일반 메뉴 - 역할 기반 필터링 */}
        {APP_MENU_ITEMS.map((item) => {
          // 슈퍼관리자는 하위 메뉴 필터링 없이 전체 표시
          const filteredChildren = isSuperAdmin
            ? item.children
            : item.children?.filter((child) => hasPermission(userRole, child.path, isSuperAdmin));
          // 하위 메뉴가 모두 필터링되면 상위 메뉴도 숨김
          if (item.children && (!filteredChildren || filteredChildren.length === 0)) return null;
          if (!item.children && !isSuperAdmin && item.path && !hasPermission(userRole, item.path, isSuperAdmin)) return null;

          const Icon = ICON_MAP[item.iconKey];

          return (
            <div key={item.label} className="mb-px">
              <button
                className={cn(
                  "group flex h-[40px] w-full items-center gap-[10px] rounded-xl px-[12px] text-[13px] font-semibold transition-all",
                  isMenuGroupActive(item)
                    ? "bg-gradient-to-r from-primary-light via-primary-light to-white text-primary shadow-sm"
                    : "text-content-secondary hover:bg-white/70 hover:text-content"
                )}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                onClick={() => {
                  if (item.children) toggleMenu(item.label);
                  else if (item.path) handleNavigate(item.path, item.viewId);
                }}
              >
                <Icon
                  className={cn(
                    "shrink-0",
                    isMenuGroupActive(item) ? "text-primary" : "text-content-tertiary group-hover:text-content-secondary"
                  )}
                  size={17}
                  strokeWidth={isMenuGroupActive(item) ? 2 : 1.5}
                  aria-hidden="true"
                />
                {collapsed && <span className="sr-only">{item.label}</span>}
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.children && (
                      <ChevronDown
                        className={cn(
                          "text-content-tertiary transition-transform duration-200",
                          openMenus.has(item.label) && "rotate-180"
                        )}
                        size={14}
                      />
                    )}
                  </>
                )}
              </button>

              {!collapsed && filteredChildren && openMenus.has(item.label) && (
                <div className="ml-[20px] mt-1 space-y-1 border-l border-line/80 pl-[14px] py-[4px]">
                  {filteredChildren.map((child) => (
                    <button
                      key={child.label}
                      className={cn(
                        "flex h-[32px] w-full items-center rounded-lg px-[10px] text-[12px] transition-all",
                        activePath === child.path
                          ? "bg-primary-light/60 text-primary font-semibold"
                          : "text-content-secondary hover:bg-white/70 hover:text-content"
                      )}
                      onClick={() => handleNavigate(child.path, child.viewId)}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 하단 프로필 */}
      <div className="border-t border-line/80 p-sm shrink-0">
        {!collapsed ? (
          <div className="space-y-px">
            <div className="flex cursor-pointer items-center gap-sm rounded-xl p-[10px] transition-colors hover:bg-white/70">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light shrink-0">
                <User className="text-primary" size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-semibold text-content">{getUserDisplayName()}</p>
                <p className="text-[11px] text-content-tertiary truncate">{getUserRoleLabel()}</p>
              </div>
            </div>
            <button
              className="flex h-[34px] w-full items-center gap-[10px] rounded-lg px-[10px] text-[12px] text-content-secondary transition-colors hover:bg-white/70 hover:text-content"
              onClick={() => { useAuthStore.getState().logout(); moveToPage(990); }}
            >
              <LogOut size={14} strokeWidth={1.5} />
              <span>로그아웃</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-sm py-xs">
            <div className="h-7 w-7 rounded-full bg-primary-light flex items-center justify-center shrink-0">
              <User className="text-primary" size={14} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
