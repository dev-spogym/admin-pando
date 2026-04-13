import React from "react";
import { cn } from "@/lib/utils";

export interface ToggleGroupOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface ToggleGroupProps {
  options: ToggleGroupOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ToggleGroup({
  options,
  value,
  onChange,
  disabled = false,
  className,
}: ToggleGroupProps) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center border border-line rounded-lg p-0.5 bg-surface-secondary gap-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-xs px-sm py-xs rounded-md text-Label font-medium",
              "transition-all duration-150 outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary/40",
              selected
                ? "bg-primary text-white shadow-sm"
                : "text-content-secondary hover:text-content hover:bg-surface",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
