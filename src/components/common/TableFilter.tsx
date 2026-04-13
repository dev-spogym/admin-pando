import React, { useState, useRef, useEffect } from "react";
import { Filter, ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterDefinition {
  key: string;
  label: string;
  type: "select" | "date" | "dateRange";
  options?: { value: string; label: string }[];
}

export interface TableFilterProps {
  filters: FilterDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
  className?: string;
}

export default function TableFilter({
  filters,
  values,
  onChange,
  onReset,
  className,
}: TableFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCount = Object.values(values).filter(
    (v) => v !== undefined && v !== null && v !== ""
  ).length;

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
      >
        <Filter size={14} />
        <span>필터</span>
        {activeCount > 0 && (
          <span className="h-4 min-w-[16px] px-1 bg-primary text-white rounded-full text-[10px] font-medium flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <ChevronDown
          size={13}
          className={cn(
            "text-content-tertiary transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 right-0 min-w-[280px] bg-surface rounded-lg border border-line shadow-card-deep p-md",
            "animate-in fade-in zoom-in-95 duration-100"
          )}
        >
          <div className="flex items-center justify-between mb-sm">
            <span className="text-[12px] font-semibold text-content-secondary">
              필터 조건
            </span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onReset();
                }}
                className="flex items-center gap-1 text-[11px] text-content-tertiary hover:text-primary transition-colors"
              >
                <RotateCcw size={11} />
                초기화
              </button>
            )}
          </div>

          <div className="flex flex-col gap-sm">
            {filters.map((filter) => (
              <div key={filter.key} className="flex flex-col gap-xs">
                <label className="text-[11px] font-medium text-content-secondary">
                  {filter.label}
                </label>

                {filter.type === "select" && filter.options && (
                  <select
                    value={(values[filter.key] as string) ?? ""}
                    onChange={(e) =>
                      onChange(filter.key, e.target.value || undefined)
                    }
                    className="h-8 px-sm bg-surface-secondary rounded border border-line text-[12px] text-content focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                  >
                    <option value="">전체</option>
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === "date" && (
                  <input
                    type="date"
                    value={(values[filter.key] as string) ?? ""}
                    onChange={(e) =>
                      onChange(filter.key, e.target.value || undefined)
                    }
                    className="h-8 px-sm bg-surface-secondary rounded border border-line text-[12px] text-content focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                  />
                )}

                {filter.type === "dateRange" && (
                  <div className="flex items-center gap-xs">
                    <input
                      type="date"
                      value={
                        ((values[filter.key] as { start?: string })?.start) ?? ""
                      }
                      onChange={(e) =>
                        onChange(filter.key, {
                          ...(values[filter.key] as object ?? {}),
                          start: e.target.value || undefined,
                        })
                      }
                      className="flex-1 h-8 px-sm bg-surface-secondary rounded border border-line text-[12px] text-content focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                    />
                    <span className="text-[11px] text-content-tertiary shrink-0">
                      ~
                    </span>
                    <input
                      type="date"
                      value={
                        ((values[filter.key] as { end?: string })?.end) ?? ""
                      }
                      onChange={(e) =>
                        onChange(filter.key, {
                          ...(values[filter.key] as object ?? {}),
                          end: e.target.value || undefined,
                        })
                      }
                      className="flex-1 h-8 px-sm bg-surface-secondary rounded border border-line text-[12px] text-content focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
