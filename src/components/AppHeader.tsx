import React from "react";
import {
  Menu,
  Search,
  Plus,
  Bell,
  ChevronDown,
} from "lucide-react";
import { moveToPage } from "@/internal";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  branchName?: string;
  userName?: string;
  notificationCount?: number;
}

const AppHeader = ({
  onToggleSidebar,
  branchName = "스포짐 종각점",
  userName = "관리자",
  notificationCount = 0,
}: AppHeaderProps) => {
  return (
    <header className="flex h-[56px] items-center justify-between border-b border-line bg-surface px-lg shrink-0">
      {/* Left */}
      <div className="flex items-center gap-md">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors"
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-sm rounded-md bg-surface-secondary px-md py-[6px] cursor-pointer hover:bg-surface-tertiary transition-colors">
          <span className="text-[13px] font-semibold text-content">{branchName}</span>
          <ChevronDown className="text-content-tertiary" size={14} />
        </div>
      </div>

      {/* Center: 검색 */}
      <div className="flex-1 max-w-[420px] mx-xl">
        <div className="relative">
          <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 text-content-tertiary" size={16} />
          <input
            className="h-9 w-full rounded-lg border border-line bg-surface-secondary pl-9 pr-md text-[13px] text-content placeholder:text-content-tertiary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
            type="text"
            placeholder="회원 이름, 연락처 검색..."
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-sm">
        {/* 알림 */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors">
          <Bell size={18} />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white px-1">
              {notificationCount}
            </span>
          )}
        </button>

        {/* 프로필 */}
        <div className="flex items-center gap-sm pl-sm ml-sm border-l border-line cursor-pointer group">
          <div className="h-7 w-7 rounded-full bg-primary-light flex items-center justify-center text-primary text-[12px] font-bold">
            {userName.substring(0, 1)}
          </div>
          <span className="hidden lg:block text-[13px] font-medium text-content">{userName}</span>
          <ChevronDown className="text-content-tertiary" size={12} />
        </div>

        {/* 회원 등록 */}
        <button
          className="ml-sm h-8 rounded-lg bg-primary px-md flex items-center gap-xs text-[13px] font-semibold text-white hover:bg-primary-dark active:scale-[0.97] transition-all"
          onClick={() => moveToPage(986)}
        >
          <Plus size={16} />
          <span>회원등록</span>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
