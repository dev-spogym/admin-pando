import React from 'react';
import { cn } from '@/lib/utils';

interface TimelineItem {
  date: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  color?: string;
  user?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export default function Timeline({ items, className }: TimelineProps) {
  if (items.length === 0) {
    return (
      <div className={cn('py-lg text-center text-sm text-content-tertiary', className)}>
        이력이 없습니다.
      </div>
    );
  }

  return (
    <div className={cn('relative flex flex-col', className)}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={idx} className="flex gap-sm">
            {/* 날짜 영역 */}
            <div className="w-[90px] shrink-0 pt-[3px] text-right">
              <span className="text-[11px] text-content-tertiary leading-tight whitespace-pre-line">
                {item.date}
              </span>
            </div>

            {/* 도트 + 라인 */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'mt-[5px] h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-surface',
                  item.color ? '' : 'bg-primary'
                )}
                style={item.color ? { backgroundColor: item.color } : undefined}
              >
                {item.icon && (
                  <span className="hidden">{item.icon}</span>
                )}
              </div>
              {!isLast && (
                <div className="mt-1 flex-1 w-px bg-line min-h-[24px]" />
              )}
            </div>

            {/* 내용 영역 */}
            <div className={cn('flex-1 pb-md', isLast && 'pb-0')}>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-content">{item.title}</p>
                {item.user && (
                  <span className="text-[11px] text-content-tertiary">{item.user}</span>
                )}
              </div>
              {item.description && (
                <p className="mt-[2px] text-xs text-content-secondary leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { Timeline };
export type { TimelineItem };
