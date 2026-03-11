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
  { 
    label: "대시보드", 
    icon: Home, 
    path: "/", 
    viewId: 966 
  },
  { 
    label: "회원", 
    icon: Users, 
    children: [
      { label: "회원 목록", path: "/members", viewId: 967 },
      { label: "출석 관리", path: "/attendance", viewId: 968 },
      { label: "마일리지 관리", path: "/mileage", viewId: 981 },
      { label: "전자계약 (5단계 위저드)", path: "/contracts/new", viewId: 977 },
    ]
  },
  { 
    label: "수업/캘린더", 
    icon: Calendar, 
    path: "/calendar", 
    viewId: 969 
  },
  { 
    label: "매출", 
    icon: TrendingUp, 
    children: [
      { label: "매출 현황", path: "/sales", viewId: 970 },
      { label: "매출 상세/결제 (POS)", path: "/pos", viewId: 971 },
      { label: "POS 결제 (현장판매)", path: "/pos/payment", viewId: 982 },
    ]
  },
  { 
    label: "상품", 
    icon: Package, 
    children: [
      { label: "상품 관리", path: "/products", viewId: 972 },
    ]
  },
  { 
    label: "시설", 
    icon: Building2, 
    children: [
      { label: "락커 관리", path: "/locker", viewId: 973 },
      { label: "사물함 관리 (일일/개인/골프)", path: "/locker/management", viewId: 991 },
      { label: "밴드/카드 관리", path: "/rfid", viewId: 979 },
      { label: "운동룸 관리", path: "/rooms", viewId: 978 },
    ]
  },
  { 
    label: "급여", 
    icon: DollarSign, 
    children: [
      { label: "급여 관리", path: "/payroll", viewId: 976 },
      { label: "급여 명세서", path: "/payroll/statements", viewId: 989 },
    ]
  },
  { 
    label: "메시지/쿠폰", 
    icon: MessageSquare, 
    children: [
      { label: "메시지 발송 (알림톡/SMS)", path: "/message", viewId: 980 },
      { label: "자동 알림 설정 (13종)", path: "/message/auto-alarm", viewId: 992 },
      { label: "쿠폰 관리", path: "/message/coupon", viewId: 993 },
    ]
  },
  { 
    label: "센터 설정", 
    icon: Settings, 
    children: [
      { label: "센터 설정", path: "/settings", viewId: 975 },
      { label: "직원 관리", path: "/staff", viewId: 974 },
      { label: "권한 설정", path: "/settings/permissions", viewId: 996 },
      { label: "키오스크 설정", path: "/settings/kiosk", viewId: 994 },
      { label: "출입문/IoT 설정", path: "/settings/iot", viewId: 995 },
      { label: "구독 플랜 관리", path: "/subscription", viewId: 983 },
      { label: "지점 관리 (멀티지점)", path: "/branches", viewId: 984 },
    ]
  },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ 
  collapsed = false, 
  onNavigate, 
  activePath = "/" 
}) => {
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set(["회원"]));

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleNavigate = (path: string, viewId?: number) => {
    if (onNavigate) {
      onNavigate(path, viewId);
    }
  };

  const isMenuGroupActive = (item: MenuItem) => {
    if (item.path === activePath) return true;
    if (item.children) {
      return item.children.some(child => child.path === activePath);
    }
    return false;
  };

  return (
    <aside className={cn(
      "flex flex-col border-r border-black/[0.07] bg-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] h-screen shadow-0",
      collapsed ? "w-[64px]" : "w-[240px]"
    )} >
      {/* 로고 영역 제거됨 */}
      <div className="h-[16px] shrink-0" />

      <nav className="flex-1 overflow-y-auto px-sm py-md scrollbar-hide" >
        {MENU_ITEMS.map((item) => (
          <div className="mb-[4px]" key={item.label}>
            <button
              className={cn(
                "group flex h-[36px] w-full items-center gap-[10px] px-[12px] rounded-2 transition-all duration-220 ease-spring",
                isMenuGroupActive(item)
                  ? "bg-6 text-0 border-l-[2px] border-0"
                  : "text-4 hover:bg-6/50 hover:text-0"
              )} onClick={() => {
                if (item.children) {
                  toggleMenu(item.label);
                } else if (item.path) {
                  handleNavigate(item.path, item.viewId);
                }
              }}>
              <item.icon 
                className={cn(
                  "shrink-0 transition-colors",
                  isMenuGroupActive(item) ? "text-0" : "text-5 group-hover:text-0"
                )} size={18} strokeWidth={isMenuGroupActive(item) ? 2 : 1.5}/>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-[14px] font-medium truncate" >{item.label}</span>
                  {item.children && (
                    <ChevronDown 
                      className={cn(
                        "transition-transform duration-220 ease-spring text-5 group-hover:text-0",
                        openMenus.has(item.label) ? "rotate-180" : ""
                      )} size={14}/>
                  )}
                </>
              )}
            </button>
            
            {!collapsed && item.children && openMenus.has(item.label) && (
              <div className="mt-[4px] flex flex-col gap-[2px]" >
                {item.children.map((child) => (
                  <button
                    className={cn(
                      "flex h-[32px] items-center pl-[38px] pr-md rounded-2 text-left text-[13px] transition-all duration-220",
                      activePath === child.path
                        ? "text-0 font-semibold bg-6/30"
                        : "text-5 hover:bg-6/20 hover:text-4"
                    )} key={child.label} onClick={() => handleNavigate(child.path, child.viewId)}>
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 사이드바 하단 푸터 (프로필, 설정) */}
      <div className="mt-auto border-t border-black/[0.07] p-sm space-y-[4px] shrink-0" >
        {!collapsed ? (
          <>
            <div className="flex items-center gap-sm p-sm rounded-2 hover:bg-6/30 transition-colors cursor-pointer" >
              <div className="h-9 w-9 rounded-full bg-6 flex items-center justify-center overflow-hidden shrink-0" >
                <User className="text-0" size={20}/>
              </div>
              <div className="flex-1 min-w-0" >
                <p className="text-[14px] font-semibold text-4 truncate" >김관리 매니저</p>
                <p className="text-[11px] text-5 truncate" >강남본점</p>
              </div>
            </div>
            <button className="flex w-full items-center gap-[10px] h-[36px] px-[12px] rounded-2 text-4 hover:bg-6/50 hover:text-0 transition-colors" >
              <Settings size={18} strokeWidth={1.5}/>
              <span className="text-[14px] font-medium" >설정</span>
            </button>
            <button className="flex w-full items-center gap-[10px] h-[36px] px-[12px] rounded-2 text-5 hover:bg-0/10 hover:text-0 transition-colors" >
              <LogOut size={18} strokeWidth={1.5}/>
              <span className="text-[14px] font-medium" >로그아웃</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-md py-sm" >
            <div className="h-8 w-8 rounded-full bg-6 flex items-center justify-center shrink-0" >
              <User className="text-0" size={16}/>
            </div>
            <button className="p-xs rounded-2 text-4 hover:bg-6/50 hover:text-0 transition-colors" >
              <Settings size={18}/>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
