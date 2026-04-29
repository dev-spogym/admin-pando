import React from "react";
import { Search, X, RotateCcw, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  key: string;
  label: string;
  type: "select" | "date" | "dateRange" | "multiSelect";
  options?: Array<{ value: string; label: string }>;
}

interface SearchFilterProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  filters?: FilterOption[];
  filterValues?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
  onReset?: () => void;
  onRemoveFilter?: (key: string, value?: any) => void;
  className?: string;
}

export const SearchFilter = ({
  searchPlaceholder = "검색어를 입력하세요",
  searchValue = "",
  onSearchChange,
  onSearch,
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  onRemoveFilter,
  className,
}: SearchFilterProps) => {
  const activeTags = Object.entries(filterValues).flatMap(([key, value]) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return [];
    const filter = filters.find((f) => f.key === key || (f.type === "dateRange" && (key === `${f.key}Start` || key === `${f.key}End`)));
    if (!filter) return [];
    if (filter.type === "select" || filter.type === "multiSelect") {
      if (Array.isArray(value)) {
        return value.map((val) => {
          const option = filter.options?.find((o) => o.value === val);
          return { key, value: val, label: `${filter.label}: ${option?.label || val}` };
        });
      }
      const option = filter.options?.find((o) => o.value === value);
      return [{ key, value, label: `${filter.label}: ${option?.label || value}` }];
    }
    if (filter.type === "date" || filter.type === "dateRange") {
      const displayLabel = key.endsWith("Start") ? "시작" : key.endsWith("End") ? "종료" : "";
      return [{ key, value, label: `${filter.label}${displayLabel ? `(${displayLabel})` : ""}: ${value}` }];
    }
    return [];
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearch?.(searchValue);
  };

  return (
    <div className={cn("w-full space-y-md", className)}>
      <div className="flex flex-wrap items-center gap-sm rounded-[22px] border border-line/70 bg-white/70 p-sm shadow-sm backdrop-blur-sm">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
          <input
            className="app-control w-full rounded-2xl pl-9 pr-3 py-[9px] text-[13px] text-content placeholder-content-tertiary transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* 필터 */}
        {filters.map((filter) => (
          <div key={filter.key}>
            {filter.type === "select" || filter.type === "multiSelect" ? (
              <div className="relative">
                <select
                  className="app-control min-w-[118px] appearance-none rounded-2xl pl-3 pr-8 py-[9px] text-[13px] font-medium text-content-secondary transition-colors cursor-pointer focus:outline-none focus:border-primary"
                  value={filter.type === "multiSelect" ? "" : String(filterValues[filter.key] ?? "")}
                  onChange={(e) => {
                    if (filter.type === "multiSelect") {
                      const currentValues = Array.isArray(filterValues[filter.key]) ? filterValues[filter.key] : [];
                      if (!currentValues.includes(e.target.value)) onFilterChange?.(filter.key, [...currentValues, e.target.value]);
                    } else {
                      onFilterChange?.(filter.key, e.target.value);
                    }
                  }}
                >
                  <option value="" disabled={filter.type === "multiSelect"}>{filter.label}</option>
                  {filter.options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <ChevronDown className="absolute right-[10px] top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" size={13} />
              </div>
            ) : filter.type === "date" ? (
              <input
                className="app-control rounded-2xl px-3 py-[9px] text-[13px] font-medium text-content transition-colors cursor-pointer focus:outline-none focus:border-primary"
                type="date"
                value={filterValues[filter.key] ?? ""}
                onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
              />
            ) : filter.type === "dateRange" ? (
              <div className="app-control flex items-center gap-[4px] rounded-2xl px-3 transition-colors focus-within:border-primary">
                <input
                  className="bg-transparent py-[7px] text-[13px] text-content font-medium focus:outline-none cursor-pointer tabular-nums"
                  type="date"
                  value={filterValues[`${filter.key}Start`] ?? ""}
                  onChange={(e) => onFilterChange?.(`${filter.key}Start`, e.target.value)}
                />
                <span className="text-content-tertiary text-[12px]">~</span>
                <input
                  className="bg-transparent py-[7px] text-[13px] text-content font-medium focus:outline-none cursor-pointer tabular-nums"
                  type="date"
                  value={filterValues[`${filter.key}End`] ?? ""}
                  onChange={(e) => onFilterChange?.(`${filter.key}End`, e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ))}

        {onReset && (
          <button
            className="flex items-center gap-[4px] rounded-2xl px-3 py-[9px] text-[12px] font-semibold text-content-tertiary transition-colors hover:bg-white/80 hover:text-content"
            onClick={onReset}
          >
            <RotateCcw size={13} />
            초기화
          </button>
        )}
      </div>

      {/* 활성 필터 태그 */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-[6px]">
          <div className="flex items-center gap-1 text-content-tertiary text-[11px] font-medium mr-1">
            <Filter size={11} />
            <span>필터:</span>
          </div>
          {activeTags.map((tag, index) => (
            <div
              key={`${tag.key}-${tag.value}-${index}`}
              className="flex items-center gap-1 rounded-full border border-primary/15 bg-primary-light px-2.5 py-[4px] text-[11px] font-semibold text-primary"
            >
              <span>{tag.label}</span>
              <button
                className="hover:bg-primary/10 rounded-full p-px transition-colors"
                onClick={() => onRemoveFilter?.(tag.key, tag.value)}
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {onReset && (
            <button className="text-content-tertiary text-[11px] font-medium hover:text-content underline underline-offset-2 ml-1" onClick={onReset}>
              모두 지우기
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
