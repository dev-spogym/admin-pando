import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  prefix?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function formatComma(n: number): string {
  if (isNaN(n)) return "";
  return n.toLocaleString("ko-KR");
}

function parseComma(s: string): number {
  const cleaned = s.replace(/,/g, "").replace(/[^0-9]/g, "");
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export default function CurrencyInput({
  value,
  onChange,
  label,
  error,
  prefix = "₩",
  min,
  max,
  placeholder = "0",
  disabled = false,
  className,
}: CurrencyInputProps) {
  const id = useId();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let parsed = parseComma(e.target.value);
    if (min !== undefined) parsed = Math.max(min, parsed);
    if (max !== undefined) parsed = Math.min(max, parsed);
    onChange(parsed);
  }

  const displayValue = value === 0 ? "" : formatComma(value);

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      {label && (
        <label htmlFor={id} className="text-Label font-medium text-content">
          {label}
        </label>
      )}

      <div
        className={cn(
          "flex items-center overflow-hidden rounded-input border bg-surface-secondary transition-all",
          "focus-within:ring-2 focus-within:ring-primary/20",
          error ? "border-error focus-within:ring-error/20" : "border-line hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {prefix && (
          <span className="flex-shrink-0 select-none pl-md text-Body-Primary-KR text-content-secondary">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "min-w-0 flex-1 bg-transparent px-sm py-sm",
            "text-Body-Primary-KR text-content focus:outline-none",
            "placeholder:text-content-secondary",
            disabled && "cursor-not-allowed"
          )}
        />
      </div>

      {error && (
        <p className="text-[11px] font-medium text-state-error">{error}</p>
      )}
    </div>
  );
}
