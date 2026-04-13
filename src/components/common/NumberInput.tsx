import React, { useId } from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NumberInputProps {
  /** 현재 값 */
  value: number;
  /** 값 변경 핸들러 */
  onChange: (value: number) => void;
  /** 최솟값 */
  min?: number;
  /** 최댓값 */
  max?: number;
  /** 증감 단위 */
  step?: number;
  /** 앞에 붙는 기호 (예: ₩) */
  prefix?: string;
  /** 뒤에 붙는 단위 (예: 원, %, 일) */
  suffix?: string;
  /** 레이블 텍스트 */
  label?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 에러 메시지 */
  error?: string;
  /** 추가 클래스 */
  className?: string;
}

// 천단위 콤마 포맷
function formatWithComma(val: number): string {
  return val.toLocaleString("ko-KR");
}

// 콤마 제거 후 숫자 파싱
function parseCommaString(str: string): number {
  const cleaned = str.replace(/,/g, "");
  const parsed = Number(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export default function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  label,
  disabled = false,
  error,
  className,
}: NumberInputProps) {
  const id = useId();

  // prefix가 ₩이면 천단위 콤마 자동 포맷
  const useComma = prefix === "₩";

  // 표시 값: 콤마 포맷 또는 숫자 그대로
  const displayValue = useComma ? formatWithComma(value) : String(value);

  // 범위 적용 후 onChange 호출
  const clamp = (val: number): number => {
    let result = val;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  };

  const handleDecrease = () => {
    if (disabled) return;
    onChange(clamp(value - step));
  };

  const handleIncrease = () => {
    if (disabled) return;
    onChange(clamp(value + step));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = useComma ? parseCommaString(e.target.value) : Number(e.target.value);
    if (!isNaN(raw)) onChange(clamp(raw));
  };

  const isDecreaseDisabled = disabled || (min !== undefined && value <= min);
  const isIncreaseDisabled = disabled || (max !== undefined && value >= max);

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      {/* 레이블 */}
      {label && (
        <label htmlFor={id} className="text-Label font-medium text-content">
          {label}
        </label>
      )}

      {/* 입력 영역 */}
      <div
        className={cn(
          "flex items-center overflow-hidden rounded-input border bg-surface-secondary transition-all",
          "focus-within:ring-2 focus-within:ring-0/20",
          error ? "border-error" : "border-line",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* - 버튼 */}
        <button
          type="button"
          onClick={handleDecrease}
          disabled={isDecreaseDisabled}
          className={cn(
            "flex h-full items-center justify-center border-r border-line px-sm py-sm text-content-secondary transition-colors",
            "hover:bg-surface-secondary hover:text-content",
            isDecreaseDisabled && "cursor-not-allowed opacity-40"
          )}
          aria-label="감소"
        >
          <Minus size={14} />
        </button>

        {/* prefix */}
        {prefix && (
          <span className="pl-sm text-Body-Primary-KR text-content-secondary flex-shrink-0 select-none">
            {prefix}
          </span>
        )}

        {/* 숫자 입력 */}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleInputChange}
          disabled={disabled}
          className={cn(
            "min-w-0 flex-1 bg-transparent px-sm py-sm text-Body-Primary-KR text-content",
            "text-center focus:outline-none",
            disabled && "cursor-not-allowed"
          )}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />

        {/* suffix */}
        {suffix && (
          <span className="pr-sm text-Body-Primary-KR text-content-secondary flex-shrink-0 select-none">
            {suffix}
          </span>
        )}

        {/* + 버튼 */}
        <button
          type="button"
          onClick={handleIncrease}
          disabled={isIncreaseDisabled}
          className={cn(
            "flex h-full items-center justify-center border-l border-line px-sm py-sm text-content-secondary transition-colors",
            "hover:bg-surface-secondary hover:text-content",
            isIncreaseDisabled && "cursor-not-allowed opacity-40"
          )}
          aria-label="증가"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="text-[11px] font-medium text-state-error">{error}</p>
      )}
    </div>
  );
}
