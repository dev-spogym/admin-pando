import React, { useId } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  /** 체크 상태 */
  checked?: boolean;
  /** 상태 변경 핸들러 */
  onChange?: (checked: boolean) => void;
  /** 레이블 텍스트 */
  label?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 부분 선택 상태 (전체 선택용) */
  indeterminate?: boolean;
  /** 추가 클래스 */
  className?: string;
  /** 접근성 레이블 */
  "aria-label"?: string;
  /** ID */
  id?: string;
}

export default function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  indeterminate = false,
  className,
  "aria-label": ariaLabel,
  id: propId,
}: CheckboxProps) {
  const generatedId = useId();
  const id = propId ?? generatedId;

  const isChecked = indeterminate ? false : checked;
  const isActive = indeterminate || checked;

  const handleClick = () => {
    if (!disabled) onChange?.(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!disabled) onChange?.(!checked);
    }
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex items-center gap-sm select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
    >
      <div
        id={id}
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        aria-label={!label ? ariaLabel : undefined}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/30",
          isActive
            ? "bg-primary border-primary"
            : "bg-surface border-line hover:border-primary/50"
        )}
      >
        {indeterminate ? (
          <Minus size={10} strokeWidth={3} className="text-white" />
        ) : isChecked ? (
          <Check size={10} strokeWidth={3} className="text-white" />
        ) : null}
      </div>

      {label && (
        <span className="text-[13px] text-content">{label}</span>
      )}
    </label>
  );
}
