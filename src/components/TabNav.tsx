import React from "react";
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

/**
 * TabNav - 인라인 탭 바
 * 2026 Light Admin Dashboard 스타일 적용
 */
export default function TabNav({ tabs = [], activeTab, onTabChange, className = "" }: TabNavProps) {
  return (
    <div className={cn("inline-flex p-1 gap-1 bg-1 rounded-2 overflow-x-auto no-scrollbar border-0 outline-none", className)} >
      {(tabs || []).map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;

        return (
          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-[14px] font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] whitespace-nowrap rounded-1 border-0 outline-none select-none",
              isActive
                ? "bg-white text-4 shadow-1 ring-0"
                : "text-5 hover:text-4 hover:bg-6/50 bg-transparent"
            )} type="button" key={tab.key} onClick={() => onTabChange(tab.key)}>
            
            {Icon && <Icon className={cn("shrink-0 transition-colors", isActive ? "text-4" : "text-5")} size={18} strokeWidth={2.5}/>}
            
            <span >{tab.label}</span>

            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums transition-colors",
                  isActive
                    ? "bg-0 text-white"
                    : "bg-2 text-5"
                )} >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
