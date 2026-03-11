import React, { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import { 
  Bell, 
  Calendar, 
  Users, 
  Monitor, 
  Moon, 
  Sun, 
  ChevronRight,
  Settings,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activePath, setActivePath] = useState("/");

  // 페이지 이동 핸들러
  const handleNavigate = (path: string, viewId?: number) => {
    setActivePath(path);
    
    // 1. viewId가 직접 전달된 경우 우선 사용
    if (viewId) {
      moveToPage(viewId);
      return;
    }

    // 2. viewId가 없는 경우 경로 매핑을 통해 찾음
    // 메뉴 경로와 실제 View ID 매핑
    const viewMap: Record<string, number> = {
      "/": 966, // 대시보드
      "/members": 967, // 회원 목록
      "/members/:memberId": 985, // 회원 상세
      "/members/new": 986, // 회원 등록/수정
      "/attendance": 968, // 출석 관리
      "/calendar": 969, // 수업/캘린더
      "/sales": 970, // 매출 현황
      "/pos": 971, // 매출 상세/결제 (POS)
      "/pos/payment": 982, // POS 결제 (현장판매)
      "/products": 972, // 상품 관리
      "/products/new": 987, // 상품 등록/수정
      "/locker": 973, // 락커 관리
      "/locker/management": 991, // 사물함 관리 (일일/개인/골프)
      "/staff": 974, // 직원 관리
      "/staff/new": 988, // 직원 등록/수정
      "/settings": 975, // 센터 설정
      "/settings/kiosk": 994, // 키오스크 설정
      "/settings/iot": 995, // 출입문/IoT 설정
      "/settings/permissions": 996, // 권한 설정
      "/payroll": 976, // 급여 관리
      "/payroll/statements": 989, // 급여 명세서
      "/contracts/new": 977, // 전자계약 (5단계 위저드)
      "/members/:id/body": 990, // 신체/체성분 정보
      "/rooms": 978, // 운동룸 관리
      "/rfid": 979, // 밴드/카드 관리
      "/message": 980, // 메시지 발송 (알림톡/SMS)
      "/message/auto-alarm": 992, // 자동 알림 설정 (13종)
      "/message/coupon": 993, // 쿠폰 관리
      "/mileage": 981, // 마일리지 관리
      "/subscription": 983, // 구독 플랜 관리
      "/branches": 984, // 지점 관리
      "/temp-member-form": 997, // 회원 등록/수정 (임시)
    };

    const targetViewId = viewMap[path];
    if (targetViewId) {
      moveToPage(targetViewId);
    }
  };

  // 사이드바 토글 핸들러
  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // 다크모드 토글 핸들러
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // 다크모드 상태 변화 감지 및 적용
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <div className={cn(
      "flex h-screen w-full flex-col overflow-hidden transition-colors duration-300 font-sans tabular-nums break-keep",
      isDarkMode ? "bg-5" : "bg-2"
    )} >
      {/* 1. 상단 헤더 (AppHeader) */}
      <AppHeader onToggleSidebar={handleToggleSidebar} notificationCount={5} userName="운영관리자" branchName="스포짐 종각점"/>

      <div className="flex flex-1 overflow-hidden" >
        {/* 2. 좌측 사이드바 (AppSidebar) */}
        <AppSidebar collapsed={sidebarCollapsed} onNavigate={handleNavigate} activePath={activePath}/>

        {/* 3. 중앙 영역 (SubHeader + Main Content) */}
        <div className="flex flex-1 flex-col overflow-hidden" >
          {/* 상단 공지사항 바 (SubHeader) */}
          <div className="flex h-[40px] items-center border-b border-10 bg-6 px-lg dark:bg-5 dark:border-strong/10" >
            <div className="flex items-center gap-sm overflow-hidden" >
              <span className="flex-shrink-0 rounded-xs bg-0 px-sm py-[2px] text-[10px] font-bold text-white uppercase tracking-wider" >
                공지
              </span>
              <p className="truncate text-Body-Primary-KR text-4 dark:text-1" >
                FitGenie CRM 2.0 업데이트 안내: 회원 출석 알림 기능이 개선되었습니다.
              </p>
            </div>
            <button className="ml-auto flex items-center gap-xs text-0 hover:opacity-80 transition-all" >
              <span className="text-[12px] font-bold" >전체보기</span>
              <ChevronRight size={14} strokeWidth={2.5}/>
            </button>
          </div>

          {/* 메인 콘텐츠 영역 (children) */}
          <main className="flex-1 overflow-auto p-[12px] md:p-md lg:p-lg scrollbar-hide" >
            <div className="mx-auto max-w-[1440px]" >
              {children}
            </div>
          </main>
        </div>

        {/* 4. 우측 퀵 액세스 스티커 (Quick Access Bar) */}
        <aside className="flex w-[72px] flex-col items-center border-l border-10 bg-2 py-lg gap-md dark:bg-5 dark:border-strong/10" >
          <div className="flex flex-col items-center gap-sm" >
            <StickerButton icon={<Bell size={20} strokeWidth={1.5} />} label="알림센터" count={3} active={activePath === "/notifications"}/>
            <StickerButton icon={<Calendar size={20} strokeWidth={1.5} />} label="일정관리" active={activePath === "/calendar"}/>
            <StickerButton icon={<Users size={20} strokeWidth={1.5} />} label="방문회원" count={1} active={activePath === "/visiting"}/>
            <StickerButton icon={<Monitor size={20} strokeWidth={1.5} />} label="원격제어" active={activePath === "/remote"}/>
          </div>
          
          <div className="mt-auto flex flex-col items-center gap-sm pb-md" >
            {/* 다크모드 토글 버튼 */}
            <button
              className="flex h-[40px] w-[40px] items-center justify-center rounded-md bg-4 text-6 hover:bg-3 hover:text-0 transition-all dark:bg-3 dark:text-7 shadow-sm" onClick={toggleTheme} title={isDarkMode ? "라이트모드" : "다크모드"}>
              {isDarkMode ? <Sun size={18} strokeWidth={1.5}/> : <Moon size={18} strokeWidth={1.5}/>}
            </button>
            <button className="flex h-[40px] w-[40px] items-center justify-center rounded-md text-6 hover:bg-4 dark:text-7 dark:hover:bg-3" >
              <Settings size={18} strokeWidth={1.5}/>
            </button>
            <button className="flex h-[40px] w-[40px] items-center justify-center rounded-md text-6 hover:bg-4 dark:text-7 dark:hover:bg-3" >
              <HelpCircle size={18} strokeWidth={1.5}/>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

// 우측 스티커 버튼 컴포넌트
interface StickerButtonProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
}

const StickerButton = ({ icon, label, count, active }: StickerButtonProps) => (
  <button 
    className={cn(
      "group relative flex h-[60px] w-[60px] flex-col items-center justify-center rounded-lg transition-all duration-220 ease-spring",
      active 
        ? "bg-4 text-0 shadow-sm" 
        : "text-6 hover:bg-4 hover:text-0 dark:text-7 dark:hover:bg-3"
    )} >
    <div className={cn(
      "mb-[4px] transition-transform group-hover:scale-110",
      active ? "text-0" : "text-6 dark:text-7"
    )} >
      {icon}
    </div>
    <span className="text-[10px] font-bold leading-tight uppercase tracking-wider" >{label}</span>
    
    {count && (
      <span className="absolute right-[6px] top-[6px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-14 px-[4px] text-[10px] font-bold text-white ring-2 ring-2 dark:ring-5" >
        {count}
      </span>
    )}
    
    {active && (
      <div className="absolute -right-[1px] top-1/2 h-[20px] w-[2px] -translate-y-1/2 rounded-l-full bg-0" />
    )}
  </button>
);

export default AppLayout;
