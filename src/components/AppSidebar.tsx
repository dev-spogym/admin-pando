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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { moveToPage } from "@/internal";
import { hasMenuPermission, hasPermission, normalizeRole, ROLE_LABELS, type UserRole } from "@/lib/permissions";
import { getBranchesPaginated, type BranchDetail } from "@/api/endpoints/branches";

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  viewId?: number;
  children?: Array<{ label: string; path: string; viewId?: number }>;
}

interface AppSidebarProps {
  collapsed?: boolean;
  onNavigate?: (path: string, viewId?: number) => void;
  activePath?: string;
}

// 슈퍼관리자 전용 본사 관리 메뉴
const SUPER_ADMIN_MENU_ITEMS: MenuItem[] = [
  { label: "통합 대시보드", icon: LayoutDashboard, path: "/super-dashboard" },
  { label: "지점 관리", icon: Building2, path: "/branches", viewId: 984 },
  { label: "지점 비교 리포트", icon: BarChart3, path: "/branch-report" },
  { label: "전체 직원 관리", icon: Users, path: "/staff", viewId: 974 },
  { label: "감사 로그", icon: Shield, path: "/audit-log" },
  { label: "구독 관리", icon: CreditCard, path: "/subscription", viewId: 983 },
];

const MENU_ITEMS: MenuItem[] = [
  { label: "대시보드", icon: Home, path: "/", viewId: 966 },
  {
    label: "회원",
    icon: Users,
    children: [
      { label: "회원 목록", path: "/members", viewId: 967 },
      { label: "출석 관리", path: "/attendance", viewId: 968 },
      { label: "마일리지 관리", path: "/mileage", viewId: 981 },
      { label: "전자계약", path: "/contracts/new", viewId: 977 },
    ],
  },
  {
    label: "수업/캘린더",
    icon: Calendar,
    children: [
      { label: "캘린더", path: "/calendar", viewId: 969 },
      { label: "수업 관리", path: "/lessons" },
      { label: "횟수 관리", path: "/lesson-counts" },
      { label: "페널티 관리", path: "/penalties" },
    ],
  },
  {
    label: "매출",
    icon: TrendingUp,
    children: [
      { label: "매출 현황", path: "/sales", viewId: 970 },
      { label: "매출 통계", path: "/sales/stats" },
      { label: "POS 결제", path: "/pos", viewId: 971 },
      { label: "현장 판매", path: "/pos/payment", viewId: 982 },
      { label: "환불 관리", path: "/refunds" },
      { label: "미수금 관리", path: "/unpaid" },
    ],
  },
  {
    label: "상품",
    icon: Package,
    children: [{ label: "상품 관리", path: "/products", viewId: 972 }],
  },
  {
    label: "시설",
    icon: Building2,
    children: [
      { label: "락커 관리", path: "/locker", viewId: 973 },
      { label: "사물함 관리", path: "/locker/management", viewId: 991 },
      { label: "밴드/카드", path: "/rfid", viewId: 979 },
      { label: "운동룸", path: "/rooms", viewId: 978 },
      { label: "운동복", path: "/clothing" },
    ],
  },
  {
    label: "급여",
    icon: DollarSign,
    children: [
      { label: "급여 관리", path: "/payroll", viewId: 976 },
      { label: "급여 명세서", path: "/payroll/statements", viewId: 989 },
    ],
  },
  {
    label: "메시지/쿠폰",
    icon: MessageSquare,
    children: [
      { label: "메시지 발송", path: "/message", viewId: 980 },
      { label: "자동 알림", path: "/message/auto-alarm", viewId: 992 },
      { label: "쿠폰 관리", path: "/message/coupon", viewId: 993 },
    ],
  },
  {
    label: "설정",
    icon: Settings,
    children: [
      { label: "센터 설정", path: "/settings", viewId: 975 },
      { label: "직원 관리", path: "/staff", viewId: 974 },
      { label: "권한 설정", path: "/settings/permissions", viewId: 996 },
      { label: "키오스크", path: "/settings/kiosk", viewId: 994 },
      { label: "출입문/IoT", path: "/settings/iot", viewId: 995 },
      { label: "구독 관리", path: "/subscription", viewId: 983 },
      { label: "지점 관리", path: "/branches", viewId: 984 },
    ],
  },
];

