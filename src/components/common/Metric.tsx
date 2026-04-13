import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricChange {
  value: number;
  type: "increase" | "decrease";
}

export interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: MetricChange;
  sparkline?: number[];
  loading?: boolean;
  className?: string;
}

function Sparkline({
  data,
  positive,
}: {
  data: number[];
  positive: boolean;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 64;
  const height = 24;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const fillD = `M ${points[0]} L ${points.join(" L ")} L ${
    (data.length - 1) * step
  },${height} L 0,${height} Z`;

  const color = positive ? "#22c55e" : "#ef4444";
  const fillColor = positive
    ? "rgba(34,197,94,0.15)"
    : "rgba(239,68,68,0.15)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
    >
      <path d={fillD} fill={fillColor} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Metric({
  label,
  value,
  unit,
  change,
  sparkline,
  loading = false,
  className,
}: MetricProps) {
  if (loading) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="h-3 w-16 bg-surface-tertiary rounded animate-pulse" />
        <div className="h-7 w-24 bg-surface-tertiary rounded animate-pulse" />
        <div className="h-3 w-12 bg-surface-tertiary rounded animate-pulse" />
      </div>
    );
  }

  const isPositive = change?.type === "increase";
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-[11px] font-medium text-content-tertiary uppercase tracking-wide">
        {label}
      </span>

      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-content leading-none">
            {value}
          </span>
          {unit && (
            <span className="text-[13px] text-content-secondary">{unit}</span>
          )}
        </div>

        {sparkline && sparkline.length >= 2 && (
          <Sparkline data={sparkline} positive={isPositive} />
        )}
      </div>

      {change && (
        <div
          className={cn(
            "flex items-center gap-0.5 text-[11px] font-medium",
            isPositive ? "text-green-600" : "text-red-500"
          )}
        >
          <ChangeIcon size={12} />
          <span>
            {isPositive ? "+" : "-"}
            {Math.abs(change.value)}%
          </span>
          <span className="text-content-tertiary font-normal ml-0.5">
            전월 대비
          </span>
        </div>
      )}
    </div>
  );
}
