import React, { useCallback, useId } from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  showValue = true,
  disabled = false,
  className,
}: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  return (
    <div className={cn("flex items-center gap-sm", className)}>
      <div className="relative flex-1 h-5 flex items-center">
        {/* 트랙 배경 */}
        <div className="absolute w-full h-1.5 rounded-full bg-surface-tertiary" />
        {/* 진행 트랙 */}
        <div
          className="absolute h-1.5 rounded-full bg-primary transition-all duration-100"
          style={{ width: `${pct}%` }}
        />
        {/* 네이티브 input[range] */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className={cn(
            "absolute w-full h-full opacity-0 cursor-pointer",
            disabled && "cursor-not-allowed"
          )}
        />
        {/* 핸들 */}
        <div
          className={cn(
            "absolute w-4 h-4 rounded-full bg-white border-2 border-primary shadow-sm",
            "transition-transform duration-100 -translate-x-1/2",
            disabled && "opacity-50"
          )}
          style={{ left: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="text-Label text-content-secondary min-w-[32px] text-right select-none">
          {value}
        </span>
      )}
    </div>
  );
}
