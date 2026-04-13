import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChip {
  key: string;
  label: string;
  value: string;
}

export interface FilterChipsProps {
  filters: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export default function FilterChips({
  filters,
  onRemove,
  onClearAll,
  className,
}: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {filters.map((filter) => (
        <div
          key={filter.key}
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-line bg-surface-secondary px-3 py-1",
            "text-xs text-content"
          )}
        >
          <span className="text-content-secondary">{filter.label}:</span>
          <span className="font-medium">{filter.value}</span>
          <button
            type="button"
            onClick={() => onRemove(filter.key)}
            aria-label={`${filter.label} 필터 제거`}
            className={cn(
              "ml-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full",
              "text-content-secondary transition-colors hover:bg-line hover:text-content"
            )}
          >
            <X size={10} strokeWidth={2.5} />
          </button>
        </div>
      ))}

      {/* 전체 초기화 */}
      <button
        type="button"
        onClick={onClearAll}
        className={cn(
          "flex items-center gap-1 rounded-full px-3 py-1 text-xs",
          "text-content-secondary transition-colors hover:text-content",
          "border border-transparent hover:border-line hover:bg-surface-secondary"
        )}
      >
        <X size={10} strokeWidth={2.5} />
        전체 초기화
      </button>
    </div>
  );
}
