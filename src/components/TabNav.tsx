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

export default function TabNav({ tabs = [], activeTab, onTabChange, className = "" }: TabNavProps) {
  return (
    <div className={cn("inline-flex p-[3px] gap-[2px] bg-surface-tertiary rounded-lg", className)}>
      {(tabs || []).map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            className={cn(
              "flex items-center gap-[6px] px-3 py-[6px] text-[13px] font-medium transition-all rounded-md whitespace-nowrap",
              isActive
                ? "bg-surface text-content shadow-xs"
                : "text-content-secondary hover:text-content"
            )}
            onClick={() => onTabChange(tab.key)}
          >
            {Icon && <Icon className={cn("shrink-0", isActive ? "text-content" : "text-content-tertiary")} size={15} strokeWidth={2} />}
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
