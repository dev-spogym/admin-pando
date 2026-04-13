import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 숫자만 추출 후 한국 전화번호 형식(010-1234-5678)으로 포맷
 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function PhoneInput({
  value,
  onChange,
  label,
  error,
  placeholder = "010-0000-0000",
  disabled = false,
  className,
}: PhoneInputProps) {
  const id = useId();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value);
    onChange(formatted);
  }

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      {label && (
        <label htmlFor={id} className="text-Label font-medium text-content">
          {label}
        </label>
      )}

      <input
        id={id}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={13}
        className={cn(
          "w-full rounded-input border bg-surface-secondary px-md py-sm",
          "text-Body-Primary-KR text-content transition-all",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "placeholder:text-content-secondary",
          error
            ? "border-error focus:ring-error/20"
            : "border-line hover:border-primary/50"
        )}
      />

      {error && (
        <p className="text-[11px] font-medium text-state-error">{error}</p>
      )}
    </div>
  );
}
