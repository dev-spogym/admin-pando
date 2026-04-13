import React, { useState, useRef, useEffect } from "react";
import { Columns, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnDefinition {
  key: string;
  label: string;
  visible: boolean;
}

export interface ColumnToggleProps {
  columns: ColumnDefinition[];
  onChange: (key: string, visible: boolean) => void;
  className?: string;
}

export default function ColumnToggle({
  columns,
  onChange,
  className,
}: ColumnToggleProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleCount = columns.filter((c) => c.visible).length;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-9 px-3 flex items-center gap-1.5 rounded-lg border text-[13px] transition-colors",
          "bg-surface-secondary border-line hover:border-primary/50 text-content-secondary hover:text-content",
          open && "border-primary text-primary"
        )}
        aria-label="컬럼 표시 설정"
      >
        <Columns size={14} />
        <span>컬럼</span>
        <span className="text-[11px] text-content-tertiary">
          {visibleCount}/{columns.length}
        </span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 right-0 min-w-[180px] bg-surface rounded-lg border border-line shadow-card-deep py-xs",
            "animate-in fade-in zoom-in-95 duration-100"
          )}
        >
          <div className="px-md py-xs border-b border-line mb-xs">
            <span className="text-[11px] font-semibold text-content-secondary">
              컬럼 표시/숨기기
            </span>
          </div>
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-xs px-md py-sm cursor-pointer hover:bg-surface-secondary transition-colors"
            >
              <span
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                  col.visible ? "bg-primary border-primary" : "border-line"
                )}
              >
                {col.visible && <Check size={10} className="text-white" />}
              </span>
              <input
                type="checkbox"
                checked={col.visible}
                onChange={(e) => onChange(col.key, e.target.checked)}
                className="sr-only"
              />
              <span className="text-[13px] text-content truncate">
                {col.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
