import React from "react";
import { cn } from "@/lib/utils";
import DatePicker from "./DatePicker";

export interface DateRangePickerProps {
  /** 시작일 (YYYY-MM-DD) */
  startDate: string;
  /** 종료일 (YYYY-MM-DD) */
  endDate: string;
  /** 시작일 변경 핸들러 */
  onStartChange: (value: string) => void;
  /** 종료일 변경 핸들러 */
  onEndChange: (value: string) => void;
  /** 상단 레이블 */
  label?: string;
  /** 추가 클래스 */
  className?: string;
}

// 오늘 날짜 문자열 반환 (YYYY-MM-DD)
function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// N일 전 날짜 문자열 반환
function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// 이번 주 월요일
function getThisMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=일, 1=월 ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// 이번 달 1일
function getFirstOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

// 프리셋 정의
const PRESETS: { label: string; getRange: () => [string, string] }[] = [
  {
    label: "오늘",
    getRange: () => [getToday(), getToday()],
  },
  {
    label: "이번주",
    getRange: () => [getThisMonday(), getToday()],
  },
  {
    label: "이번달",
    getRange: () => [getFirstOfMonth(), getToday()],
  },
  {
    label: "최근 3개월",
    getRange: () => [getDaysAgo(90), getToday()],
  },
];

export default function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  label,
  className,
}: DateRangePickerProps) {
  // 시작일 변경 시 종료일이 시작일보다 이전이면 초기화
  const handleStartChange = (val: string) => {
    onStartChange(val);
    if (endDate && val > endDate) {
      onEndChange("");
    }
  };

  // 종료일 변경 시 시작일보다 이전이면 무시
  const handleEndChange = (val: string) => {
    if (startDate && val < startDate) return;
    onEndChange(val);
  };

  // 프리셋 적용
  const applyPreset = (getRange: () => [string, string]) => {
    const [start, end] = getRange();
    onStartChange(start);
    onEndChange(end);
  };

  return (
    <div className={cn("flex flex-col gap-sm", className)}>
      {/* 레이블 */}
      {label && (
        <span className="text-Label font-medium text-4">{label}</span>
      )}

      {/* 프리셋 버튼 */}
      <div className="flex flex-wrap gap-xs">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.getRange)}
            className={cn(
              "rounded-button border border-7 px-sm py-xs",
              "text-[11px] font-medium text-5 transition-colors",
              "hover:border-0 hover:text-0 hover:bg-6"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* 날짜 입력 영역 */}
      <div className="flex items-end gap-sm">
        <DatePicker
          value={startDate}
          onChange={handleStartChange}
          placeholder="시작일"
          className="flex-1"
        />
        <span className="mb-[10px] text-Body-Primary-KR text-5 flex-shrink-0">~</span>
        <DatePicker
          value={endDate}
          onChange={handleEndChange}
          minDate={startDate || undefined}
          placeholder="종료일"
          className="flex-1"
        />
      </div>
    </div>
  );
}
