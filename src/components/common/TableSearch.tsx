import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  debounceMs?: number;
  compact?: boolean;
  className?: string;
}

export default function TableSearch({
  value,
  onChange,
  onClear,
  placeholder = "검색...",
  debounceMs = 300,
  compact = false,
  className,
}: TableSearchProps) {
  const [expanded, setExpanded] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부 value 동기화
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // 디바운스
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(localValue);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [localValue, debounceMs, onChange]);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
    onClear?.();
    if (compact) setExpanded(false);
  };

  const handleExpandClick = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleBlur = () => {
    if (compact && !localValue) {
      setExpanded(false);
    }
  };

  // compact + 축소 상태: 아이콘 버튼만 표시
  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={handleExpandClick}
        className={cn(
          "h-9 w-9 flex items-center justify-center rounded-lg border border-line",
          "bg-surface-secondary text-content-secondary hover:border-primary/50 hover:text-content transition-colors",
          className
        )}
        aria-label="검색 열기"
      >
        <Search size={15} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center transition-all duration-200",
        compact ? "w-48" : "w-full max-w-xs",
        className
      )}
    >
      <Search
        size={14}
        className="absolute left-3 text-content-tertiary pointer-events-none shrink-0"
      />
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          "w-full h-9 pl-8 pr-8 rounded-lg border text-[13px] bg-surface-secondary",
          "border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all",
          "placeholder:text-content-tertiary text-content"
        )}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 text-content-tertiary hover:text-content transition-colors"
          aria-label="검색어 지우기"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
