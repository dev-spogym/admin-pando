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
          "rounded-xl border border-line bg-surface p-lg transition-all",
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
        "rounded-xl border border-line bg-surface p-lg transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-px",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[12px] font-medium text-content-secondary mb-[6px]">{label}</p>
          <h3 className="text-KPI-Large text-content tabular-nums">{value}</h3>

          {(description || change) && (
            <div className="mt-[6px]">
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
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              variant === "peach"
                ? "bg-primary-light text-primary"
                : variant === "mint"
                ? "bg-accent-light text-accent"
                : "bg-surface-tertiary text-content-secondary"
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
