import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** 라디오 옵션 목록 */
  options: RadioOption[];
  /** 선택된 값 */
  value?: string;
  /** 변경 핸들러 */
  onChange?: (value: string) => void;
  /** 배치 방향 */
  direction?: "horizontal" | "vertical";
  /** 전체 비활성화 */
  disabled?: boolean;
  /** 그룹 접근성 레이블 */
  "aria-label"?: string;
  /** 추가 클래스 */
  className?: string;
  /** 그룹 이름 (같은 name 공유) */
  name?: string;
}

export default function RadioGroup({
  options,
  value,
  onChange,
  direction = "vertical",
  disabled = false,
  "aria-label": ariaLabel,
  className,
  name: propName,
}: RadioGroupProps) {
  const generatedName = useId();
  const name = propName ?? generatedName;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex",
        direction === "horizontal" ? "flex-row flex-wrap gap-md" : "flex-col gap-sm",
        className
      )}
    >
      {options.map((option) => {
        const isDisabled = disabled || option.disabled;
        const isSelected = value === option.value;
        const optionId = `${name}-${option.value}`;

        return (
          <label
            key={option.value}
            htmlFor={optionId}
            className={cn(
              "inline-flex items-start gap-sm select-none",
              isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <div className="relative flex items-center justify-center mt-[2px]">
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => !isDisabled && onChange?.(option.value)}
                className="sr-only"
              />
              <div
                aria-hidden="true"
                className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150",
                  "ring-offset-1 focus-within:ring-2 focus-within:ring-primary/30",
                  isSelected
                    ? "border-primary"
                    : "border-line hover:border-primary/50"
                )}
              >
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[13px] text-content font-medium leading-[1.4]">
                {option.label}
              </span>
              {option.description && (
                <span className="text-[11px] text-content-tertiary mt-[2px]">
                  {option.description}
                </span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
