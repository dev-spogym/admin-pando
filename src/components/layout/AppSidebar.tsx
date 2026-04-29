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
import { hasMenuPermission, hasPermission, normalizeRole, ROLE_LABELS, type UserRole } from "@/lib/permissions";
import { getBranchesPaginated, type BranchDetail } from "@/api/endpoints/branches";
import { toast } from "sonner";
import NotificationCenter from "@/components/layout/NotificationCenter";

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
  { label: "자동 리포트", icon: FileText, path: "/reports", viewId: 1004 },
  { label: "자동화 정책", icon: BellRing, path: "/hq/automation-policies" },
  { label: "전체 직원 관리", icon: Users, path: "/staff", viewId: 974 },
  { label: "히스토리 로그", icon: Shield, path: "/audit-log" },
  { label: "구독 관리", icon: CreditCard, path: "/subscription", viewId: 983 },
  { label: "커스텀 대시보드", icon: LayoutDashboard, path: "/dashboard/builder" },
  { label: "벤치마크 비교", icon: BarChart3, path: "/benchmark" },
  { label: "예측 분석", icon: Target, path: "/analytics/forecast" },
  { label: "NPS 설문", icon: MessageSquare, path: "/nps" },
];

const MENU_ITEMS: MenuItem[] = [
  { label: "대시보드", icon: Home, path: "/", viewId: 966 },
  { label: "KPI 센터", icon: Target, path: "/kpi-preview" },
  { label: "Today Tasks", icon: ClipboardList, path: "/today-tasks" },
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
      { label: "일정 요청", path: "/schedule-requests" },
      { label: "수업 관리", path: "/lessons" },
      { label: "횟수 관리", path: "/lesson-counts" },
      { label: "페널티 관리", path: "/penalties" },
      { label: "유효 수업 목록", path: "/valid-lessons" },
      { label: "수업 템플릿", path: "/class-templates" },
      { label: "시간표 등록", path: "/class-schedule" },
      { label: "수업 현황", path: "/class-stats" },
      { label: "강사 현황", path: "/instructor-status" },
      { label: "대기열 관리", path: "/class-waitlist" },
      { label: "수업 평가", path: "/class-feedback" },
      { label: "QR 체크인", path: "/attendance/qr" },
      { label: "수업 녹화", path: "/class-recording" },
    ],
  },
  {
    label: "매출",
    icon: TrendingUp,
    children: [
      { label: "매출 현황", path: "/sales", viewId: 970 },
      { label: "매출 통계", path: "/sales/stats" },
      { label: "통계 관리", path: "/sales/statistics-management" },
      { label: "KPI 대시보드", path: "/kpi" },
      { label: "온보딩 현황", path: "/onboarding" },
      { label: "선수익금", path: "/deferred-revenue" },
      { label: "POS 결제", path: "/pos", viewId: 971 },
      { label: "현장 판매", path: "/pos/payment", viewId: 982 },
      { label: "환불 관리", path: "/refunds" },
      { label: "미수금 관리", path: "/unpaid" },
    ],
  },
  {
    label: "상품",
    icon: Package,
    children: [
      { label: "상품 관리", path: "/products", viewId: 972 },
      { label: "상품 카탈로그", path: "/products/catalog" },
      { label: "상품 비교", path: "/products/compare" },
      { label: "재고 관리", path: "/products/inventory" },
      { label: "시즌 가격", path: "/products/seasonal-price" },
      { label: "할인 설정", path: "/discount-settings" },
    ],
  },
  {
    label: "시설",
    icon: Building2,
    children: [
      { label: "락커 관리", path: "/locker", viewId: 973 },
      { label: "사물함 관리", path: "/locker/management", viewId: 991 },
      { label: "밴드/카드", path: "/rfid", viewId: 979 },
      { label: "운동룸", path: "/rooms", viewId: 978 },
      { label: "골프 타석", path: "/golf-bays" },
      { label: "운동복", path: "/clothing" },
      { label: "옷 보관함", path: "/clothing-locker" },
      { label: "장비 점검", path: "/equipment-check" },
      { label: "소모품 재고", path: "/consumables" },
      { label: "청소 스케줄", path: "/cleaning-schedule" },
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
    label: "영업/마케팅",
    icon: MessageSquare,
    children: [
      { label: "리드 관리", path: "/leads" },
      { label: "메시지 발송", path: "/message", viewId: 980 },
      { label: "자동 알림", path: "/message/auto-alarm", viewId: 992 },
      { label: "쿠폰 관리", path: "/message/coupon", viewId: 993 },
      { label: "캠페인 관리", path: "/marketing/campaign" },
      { label: "리퍼럴 프로그램", path: "/marketing/referral" },
      { label: "SMS/카카오", path: "/marketing/sms" },
      { label: "A/B 테스트", path: "/marketing/ab-test" },
      { label: "마일리지", path: "/mileage", viewId: 981 },
    ],
  },
  {
    label: "설정",
    icon: Settings,
    children: [
      { label: "센터 설정", path: "/settings", viewId: 975 },
      { label: "직원 관리", path: "/staff", viewId: 974 },
      { label: "직원 근태", path: "/staff/attendance" },
      { label: "운동 프로그램", path: "/exercise-programs" },
      { label: "권한 설정", path: "/settings/permissions", viewId: 996 },
      { label: "키오스크", path: "/settings/kiosk", viewId: 994 },
      { label: "키오스크 운영", path: "/kiosk-ops" },
      { label: "출입문/IoT", path: "/settings/iot", viewId: 995 },
      { label: "자동화 적용", path: "/settings/automation" },
      { label: "출석 설정", path: "/settings/attendance" },
      { label: "커스텀 역할", path: "/settings/custom-role" },
      { label: "다국어 설정", path: "/settings/language" },
      { label: "백업/복원", path: "/settings/backup" },
      { label: "구독 관리", path: "/subscription", viewId: 983 },
      { label: "지점 관리", path: "/branches", viewId: 984 },
      { label: "공지사항", path: "/notices" },
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
            "group flex h-[40px] w-full items-center gap-[10px] rounded-xl px-[12px] text-[13px] font-semibold transition-all",
            isActive
              ? "bg-gradient-to-r from-primary-light via-primary-light to-white text-primary shadow-sm"
              : "text-content-secondary hover:bg-white/70 hover:text-content"
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
        "flex h-full shrink-0 flex-col border-r border-line/80 bg-white/68 backdrop-blur-xl transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[236px]"
      )}
    >
      {/* 로고 */}
      <div className="flex h-[72px] items-center border-b border-line/80 px-lg shrink-0">
        {!collapsed ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-sm cursor-pointer" onClick={() => handleNavigate("/", 966)}>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-accent text-white text-[12px] font-black shadow-float cursor-pointer" onClick={() => handleNavigate("/", 966)}>
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

