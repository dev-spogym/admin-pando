import React, { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  { label: "수업/캘린더", icon: Calendar, path: "/calendar", viewId: 969 },
  {
    label: "매출",
    icon: TrendingUp,
    children: [
      { label: "매출 현황", path: "/sales", viewId: 970 },
      { label: "POS 결제", path: "/pos", viewId: 971 },
      { label: "현장 판매", path: "/pos/payment", viewId: 982 },
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
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set(["회원"]));

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

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-line bg-surface transition-all duration-200 shrink-0",
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

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-sm px-sm scrollbar-hide">
        {MENU_ITEMS.map((item) => (
          <div key={item.label} className="mb-px">
            <button
              className={cn(
                "group flex h-[34px] w-full items-center gap-[10px] px-[10px] rounded-md text-[13px] font-medium transition-colors",
                isMenuGroupActive(item)
                  ? "bg-primary-light text-primary"
                  : "text-content-secondary hover:bg-surface-tertiary hover:text-content"
              )}
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
              />
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

            {!collapsed && item.children && openMenus.has(item.label) && (
              <div className="mt-px ml-[18px] border-l border-line pl-[14px] space-y-px py-[2px]">
                {item.children.map((child) => (
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
        ))}
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
                <p className="text-[13px] font-semibold text-content truncate">김관리 매니저</p>
                <p className="text-[11px] text-content-tertiary truncate">강남본점</p>
              </div>
            </div>
            <button className="flex w-full items-center gap-[10px] h-[30px] px-[10px] rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors text-[12px]">
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
