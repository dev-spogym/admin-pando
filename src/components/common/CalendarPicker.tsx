import React, { useState, useRef, useEffect, useId } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCALE_KO = {
  days: ["일", "월", "화", "수", "목", "금", "토"],
  months: [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월",
  ],
};

export interface CalendarPickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  mode?: "single" | "range";
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  onRangeChange?: (start: Date | null, end: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  highlightDates?: { date: Date; color: string }[];
  locale?: "ko";
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date): boolean {
  const ad = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bd = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return ad < bd;
}

function isAfterDay(a: Date, b: Date): boolean {
  const ad = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bd = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return ad > bd;
}

function isBetweenDay(d: Date, start: Date, end: Date): boolean {
  return isAfterDay(d, start) && isBeforeDay(d, end);
}

function formatDateKo(date: Date | null): string {
  if (!date) return "";
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPicker({
  value,
  onChange,
  mode = "single",
  rangeStart,
  rangeEnd,
  onRangeChange,
  minDate,
  maxDate,
  disabledDates = [],
  highlightDates = [],
  label,
  placeholder = "날짜 선택",
  error,
  disabled = false,
  className,
}: CalendarPickerProps) {
  const id = useId();
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    (value ?? today).getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    (value ?? today).getMonth()
  );
  // range 모드 내부 상태 (외부 props 없을 경우)
  const [internalRangeStart, setInternalRangeStart] = useState<Date | null>(
    rangeStart ?? null
  );
  const [internalRangeEnd, setInternalRangeEnd] = useState<Date | null>(
    rangeEnd ?? null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveRangeStart =
    rangeStart !== undefined ? rangeStart : internalRangeStart;
  const effectiveRangeEnd =
    rangeEnd !== undefined ? rangeEnd : internalRangeEnd;

  // 외부 클릭 시 닫기
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

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function isDisabled(date: Date): boolean {
    if (minDate && isBeforeDay(date, minDate)) return true;
    if (maxDate && isAfterDay(date, maxDate)) return true;
    return disabledDates.some((d) => isSameDay(d, date));
  }

  function getHighlight(date: Date): string | undefined {
    const found = highlightDates.find((h) => isSameDay(h.date, date));
    return found?.color;
  }

  function handleDayClick(date: Date) {
    if (isDisabled(date)) return;

    if (mode === "single") {
      onChange(date);
      setOpen(false);
    } else {
      // range 모드: 첫 클릭 = start, 두 번째 클릭 = end
      if (!effectiveRangeStart || (effectiveRangeStart && effectiveRangeEnd)) {
        setInternalRangeStart(date);
        setInternalRangeEnd(null);
        onRangeChange?.(date, null);
        onChange(date);
      } else {
        if (isBeforeDay(date, effectiveRangeStart)) {
          setInternalRangeStart(date);
          setInternalRangeEnd(effectiveRangeStart);
          onRangeChange?.(date, effectiveRangeStart);
          onChange(date);
        } else {
          setInternalRangeEnd(date);
          onRangeChange?.(effectiveRangeStart, date);
          onChange(effectiveRangeStart);
          setOpen(false);
        }
      }
    }
  }

  // 그리드 날짜 배열 생성
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(viewYear, viewMonth, d));
  }

  // 표시 텍스트
  let displayText = "";
  if (mode === "single") {
    displayText = formatDateKo(value);
  } else {
    if (effectiveRangeStart && effectiveRangeEnd) {
      displayText = `${formatDateKo(effectiveRangeStart)} ~ ${formatDateKo(effectiveRangeEnd)}`;
    } else if (effectiveRangeStart) {
      displayText = `${formatDateKo(effectiveRangeStart)} ~ `;
    }
  }

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-xs", className)}>
      {label && (
        <label htmlFor={id} className="text-Label font-medium text-content">
          {label}
        </label>
      )}

      {/* 트리거 */}
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
          displayText ? "text-content" : "text-content-secondary"
        )}
      >
        <span>{displayText || placeholder}</span>
        <Calendar size={16} className="text-content-secondary flex-shrink-0" />
      </button>

      {error && (
        <p className="text-[11px] font-medium text-state-error">{error}</p>
      )}

      {/* 팝오버 캘린더 */}
      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-line bg-surface-primary p-4 shadow-lg"
          )}
        >
          {/* 월 네비게이션 */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-secondary"
              aria-label="이전 달"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-content">
              {viewYear}년 {LOCALE_KO.months[viewMonth]}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-secondary"
              aria-label="다음 달"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="mb-1 grid grid-cols-7">
            {LOCALE_KO.days.map((day, i) => (
              <div
                key={day}
                className={cn(
                  "text-center text-[11px] font-medium py-1",
                  i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-content-secondary"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;

              const isToday = isSameDay(date, today);
              const isSelected =
                mode === "single"
                  ? value !== null && isSameDay(date, value!)
                  : (effectiveRangeStart !== null &&
                      effectiveRangeStart !== undefined &&
                      isSameDay(date, effectiveRangeStart)) ||
                    (effectiveRangeEnd !== null &&
                      effectiveRangeEnd !== undefined &&
                      isSameDay(date, effectiveRangeEnd));
              const isInRange =
                mode === "range" &&
                effectiveRangeStart &&
                effectiveRangeEnd &&
                isBetweenDay(date, effectiveRangeStart, effectiveRangeEnd);
              const isDisabledDay = isDisabled(date);
              const highlight = getHighlight(date);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleDayClick(date)}
                  disabled={isDisabledDay}
                  className={cn(
                    "relative flex h-8 w-full items-center justify-center rounded text-xs transition-colors",
                    isDisabledDay
                      ? "cursor-not-allowed opacity-30"
                      : "cursor-pointer hover:bg-primary/10",
                    isSelected && "bg-primary text-white hover:bg-primary",
                    isInRange && !isSelected && "bg-primary/15 rounded-none",
                    isToday && !isSelected && "ring-1 ring-primary"
                  )}
                  aria-label={`${viewYear}년 ${viewMonth + 1}월 ${date.getDate()}일`}
                  aria-selected={isSelected}
                  aria-disabled={isDisabledDay}
                >
                  <span>{date.getDate()}</span>
                  {highlight && !isSelected && (
                    <span
                      className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: highlight }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
