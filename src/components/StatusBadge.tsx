import React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: "bg-bg-soft-mint text-success border border-secondary-mint/20",
  warning: "bg-bg-soft-peach text-warning border border-primary-coral/20",
  error: "bg-error text-white",
  info: "bg-6 text-0 border border-0/20", 
  default: "bg-1 text-4 border border-7",
};

const DOT_STYLES: Record<BadgeVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-white",
  info: "bg-0",
  default: "bg-4",
};

interface StatusBadgeProps {
  label?: string;
  children?: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({
  label,
  children,
  variant = "default",
  dot = false,
  className = "",
}: StatusBadgeProps) {
  const content = label || children;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider",
        VARIANT_STYLES[variant],
        className
      )} >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[variant])} />}
      {content}
    </span>
  );
}

export default StatusBadge;
