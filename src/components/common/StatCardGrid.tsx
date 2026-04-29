import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6',
};

export default function StatCardGrid({ children, cols = 4, className }: StatCardGridProps) {
  return (
    <div className={cn('grid gap-md lg:gap-lg', GRID_COLS[cols], className)}>
      {children}
    </div>
  );
}
