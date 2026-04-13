import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 버튼 변형 */
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  /** 버튼 크기 */
  size?: "sm" | "md" | "lg";
  /** 로딩 상태 */
  loading?: boolean;
  /** 왼쪽 아이콘 */
  icon?: React.ReactNode;
  /** 전체 너비 */
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-white hover:opacity-90 active:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/40",
  secondary:
    "bg-surface-secondary text-content hover:bg-surface-tertiary active:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-line",
  outline:
    "border border-line bg-transparent text-content hover:bg-surface-secondary active:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-line",
  ghost:
    "bg-transparent text-content hover:bg-surface-secondary active:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-line",
  danger:
    "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400/40",
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-sm text-[12px] gap-xs rounded-button",
  md: "h-[44px] px-md text-[13px] gap-xs rounded-button",
  lg: "h-12 px-lg text-[14px] gap-sm rounded-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 outline-none select-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && "w-full",
        isDisabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === "sm" ? 13 : size === "lg" ? 16 : 14} className="animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
}
