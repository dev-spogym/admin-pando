import React, { useState, useEffect, useCallback } from "react";
import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import RightQuickPanel from "@/components/panels/RightQuickPanel";
import DesignDocPanel from "@/components/layout/DesignDocPanel";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { moveToPage } from "@/internal";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface AppLayoutProps {
  children: React.ReactNode;
}

/** 모바일 breakpoint (md: 768px) */
const MOBILE_BREAKPOINT = 768;

const AppLayout = ({ children }: AppLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const authUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const designDocMode = useUiStore((s) => s.designDocMode);
  const toggleDesignDocMode = useUiStore((s) => s.toggleDesignDocMode);

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
  }, []);

  // 인증 가드: 마운트 후 로그인 안 된 상태면 /login으로 리다이렉트
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/login');
    }
  }, [mounted, isAuthenticated, router]);

  // 마운트 전 또는 인증 안 된 상태: 로딩 화면 (서버/클라이언트 동일)
  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-secondary">
        <div className="text-content-tertiary text-[13px]">로그인 페이지로 이동 중...</div>
      </div>
    );
  }

  // Cmd/Ctrl + / 단축키로 화면설계서 모드 토글
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        toggleDesignDocMode();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleDesignDocMode]);

  // 화면 크기 감지
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 모바일 오버레이 ESC 닫기
  useEffect(() => {
    if (!mobileOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileOpen]);

  const handleNavigate = useCallback((path: string, viewId?: number) => {
    // 모바일에서 네비게이션 시 사이드바 자동 닫기
    if (isMobile) setMobileOpen(false);
    if (viewId) {
      moveToPage(viewId);
      return;
    }
    const viewMap: Record<string, number> = {
      "/": 966,
      "/members": 967,
      "/members/:memberId": 985,
      "/members/new": 986,
      "/attendance": 968,
      "/calendar": 969,
      "/sales": 970,
      "/pos": 971,
      "/pos/payment": 982,
      "/products": 972,
      "/products/new": 987,
      "/locker": 973,
      "/locker/management": 991,
      "/rfid": 979,
      "/rooms": 978,
      "/staff": 974,
      "/staff/new": 988,
      "/settings": 975,
      "/settings/kiosk": 994,
      "/settings/iot": 995,
      "/settings/permissions": 996,
      "/payroll": 976,
      "/payroll/statements": 989,
      "/contracts/new": 977,
      "/members/:id/body": 990,
      "/message": 980,
      "/message/auto-alarm": 992,
      "/message/coupon": 993,
      "/mileage": 981,
      "/subscription": 983,
      "/branches": 984,
      "/temp-member-form": 997,
    };
    const targetViewId = viewMap[path];
    if (targetViewId) {
      moveToPage(targetViewId);
    } else {
      router.push(path);
    }
  }, [isMobile, router]);

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-surface-secondary">
      {/* 모바일 오버레이 */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 사이드바 — 데스크톱: 정적, 모바일: 오버레이 드로어 */}
      <div
        className={cn(
          isMobile
            ? "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out"
            : "relative shrink-0",
          isMobile && !mobileOpen && "-translate-x-full",
          isMobile && mobileOpen && "translate-x-0"
        )}
      >
        <AppSidebar
          collapsed={isMobile ? false : sidebarCollapsed}
          onNavigate={handleNavigate}
          activePath={pathname ?? '/'}
        />
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* 헤더 */}
        <AppHeader
          onToggleSidebar={handleToggleSidebar}
          notificationCount={0}
          userName={authUser?.name ?? '사용자'}
          branchName={authUser?.branchName || 'FitGenie CRM'}
        />

        {/* 콘텐츠 — 모바일에서 패딩 축소 */}
        <main className={cn("flex-1 overflow-auto", isMobile ? "p-sm" : "p-lg")}>
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>

      {/* 우측 퀵패널 — 모바일에서는 숨김 */}
      {!isMobile && <RightQuickPanel />}

      {/* 화면설계서 오버레이 패널 */}
      <DesignDocPanel />
    </div>
  );
};

export default AppLayout;

