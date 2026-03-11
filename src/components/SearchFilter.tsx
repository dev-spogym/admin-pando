import React, { useState } from "react";
import { Search, X, RotateCcw, Filter, Calendar, ChevronDown } from "lucide-react";
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
      } else {
        const option = filter.options?.find((o) => o.value === value);
        return [{ key, value, label: `${filter.label}: ${option?.label || value}` }];
      }
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
    <div className={cn("space-y-4 w-full", className)} >
      <div className="flex flex-wrap items-center gap-4 p-2 bg-3 rounded-xl shadow-card-soft border border-7" >
        <div className="relative flex-1 min-w-[300px]" >
          <Search className="absolute left-md top-1/2 -translate-y-1/2 text-5" size={16} strokeWidth={2}/>
          <input
            className="w-full pl-[40px] pr-md py-2 bg-2 border border-7 rounded-md text-Body-Primary-KR text-4 placeholder-5 focus:outline-none focus:ring-2 focus:ring-0/10 focus:bg-white transition-all duration-220 ease-spring" type="text" placeholder={searchPlaceholder} value={searchValue} onChange={(e) => onSearchChange?.(e.target.value)} onKeyDown={handleKeyDown}/>
          <button
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-0 text-white text-[13px] font-bold rounded-md hover:bg-0/90 hover:translate-y-[-1px] transition-all duration-220 ease-spring shadow-sm" onClick={() => onSearch?.(searchValue)}>
            검색
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2" >
          {filters.map((filter) => (
            <div className="relative group" key={filter.key}>
              {filter.type === "select" || filter.type === "multiSelect" ? (
                <div className="relative" >
                  <select
                    className="appearance-none pl-md pr-xl py-2 bg-2 border border-7 rounded-md text-[13px] text-4 font-medium focus:outline-none focus:ring-2 focus:ring-0/10 focus:bg-white transition-all duration-220 ease-spring cursor-pointer min-w-[120px]" value={filter.type === "multiSelect" ? "" : (filterValues[filter.key] ?? "")} onChange={(e) => {
                      if (filter.type === "multiSelect") {
                        const currentValues = Array.isArray(filterValues[filter.key]) ? filterValues[filter.key] : [];
                        if (!currentValues.includes(e.target.value)) onFilterChange?.(filter.key, [...currentValues, e.target.value]);
                      } else onFilterChange?.(filter.key, e.target.value);
                    }}>
                    <option value="" disabled={filter.type === "multiSelect"}>{filter.label}</option>
                    {filter.options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-md top-1/2 -translate-y-1/2 text-5" size={14} strokeWidth={2}/>
                </div>
              ) : filter.type === "date" ? (
                <input className="pl-md pr-md py-2 bg-2 border border-7 rounded-md text-[13px] text-4 font-medium focus:outline-none focus:ring-2 focus:ring-0/10 focus:bg-white transition-all duration-220 ease-spring cursor-pointer" type="date" value={filterValues[filter.key] ?? ""} onChange={(e) => onFilterChange?.(filter.key, e.target.value)}/>
              ) : filter.type === "dateRange" ? (
                <div className="flex items-center gap-xs bg-2 border border-7 rounded-md px-3 transition-all duration-220 ease-spring focus-within:ring-2 focus-within:ring-0/10 focus-within:bg-white" >
                  <input className="bg-transparent py-2 text-[13px] text-4 font-medium focus:outline-none cursor-pointer text-Data-Monospace-Tabular" type="date" value={filterValues[`${filter.key}Start`] ?? ""} onChange={(e) => onFilterChange?.(`${filter.key}Start`, e.target.value)}/>
                  <span className="text-5 font-bold" >~</span>
                  <input className="bg-transparent py-2 text-[13px] text-4 font-medium focus:outline-none cursor-pointer text-Data-Monospace-Tabular" type="date" value={filterValues[`${filter.key}End`] ?? ""} onChange={(e) => onFilterChange?.(`${filter.key}End`, e.target.value)}/>
                </div>
              ) : null}
            </div>
          ))}
          {onReset && (
            <button className="flex items-center gap-1.5 px-md py-2 text-5 hover:text-0 transition-all duration-220 ease-spring text-[13px] font-bold" onClick={onReset}>
              <RotateCcw size={14} strokeWidth={2}/>
              <span >초기화</span>
            </button>
          )}
        </div>
      </div>

      {activeTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-220 ease-spring" >
          <div className="flex items-center gap-1.5 text-5 text-[11px] font-bold uppercase tracking-wider mr-2" >
            <Filter size={12} strokeWidth={3}/>
            <span >필터:</span>
          </div>
          {activeTags.map((tag, index) => (
            <div className="flex items-center gap-2 bg-0 text-white rounded-md px-3 py-1 text-[11px] font-bold shadow-sm animate-in scale-in duration-220 ease-spring" key={`${tag.key}-${tag.value}-${index}`}>
              <span >{tag.label}</span>
              <button className="hover:bg-white/20 rounded-full p-[2px] transition-colors" onClick={() => onRemoveFilter?.(tag.key, tag.value)}>
                <X size={12} strokeWidth={3}/>
              </button>
            </div>
          ))}
          {onReset && <button className="text-5 text-[11px] font-bold hover:text-0 underline underline-offset-4 ml-2 uppercase tracking-wider" onClick={onReset}>모두 지우기</button>}
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
