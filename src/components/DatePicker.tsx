import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  /** 선택된 날짜 (YYYY-MM-DD) */
  value: string;
  /** 날짜 변경 핸들러 */
  onChange: (value: string) => void;
  /** 레이블 텍스트 */
  label?: string;
  /** 최소 날짜 (YYYY-MM-DD) */
  minDate?: string;
  /** 최대 날짜 (YYYY-MM-DD) */
  maxDate?: string;
  /** placeholder 텍스트 */
  placeholder?: string;
  /** 에러 메시지 */
  error?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 추가 클래스 */
  className?: string;
}

export default function DatePicker({
  value,
  onChange,
  label,
  minDate,
  maxDate,
  placeholder = "날짜 선택",
  error,
  disabled = false,
  className,
}: DatePickerProps) {
  const id = useId();

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      {/* 레이블 */}
      {label && (
        <label
          htmlFor={id}
          className="text-Label font-medium text-4"
        >
          {label}
        </label>
      )}

      {/* 날짜 입력 */}
      <input
        id={id}
        type="date"
        value={value}
        min={minDate}
        max={maxDate}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-input border bg-9 px-md py-sm",
          "text-Body-Primary-KR text-4 transition-all",
          "focus:outline-none focus:ring-2 focus:ring-0/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // 빈 값일 때 placeholder 색상
          !value && "text-5",
          error
            ? "border-error focus:ring-error/20"
            : "border-7 hover:border-5"
        )}
      />

      {/* 에러 메시지 */}
      {error && (
        <p className="text-[11px] font-medium text-error">{error}</p>
      )}
    </div>
  );
}
