import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** 레이블 텍스트 */
  label?: string;
  /** 에러 메시지 */
  error?: string;
  /** 힌트 텍스트 */
  hint?: string;
  /** 왼쪽 아이콘 */
  leftIcon?: React.ReactNode;
  /** 오른쪽 아이콘 */
  rightIcon?: React.ReactNode;
  /** 입력 크기 */
  size?: "sm" | "md";
}

const SIZE_CLASSES: Record<NonNullable<InputProps["size"]>, string> = {
  sm: "h-9 text-[12px] px-sm",
  md: "h-[44px] text-[13px] px-md",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      size = "md",
      disabled,
      readOnly,
      className,
      id: propId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = propId ?? generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

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

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-sm flex items-center text-content-tertiary pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "w-full bg-surface-secondary rounded-lg text-content border transition-all duration-150 outline-none",
              SIZE_CLASSES[size],
              error
                ? "border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
                : "border-line focus:border-primary focus:ring-1 focus:ring-primary/20",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              (disabled || readOnly) && "cursor-not-allowed opacity-50 bg-surface-tertiary",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-sm flex items-center text-content-tertiary pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>

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
    );
  }
);

Input.displayName = "Input";

export default Input;
