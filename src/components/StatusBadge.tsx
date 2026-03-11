import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "success" | "warning" | "error" | "info" | "default" | "peach" | "mint" | "secondary";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-state-success border border-emerald-200",
  warning: "bg-amber-50 text-amber-600 border border-amber-200",
  error: "bg-red-50 text-state-error border border-red-200",
  info: "bg-blue-50 text-state-info border border-blue-200",
  default: "bg-surface-tertiary text-content-secondary border border-line",
  peach: "bg-primary-light text-primary border border-primary/15",
  mint: "bg-accent-light text-accent border border-accent/15",
  secondary: "bg-surface-secondary text-content-secondary border border-line",
};

const DOT_STYLES: Record<BadgeVariant, string> = {
  success: "bg-state-success",
  warning: "bg-amber-500",
  error: "bg-state-error",
  info: "bg-state-info",
  default: "bg-content-secondary",
  peach: "bg-primary",
  mint: "bg-accent",
  secondary: "bg-content-tertiary",
};

export interface StatusBadgeProps {
  label?: string;
  children?: React.ReactNode;
  variant?: BadgeVariant;
  status?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({
  label,
  children,
  variant: variantProp = "default",
  status,
  dot = false,
  className = "",
}: StatusBadgeProps) {
  const variant = status ?? variantProp;
  const content = label || children;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-md",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[variant])} />}
      {content}
    </span>
  );
}

export default StatusBadge;
