import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 레이블 텍스트 */
  label?: string;
  /** 에러 메시지 */
  error?: string;
  /** 힌트 텍스트 */
  hint?: string;
  /** 기본 행 수 */
  rows?: number;
  /** 최대 글자 수 (카운터 표시) */
  maxLength?: number;
  /** 리사이즈 옵션 */
  resize?: "none" | "vertical";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      rows = 3,
      maxLength,
      resize = "none",
      disabled,
      value,
      defaultValue,
      className,
      id: propId,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = propId ?? generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const [internalValue, setInternalValue] = React.useState(
      defaultValue?.toString() ?? ""
    );

    const currentValue = value !== undefined ? value.toString() : internalValue;
    const charCount = currentValue.length;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (value === undefined) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };

    const describedBy = [
      error ? errorId : null,
      hint && !error ? hintId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className="flex flex-col gap-xs w-full">
        {label && (
          <label
            htmlFor={id}
            className="text-[12px] font-medium text-content-secondary"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          value={value}
          defaultValue={value !== undefined ? undefined : defaultValue}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onChange={handleChange}
          className={cn(
            "app-control w-full rounded-2xl px-md py-sm text-[13px] text-content border transition-all duration-150 outline-none",
            resize === "none" ? "resize-none" : "resize-y",
            error
              ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/15"
              : "border-line/80 focus:border-primary focus:ring-2 focus:ring-primary/10",
            disabled && "cursor-not-allowed opacity-50 bg-surface-tertiary",
            className
          )}
          {...props}
        />

        <div className="flex items-start justify-between gap-sm">
          <div className="flex-1">
            {error && (
              <p id={errorId} role="alert" className="text-[11px] text-red-500">
                {error}
              </p>
            )}
            {hint && !error && (
              <p id={hintId} className="text-[11px] text-content-tertiary">
                {hint}
              </p>
            )}
          </div>
          {maxLength !== undefined && (
            <span
              className={cn(
                "text-[11px] shrink-0",
                charCount >= maxLength
                  ? "text-red-500"
                  : "text-content-tertiary"
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
