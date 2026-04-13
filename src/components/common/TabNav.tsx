import React, { useRef, useEffect } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  key: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  className?: string;
}

export default function TabNav({ tabs = [], activeTab, onTabChange, className = "" }: TabNavProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  // 탭 전환 시 선택된 탭이 보이도록 스크롤
  useEffect(() => {
    if (activeButtonRef.current && scrollContainerRef.current) {
      activeButtonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeTab]);

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "flex overflow-x-auto border-b border-line bg-surface",
        // 스크롤바 숨기기
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        className
      )}
    >
      {(tabs || []).map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            ref={isActive ? activeButtonRef : undefined}
            type="button"
            className={cn(
              "flex items-center gap-[6px] px-4 py-3 text-[13px] font-medium transition-all whitespace-nowrap shrink-0 border-b-2",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-content-secondary hover:text-content hover:border-line"
            )}
            onClick={() => onTabChange(tab.key)}
          >
            {Icon && (
              <Icon
                className={cn("shrink-0", isActive ? "text-primary" : "text-content-tertiary")}
                size={14}
                strokeWidth={2}
              />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-[6px] py-px rounded-full text-[10px] font-semibold tabular-nums",
                  isActive ? "bg-primary text-white" : "bg-line text-content-secondary"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
