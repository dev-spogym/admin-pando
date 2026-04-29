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
        "flex gap-1 overflow-x-auto rounded-[20px] border border-line/70 bg-white/78 p-1.5 shadow-sm backdrop-blur-sm",
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
              "flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-2xl border px-4 py-2.5 text-[13px] font-semibold transition-all",
              isActive
                ? "border-primary/30 bg-gradient-to-r from-primary-light to-white text-primary shadow-sm"
                : "border-transparent text-content-secondary hover:border-line/70 hover:bg-white/72 hover:text-content"
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
                  "rounded-full px-[7px] py-px text-[10px] font-semibold tabular-nums",
                  isActive ? "bg-primary text-white" : "bg-surface-tertiary text-content-secondary"
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
