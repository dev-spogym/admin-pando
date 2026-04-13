import React, { useState, useRef, useEffect, useId } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
  min?: string; // "HH:mm"
  max?: string; // "HH:mm"
  step?: 15 | 30 | 60;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildTimeOptions(
  min: string,
  max: string,
  step: number
): string[] {
  const minMins = timeToMinutes(min);
  const maxMins = timeToMinutes(max);
  const options: string[] = [];
  for (let t = minMins; t <= maxMins; t += step) {
    options.push(minutesToTime(t));
  }
  return options;
}

export default function TimePicker({
  value,
  onChange,
  min = "00:00",
  max = "23:59",
  step = 30,
  label,
  error,
  placeholder = "시간 선택",
  disabled = false,
  className,
}: TimePickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const options = buildTimeOptions(min, max, step);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // 열릴 때 선택된 항목으로 스크롤
  useEffect(() => {
    if (open && listRef.current && value) {
      const idx = options.indexOf(value);
      if (idx !== -1) {
        const item = listRef.current.children[idx] as HTMLElement;
        item?.scrollIntoView({ block: "nearest" });
      }
    }
  }, [open, value, options]);

  function handleSelect(t: string) {
    onChange(t);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-xs", className)}>
      {label && (
        <label htmlFor={id} className="text-Label font-medium text-content">
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-input border bg-surface-secondary px-md py-sm",
          "text-Body-Primary-KR transition-all focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-error focus:ring-error/20"
            : "border-line hover:border-primary/50",
          value ? "text-content" : "text-content-secondary"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Clock size={14} className="text-content-secondary flex-shrink-0" />
          {value || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-content-secondary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {error && (
        <p className="text-[11px] font-medium text-state-error">{error}</p>
      )}

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="시간 목록"
          className={cn(
            "absolute left-0 top-full z-50 mt-1 max-h-52 w-full overflow-y-auto",
            "rounded-lg border border-line bg-surface-primary shadow-lg"
          )}
        >
          {options.length === 0 && (
            <li className="px-md py-sm text-xs text-content-secondary">
              선택 가능한 시간 없음
            </li>
          )}
          {options.map((t) => (
            <li
              key={t}
              role="option"
              aria-selected={t === value}
              onClick={() => handleSelect(t)}
              className={cn(
                "cursor-pointer px-md py-2 text-sm transition-colors",
                t === value
                  ? "bg-primary text-white"
                  : "text-content hover:bg-surface-secondary"
              )}
            >
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
