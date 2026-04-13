import React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortState;
  onSort: (key: string) => void;
  className?: string;
}

export default function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const Icon =
    direction === "asc"
      ? ArrowUp
      : direction === "desc"
      ? ArrowDown
      : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 group text-[12px] font-semibold transition-colors select-none",
        isActive && direction !== null
          ? "text-primary"
          : "text-content-secondary hover:text-content",
        className
      )}
    >
      <span>{label}</span>
      <Icon
        size={13}
        className={cn(
          "transition-colors shrink-0",
          isActive && direction !== null
            ? "text-primary"
            : "text-content-tertiary group-hover:text-content-secondary"
        )}
      />
    </button>
  );
}

/**
 * useSortable: 정렬 상태 관리 훅 (3단계: asc → desc → null)
 */
export function useSortable(defaultKey = "", defaultDirection: SortDirection = null) {
  const [sort, setSort] = React.useState<SortState>({
    key: defaultKey,
    direction: defaultDirection,
  });

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      if (prev.direction === "desc") return { key, direction: null };
      return { key, direction: "asc" };
    });
  };

  return { sort, handleSort };
}
