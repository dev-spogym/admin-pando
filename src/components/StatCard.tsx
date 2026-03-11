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
}

/**
 * StatCard - 통계 요약 카드 컴포넌트
 * 2026 Light Admin Dashboard 스타일 적용
 */
export default function StatCard({
  label,
  value,
  icon,
  description,
  change,
  onClick,
  className = "",
  variant = "default",
}: StatCardProps) {
  const isPositive = change && change.value >= 0;

  const variantStyles = {
    default: "bg-3 border-7 shadow-1",
    peach: "bg-6 border-0/10",
    mint: "bg-bg-soft-mint border-secondary-mint/10",
  };

  return (
    <div
      className={cn(
        "rounded-3 border-[1px] p-lg transition-all duration-220 ease-spring",
        variantStyles[variant],
        onClick ? "cursor-pointer hover:shadow-2 hover:translate-y-[-2px] active:scale-[0.98]" : "",
        className
      )} onClick={onClick}>
      <div className="flex items-start justify-between" >
        <div className="flex-1" >
          <p className="text-[12px] font-medium text-5 mb-1 uppercase tracking-wider" >{label}</p>
          <div className="flex items-baseline gap-xs" >
            <h3 className="text-KPI-Large text-4 font-bold tabular-nums" >{value}</h3>
          </div>

          {(description || change) && (
            <div className="mt-2 flex flex-col gap-[2px]" >
              {change && (
                <div
                  className={cn(
                    "text-[11px] font-bold flex items-center gap-[2px] uppercase tracking-wide",
                    isPositive ? "text-success" : "text-error"
                  )} >
                  {isPositive ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                  <span >{Math.abs(change.value)}%</span>
                  {change.label && (
                    <span className="text-5 ml-xs font-normal normal-case tracking-normal" >
                      {change.label}
                    </span>
                  )}
                </div>
              )}
              {description && (
                <p className="text-[13px] text-5" >{description}</p>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-2 flex items-center justify-center transition-colors",
              variant === "peach"
                ? "bg-0 text-white"
                : variant === "mint"
                ? "bg-secondary-mint text-white"
                : "bg-2 text-5"
            )} >
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement, { size: 20, strokeWidth: 2 })
              : icon}
          </div>
        )}
      </div>
    </div>
  );
}
