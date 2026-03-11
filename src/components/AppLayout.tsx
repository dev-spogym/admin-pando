import React, { useState } from "react";
import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePath, setActivePath] = useState("/");

  const handleNavigate = (path: string, viewId?: number) => {
    setActivePath(path);
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
    if (targetViewId) moveToPage(targetViewId);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-surface-secondary">
      {/* 사이드바 */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onNavigate={handleNavigate}
        activePath={activePath}
      />

      {/* 메인 영역 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 헤더 */}
        <AppHeader
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          notificationCount={5}
          userName="운영관리자"
          branchName="스포짐 종각점"
        />

        {/* 콘텐츠 */}
        <main className="flex-1 overflow-auto p-lg">
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
