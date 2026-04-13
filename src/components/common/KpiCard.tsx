import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendInfo {
  value: number;
  direction: 'up' | 'down' | 'flat';
}

interface KpiCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: TrendInfo;
  trendLabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function KpiCard({
  title,
  value,
  unit,
  trend,
  trendLabel = '전월 대비',
  icon,
  loading = false,
  onClick,
  className,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className={cn('rounded-xl border border-line bg-surface p-lg', className)}>
        <div className="flex items-start justify-between mb-sm">
          <div className="h-3 w-20 rounded bg-surface-tertiary animate-pulse" />
          <div className="h-9 w-9 rounded-lg bg-surface-tertiary animate-pulse" />
        </div>
        <div className="h-8 w-28 rounded bg-surface-tertiary animate-pulse mb-2" />
        <div className="h-3 w-24 rounded bg-surface-tertiary animate-pulse" />
      </div>
    );
  }

  const trendColor =
    trend?.direction === 'up'
      ? 'text-state-success'
      : trend?.direction === 'down'
      ? 'text-state-error'
      : 'text-content-tertiary';

  const TrendIcon =
    trend?.direction === 'up'
      ? TrendingUp
      : trend?.direction === 'down'
      ? TrendingDown
      : Minus;

  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface p-lg transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-px',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-sm">
        <p className="text-[12px] font-medium text-content-secondary">{title}</p>
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-surface-tertiary text-content-secondary flex items-center justify-center shrink-0">
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<{ size?: number; strokeWidth?: number }>, {
                  size: 18,
                  strokeWidth: 1.5,
                })
              : icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-KPI-Large text-content tabular-nums">{value}</span>
        {unit && <span className="text-sm text-content-secondary font-medium">{unit}</span>}
      </div>

      {trend && (
        <div className={cn('mt-[6px] flex items-center gap-1 text-[11px] font-semibold', trendColor)}>
          <TrendIcon size={12} />
          <span>{Math.abs(trend.value)}%</span>
          {trendLabel && (
            <span className="text-content-tertiary font-normal ml-xs">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

export { KpiCard };
