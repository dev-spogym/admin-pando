import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface KanbanItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  avatar?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  items: KanbanItem[];
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onDragEnd?: (itemId: string, fromColId: string, toColId: string) => void;
  onItemClick?: (item: KanbanItem) => void;
  className?: string;
}

export default function KanbanBoard({
  columns,
  onDragEnd,
  onItemClick,
  className,
}: KanbanBoardProps) {
  const [draggingItem, setDraggingItem] = useState<{ itemId: string; fromColId: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const handleDragStart = (itemId: string, fromColId: string) => {
    setDraggingItem({ itemId, fromColId });
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDrop = (e: React.DragEvent, toColId: string) => {
    e.preventDefault();
    if (draggingItem && draggingItem.fromColId !== toColId) {
      onDragEnd?.(draggingItem.itemId, draggingItem.fromColId, toColId);
    }
    setDraggingItem(null);
    setDragOverCol(null);
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
    setDragOverCol(null);
  };

  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
      {columns.map((col) => (
        <div
          key={col.id}
          className={cn(
            'flex flex-col w-64 shrink-0 rounded-xl border transition-colors',
            dragOverCol === col.id ? 'border-primary bg-primary/5' : 'border-line bg-surface-secondary'
          )}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          {/* 컬럼 헤더 */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
            <div className="flex items-center gap-2">
              {col.color && (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: col.color }}
                />
              )}
              <span className="text-[13px] font-semibold text-content">{col.title}</span>
            </div>
            <span className="text-[11px] font-semibold text-white bg-content-tertiary rounded-full px-2 py-0.5 tabular-nums">
              {col.items.length}
            </span>
          </div>

          {/* 아이템 목록 */}
          <div className="flex flex-col gap-2 p-2 min-h-[80px]">
            {col.items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id, col.id)}
                onDragEnd={handleDragEnd}
                onClick={() => onItemClick?.(item)}
                className={cn(
                  'bg-white rounded-lg border border-line p-3 cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-sm',
                  draggingItem?.itemId === item.id && 'opacity-40'
                )}
              >
                <div className="flex items-start gap-2">
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.title}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-primary">
                        {item.title.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-content truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[11px] text-content-secondary truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {item.badge && (
                  <span className="mt-2 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-light text-primary">
                    {item.badge}
                  </span>
                )}
              </div>
            ))}

            {col.items.length === 0 && (
              <div className="flex items-center justify-center h-16 text-[12px] text-content-tertiary">
                항목 없음
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
