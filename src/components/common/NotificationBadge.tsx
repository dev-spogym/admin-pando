import React from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  max?: number;
  variant?: 'dot' | 'count';
  color?: string;
  className?: string;
  children: React.ReactNode;
}

export default function NotificationBadge({
  count,
  max = 99,
  variant = 'count',
  color,
  className,
  children,
}: NotificationBadgeProps) {
  const show = count > 0;
  const displayCount = count > max ? `${max}+` : String(count);

  return (
    <span className={cn('relative inline-flex', className)}>
      {children}
      {show && (
        <span
          className={cn(
            'absolute z-10 flex items-center justify-center font-semibold',
            variant === 'dot'
              ? 'top-0 right-0 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full'
              : 'top-0 right-0 -translate-y-1/3 translate-x-1/3 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] text-white tabular-nums'
          )}
          style={{ backgroundColor: color ?? '#EF4444' }}
        >
          {variant === 'count' && displayCount}
        </span>
      )}
    </span>
  );
}
