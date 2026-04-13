import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface DateFilterValue {
  start: string;
  end: string;
}

export interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  className?: string;
}

type PresetKey = "today" | "week" | "month" | "3months" | "year";

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => DateFilterValue;
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

const PRESETS: Preset[] = [
  {
    key: "today",
    label: "오늘",
    getRange: () => {
      const today = toDateString(new Date());
      return { start: today, end: today };
    },
  },
  {
    key: "week",
    label: "이번 주",
    getRange: () => {
      const now = new Date();
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: toDateString(monday), end: toDateString(sunday) };
    },
  },
  {
    key: "month",
    label: "이번 달",
    getRange: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: toDateString(first), end: toDateString(last) };
    },
  },
  {
    key: "3months",
    label: "최근 3개월",
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      return { start: toDateString(start), end: toDateString(end) };
    },
  },
  {
    key: "year",
    label: "올해",
    getRange: () => {
      const year = new Date().getFullYear();
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      };
    },
  },
];

function getActivePreset(value: DateFilterValue): PresetKey | null {
  for (const preset of PRESETS) {
    const range = preset.getRange();
    if (range.start === value.start && range.end === value.end) {
      return preset.key;
    }
  }
  return null;
}

export default function DateFilter({
  value,
  onChange,
  className,
}: DateFilterProps) {
  const activePreset = getActivePreset(value);
  const [customMode, setCustomMode] = useState(false);

  const handlePreset = (preset: Preset) => {
    onChange(preset.getRange());
    setCustomMode(false);
  };

  return (
    <div className={cn("flex flex-col gap-sm", className)}>
      {/* 프리셋 버튼 */}
      <div className="flex flex-wrap gap-xs">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handlePreset(preset)}
            className={cn(
              "h-7 px-3 rounded-full text-[12px] border transition-colors",
              activePreset === preset.key && !customMode
                ? "bg-primary text-white border-primary"
                : "bg-surface-secondary border-line text-content-secondary hover:border-primary/50 hover:text-content"
            )}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomMode((prev) => !prev)}
          className={cn(
            "h-7 px-3 rounded-full text-[12px] border transition-colors",
            customMode
              ? "bg-primary text-white border-primary"
              : "bg-surface-secondary border-line text-content-secondary hover:border-primary/50 hover:text-content"
          )}
        >
          직접 입력
        </button>
      </div>

      {/* 커스텀 날짜 입력 */}
      {customMode && (
        <div className="flex items-center gap-xs">
          <input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="h-8 px-sm bg-surface-secondary rounded border border-line text-[12px] text-content focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
          />
          <span className="text-[11px] text-content-tertiary shrink-0">~</span>
          <input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="h-8 px-sm bg-surface-secondary rounded border border-line text-[12px] text-content focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
          />
        </div>
      )}
    </div>
  );
}
