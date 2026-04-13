import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

export interface ActionBarAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
}

export interface ActionBarProps {
  selectedCount: number;
  actions: ActionBarAction[];
  onClear: () => void;
  className?: string;
}

export default function ActionBar({
  selectedCount,
  actions,
  onClear,
  className,
}: ActionBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "transition-all duration-200 ease-out",
        selectedCount > 0
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-4 opacity-0 pointer-events-none",
        className
      )}
      role="toolbar"
      aria-label="일괄 작업 도구"
    >
      <div className="flex items-center gap-sm bg-surface border border-line rounded-xl shadow-xl px-md py-sm">
        <span className="text-Label text-content-secondary shrink-0">
          <span className="text-primary font-semibold">{selectedCount}</span>개 선택됨
        </span>
        <div className="h-4 w-px bg-line" />
        <div className="flex items-center gap-xs">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant={action.variant ?? "outline"}
              size="sm"
              icon={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
        <button
          type="button"
          aria-label="선택 해제"
          onClick={onClear}
          className="ml-xs p-1 rounded-md text-content-secondary hover:text-content hover:bg-surface-secondary transition-colors duration-150"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
