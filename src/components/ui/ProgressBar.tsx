import React from "react";
import { cn } from "@/lib/utils";

export type ProgressColor = "primary" | "success" | "warning" | "error";
export type ProgressSize = "sm" | "md";

export interface ProgressBarProps {
  /** 진행률 (0~100) */
  value: number;
  /** 바 색상 */
  color?: ProgressColor;
  /** 바 높이 */
  size?: ProgressSize;
  /** 레이블 텍스트 */
  label?: string;
  /** 90% 이상 시 자동으로 warning 색상 적용 */
  autoWarning?: boolean;
  /** 추가 클래스 */
  className?: string;
}

// 색상별 바 클래스
const COLOR_STYLES: Record<ProgressColor, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};

// 크기별 트랙 높이
const SIZE_STYLES: Record<ProgressSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
};

export default function ProgressBar({
  value,
  color = "primary",
  size = "md",
  label,
  autoWarning = false,
  className,
}: ProgressBarProps) {
  // 0~100 범위 제한
  const clamped = Math.min(100, Math.max(0, value));

  // 90% 이상이고 autoWarning이면 warning 색상으로 override
  const resolvedColor: ProgressColor =
    autoWarning && clamped >= 90 ? "warning" : color;

  return (
    <div className={cn("w-full", className)}>
      {/* 레이블 + 퍼센트 */}
      {(label !== undefined) && (
        <div className="mb-xs flex items-center justify-between">
          <span className="text-Label text-content-secondary">{label}</span>
          <span className="text-Label font-semibold text-content">{clamped}%</span>
        </div>
      )}

      {/* 레이블 없이 퍼센트만 표시하는 경우 */}
      {label === undefined && (
        <div className="mb-xs flex justify-end">
          <span className="text-Label font-semibold text-content">{clamped}%</span>
        </div>
      )}

      {/* 트랙 */}
      <div className={cn("w-full overflow-hidden rounded-full bg-surface-secondary", SIZE_STYLES[size])}>
        {/* 채워진 바 */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            COLOR_STYLES[resolvedColor]
          )}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
