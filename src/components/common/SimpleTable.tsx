import React from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

interface SimpleTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  /** 행 클릭 */
  onRowClick?: (row: T, index: number) => void;
  /** 합계 행 */
  summaryRow?: Record<string, React.ReactNode>;
  /** 고정 헤더 */
  stickyHeader?: boolean;
}

export default function SimpleTable<T extends Record<string, any>>({
  columns,
  data,
  className,
  onRowClick,
  summaryRow,
  stickyHeader = false,
}: SimpleTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-line', className)}>
      <table className="w-full text-[13px]">
        <thead>
          <tr className={cn('bg-surface-secondary border-b border-line', stickyHeader && 'sticky top-0 z-10')}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-md py-sm font-medium text-content-secondary',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                )}
                style={col.width ? { width: typeof col.width === 'number' ? `${col.width}px` : col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={cn(
                'border-b border-line last:border-0 hover:bg-surface-secondary/50 transition-colors',
                onRowClick && 'cursor-pointer',
              )}
              onClick={() => onRowClick?.(row, i)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-md py-sm text-content',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                  )}
                >
                  {col.render ? col.render(row[col.key], row, i) : (row[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-md py-xl text-center text-content-tertiary">
                데이터가 없습니다
              </td>
            </tr>
          )}
          {summaryRow && (
            <tr className="bg-surface-secondary font-semibold border-t-2 border-line">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-md py-sm',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                  )}
                >
                  {summaryRow[col.key] ?? ''}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
