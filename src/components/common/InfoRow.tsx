import React from "react";
import { cn } from "@/lib/utils";
import CopyButton from "./CopyButton";

export interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  copyable?: boolean;
  className?: string;
}

export default function InfoRow({ label, value, icon, copyable = false, className }: InfoRowProps) {
  const valueStr = typeof value === "string" ? value : undefined;

  return (
    <div className={cn("flex items-center justify-between gap-sm py-xs", className)}>
      <div className="flex items-center gap-xs text-Label text-content-secondary shrink-0">
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-xs text-Body-Secondary-KR text-content text-right">
        <span className="break-all">{value}</span>
        {copyable && valueStr && <CopyButton text={valueStr} />}
      </div>
    </div>
  );
}
