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
    <div className={cn("relative mb-xl overflow-hidden rounded-[26px] border border-line/70 bg-white/82 px-xl py-xl shadow-card backdrop-blur-xl", className)}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary/70" />
      {breadcrumb && (
        <div className="mb-md text-[12px] font-medium text-content-tertiary">{breadcrumb}</div>
      )}
      <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-[160px] max-w-[860px]">
          <div className="mb-sm flex items-center gap-sm">
            <span className="app-chip text-primary">Screen Publishing</span>
          </div>
          <h1 className="text-Page-Title text-content">{title}</h1>
          {description && (
            <p className="mt-[6px] text-[13px] leading-6 text-content-secondary">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-sm [&_button]:whitespace-nowrap [&_span]:whitespace-nowrap">
            {actions}
          </div>
        )}
      </div>
      {children && <div className="mt-lg">{children}</div>}
    </div>
  );
}
