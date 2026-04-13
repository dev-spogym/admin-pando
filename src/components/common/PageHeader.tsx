import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  breadcrumb?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  breadcrumb,
  title,
  description,
  actions,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={cn("mb-lg", className)}>
      {breadcrumb && (
        <div className="text-[12px] text-content-tertiary mb-sm">{breadcrumb}</div>
      )}
      <div className="flex items-center justify-between gap-md">
        <div className="min-w-[160px]">
          <h1 className="text-Page-Title text-content">{title}</h1>
          {description && (
            <p className="text-[13px] text-content-secondary mt-[2px]">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-sm shrink-0 flex-nowrap [&_button]:whitespace-nowrap [&_span]:whitespace-nowrap">
            {actions}
          </div>
        )}
      </div>
      {children && <div className="mt-md">{children}</div>}
    </div>
  );
}
