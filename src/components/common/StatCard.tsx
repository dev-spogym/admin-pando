import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  change?: { value: number; label?: string };
  onClick?: () => void;
  className?: string;
  variant?: "default" | "peach" | "mint";
  loading?: boolean;
}

export default function StatCard({
  label,
  value,
  icon,
  description,
  change,
  onClick,
  className = "",
  variant = "default",
  loading = false,
}: StatCardProps) {
  const isPositive = change && change.value >= 0;

  if (loading) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-[22px] border border-line/70 bg-white/82 p-lg shadow-card backdrop-blur-xl transition-all",
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-[14px] w-16 rounded bg-surface-tertiary animate-pulse mb-[6px]" />
            <div className="h-[28px] w-20 rounded bg-surface-tertiary animate-pulse" />
            <div className="mt-[6px] h-[11px] w-24 rounded bg-surface-tertiary animate-pulse" />
          </div>
          <div className="w-9 h-9 rounded-lg bg-surface-tertiary animate-pulse shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-line/70 bg-white/82 p-lg shadow-card backdrop-blur-xl transition-all",
        onClick && "cursor-pointer hover:-translate-y-[2px] hover:shadow-card-deep",
        className
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          variant === "peach"
            ? "bg-gradient-to-r from-primary to-[#ff9b8d]"
            : variant === "mint"
            ? "bg-gradient-to-r from-accent to-[#6be4df]"
            : "bg-gradient-to-r from-slate-200 to-slate-100"
        )}
      />
      <div className="absolute right-[-24px] top-[-24px] h-24 w-24 rounded-full bg-primary/6 blur-2xl" />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-[8px] text-[12px] font-semibold tracking-[0.02em] text-content-secondary">{label}</p>
          <h3 className="text-KPI-Large break-all leading-tight text-content tabular-nums">{value}</h3>

          {(description || change) && (
            <div className="mt-[8px]">
              {change && (
                <div
                  className={cn(
                    "text-[11px] font-semibold flex items-center gap-[3px]",
                    isPositive ? "text-state-success" : "text-state-error"
                  )}
                >
                  {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{Math.abs(change.value)}%</span>
                  {change.label && (
                    <span className="text-content-tertiary ml-xs font-normal">{change.label}</span>
                  )}
                </div>
              )}
              {description && <p className="text-[12px] text-content-secondary mt-1">{description}</p>}
            </div>
          )}
        </div>

        {icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
              variant === "peach"
                ? "border-primary/15 bg-primary-light text-primary"
                : variant === "mint"
                ? "border-accent/15 bg-accent-light text-accent"
                : "border-line/70 bg-surface-tertiary text-content-secondary"
            )}
          >
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement, { size: 18, strokeWidth: 1.5 })
              : icon}
          </div>
        )}
      </div>
    </div>
  );
}