const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed = false,
  onNavigate,
  activePath = "/",
}) => {
  // 현재 경로에 해당하는 메뉴 그룹 자동 열기
  const [openMenus, setOpenMenus] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const item of MENU_ITEMS) {
      if (item.children?.some((child) => activePath.startsWith(child.path))) {
        initial.add(item.label);
      }
    }
    if (initial.size === 0) initial.add("회원"); // 기본값
    return initial;
  });

  // 지점 목록 상태 (슈퍼관리자 드롭다운용)
  const [branches, setBranches] = useState<BranchDetail[]>([]);

  const authUser = useAuthStore((s) => s.user);
  const switchBranch = useAuthStore((s) => s.switchBranch);
  const userRole = authUser?.role || '';
  const isSuperAdmin = authUser?.isSuperAdmin ?? false;

  // 슈퍼관리자인 경우 지점 목록 로드
  useEffect(() => {
    if (!isSuperAdmin) return;
    getBranchesPaginated({ page: 1, size: 100 }).then((res) => {
      if (res.success && res.data?.data) {
        setBranches(res.data.data);
      }
    });
  }, [isSuperAdmin]);

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

  const isMenuGroupActive = (item: MenuItem) => {
    if (item.path === activePath) return true;
    return item.children?.some((child) => child.path === activePath) ?? false;
  };

  // 슈퍼관리자 메뉴 항목 렌더링 (단일 항목, 자식 없음)
  const renderSuperAdminMenuItem = (item: MenuItem) => {
    const isActive = item.path === activePath;
    return (
      <div key={item.label} className="mb-px">
        <button
          className={cn(
            "group flex h-[34px] w-full items-center gap-[10px] px-[10px] rounded-md text-[13px] font-medium transition-colors",
            isActive
              ? "bg-primary-light text-primary"
              : "text-content-secondary hover:bg-surface-tertiary hover:text-content"
          )}
          onClick={() => item.path && handleNavigate(item.path, item.viewId)}
        >
          <item.icon
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

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r border-line bg-surface transition-all duration-200 shrink-0 sticky top-0",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* 로고 */}
      <div className="flex h-[56px] items-center px-lg border-b border-line shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-sm cursor-pointer" onClick={() => handleNavigate("/", 966)}>
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-white text-[13px] font-bold">
              S
            </div>
            <span className="text-[16px] font-bold text-content tracking-tight">스포짐</span>
          </div>
        ) : (
          <div className="mx-auto h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-white text-[13px] font-bold cursor-pointer" onClick={() => handleNavigate("/", 966)}>
            S
          </div>
        )}
      </div>

      {/* 슈퍼관리자 지점 전환 드롭다운 */}
      {isSuperAdmin && !collapsed && (
        <div className="px-3 py-2 border-b border-line">
          <label className="text-xs text-muted-foreground font-medium">지점 전환</label>
          <select
            className="w-full mt-1 px-2 py-1.5 text-sm border border-line rounded-md bg-background text-content focus:outline-none focus:ring-1 focus:ring-primary"
            value={authUser?.currentBranchId || 'all'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all') {
                switchBranch('', '전체 지점');
              } else {
                const branch = branches.find((b) => String(b.id) === val);
                if (branch) switchBranch(String(branch.id), branch.name);
              }
            }}
          >
            <option value="all">전체 지점 (통합)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-sm px-sm scrollbar-hide">
        {/* 슈퍼관리자 전용 본사 관리 섹션 */}
        {isSuperAdmin && (
          <div className="mb-2">
            {!collapsed && (
              <p className="px-[10px] py-[6px] text-[10px] font-semibold text-content-tertiary uppercase tracking-wider">
                본사 관리
              </p>
            )}
            {SUPER_ADMIN_MENU_ITEMS.map(renderSuperAdminMenuItem)}
            {/* 구분선 */}
            <div className="mt-2 mb-1 border-b border-line" />
          </div>
        )}

        {/* 일반 메뉴 - 역할 기반 필터링 */}
        {MENU_ITEMS.filter((item) => isSuperAdmin || hasMenuPermission(userRole, item.label)).map((item) => {
          // 슈퍼관리자는 하위 메뉴 필터링 없이 전체 표시
          const filteredChildren = isSuperAdmin
            ? item.children
            : item.children?.filter((child) => hasPermission(userRole, child.path, isSuperAdmin));
          // 하위 메뉴가 모두 필터링되면 상위 메뉴도 숨김
          if (item.children && (!filteredChildren || filteredChildren.length === 0)) return null;

          return (
            <div key={item.label} className="mb-px">
              <button
                className={cn(
                  "group flex h-[34px] w-full items-center gap-[10px] px-[10px] rounded-md text-[13px] font-medium transition-colors",
                  isMenuGroupActive(item)
                    ? "bg-primary-light text-primary"
                    : "text-content-secondary hover:bg-surface-tertiary hover:text-content"
                )}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                onClick={() => {
                  if (item.children) toggleMenu(item.label);
                  else if (item.path) handleNavigate(item.path, item.viewId);
                }}
              >
                <item.icon
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
                <div className="mt-px ml-[18px] border-l border-line pl-[14px] space-y-px py-[2px]">
                  {filteredChildren.map((child) => (
                    <button
                      key={child.label}
                      className={cn(
                        "flex h-[30px] w-full items-center px-[8px] rounded-md text-[12px] transition-colors",
                        activePath === child.path
                          ? "text-primary font-semibold bg-primary-light/50"
                          : "text-content-secondary hover:text-content hover:bg-surface-tertiary"
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
      <div className="border-t border-line p-sm shrink-0">
        {!collapsed ? (
          <div className="space-y-px">
            <div className="flex items-center gap-sm p-[8px] rounded-md hover:bg-surface-tertiary transition-colors cursor-pointer">
              <div className="h-7 w-7 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                <User className="text-primary" size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-content truncate">{getUserDisplayName()}</p>
                <p className="text-[11px] text-content-tertiary truncate">{getUserRoleLabel()}</p>
              </div>
            </div>
            <button
              className="flex w-full items-center gap-[10px] h-[30px] px-[10px] rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors text-[12px]"
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
