import React from "react";
import { cn } from "@/lib/utils";

export interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function ChartCard({
  title,
  description,
  children,
  actions,
  className,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-xl border border-line p-lg flex flex-col gap-md",
        className
      )}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-sm">
        <div className="flex flex-col gap-xs">
          <h3 className="text-Body-Primary-KR text-content font-semibold">{title}</h3>
          {description && (
            <p className="text-Label text-content-secondary">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-xs shrink-0">{actions}</div>}
      </div>

      {/* 차트 영역 */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
