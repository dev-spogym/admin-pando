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
    "bg-gradient-to-r from-primary to-[#ff907f] text-white shadow-sm hover:-translate-y-[1px] hover:shadow-float active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/30",
  secondary:
    "app-control text-content hover:border-primary/30 hover:bg-white active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary/15",
  outline:
    "border border-line/80 bg-white/72 text-content shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:border-primary/35 hover:bg-white active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary/15",
  ghost:
    "bg-transparent text-content hover:bg-white/70 active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary/15",
  danger:
    "bg-gradient-to-r from-error to-[#ff7b7b] text-white shadow-sm hover:-translate-y-[1px] hover:shadow-float active:translate-y-0 focus-visible:ring-2 focus-visible:ring-error/30",
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-sm text-[12px] gap-xs rounded-xl",
  md: "h-10 px-md text-[13px] gap-xs rounded-2xl",
  lg: "h-12 px-lg text-[14px] gap-sm rounded-2xl",
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
        "inline-flex items-center justify-center font-semibold transition-all duration-150 outline-none select-none whitespace-nowrap",
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
