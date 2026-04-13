import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "info";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  /** 배지 색상 변형 */
  variant?: BadgeVariant;
  /** 배지 크기 */
  size?: BadgeSize;
  /** 앞에 원형 인디케이터 표시 여부 */
  dot?: boolean;
  /** 배지 내용 */
  children: React.ReactNode;
  /** 추가 클래스 */
  className?: string;
}

// variant별 배경/텍스트 색상
const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: "bg-accent text-content border border-line",
  success: "bg-accent-light text-state-success border border-secondary-mint/20",
  warning: "bg-primary-light text-amber-600 border border-primary-coral/20",
  error: "bg-error/10 text-state-error border border-error/20",
  info: "bg-primary-light text-primary border border-0/20",
};

// variant별 dot 색상
const DOT_STYLES: Record<BadgeVariant, string> = {
  default: "bg-content-secondary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-primary",
};

// size별 패딩/폰트
const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-[11px]",
};

// size별 dot 크기
const DOT_SIZE_STYLES: Record<BadgeSize, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
};

export default function Badge({
  variant = "default",
  size = "md",
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-bold uppercase tracking-wider",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
    >
      {/* 원형 인디케이터 */}
      {dot && (
        <span
          className={cn("rounded-full flex-shrink-0", DOT_STYLES[variant], DOT_SIZE_STYLES[size])}
        />
      )}
      {children}
    </span>
  );
}
