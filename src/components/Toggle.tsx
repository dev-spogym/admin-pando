import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps {
  /** 토글 ON/OFF 상태 */
  checked: boolean;
  /** 상태 변경 핸들러 */
  onChange: (checked: boolean) => void;
  /** 레이블 텍스트 */
  label?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 토글 크기 */
  size?: "sm" | "md";
}

// 트랙(배경) 크기
const TRACK_SIZE: Record<NonNullable<ToggleProps["size"]>, string> = {
  sm: "h-5 w-9",
  md: "h-6 w-11",
};

// 썸(원형 버튼) 크기
const THUMB_SIZE: Record<NonNullable<ToggleProps["size"]>, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

// ON 상태 시 썸 이동 거리
const THUMB_TRANSLATE: Record<NonNullable<ToggleProps["size"]>, string> = {
  sm: "translate-x-4",
  md: "translate-x-5",
};

// 썸 초기 위치
const THUMB_OFFSET: Record<NonNullable<ToggleProps["size"]>, string> = {
  sm: "left-[3px] top-[3px]",
  md: "left-[4px] top-[4px]",
};

export default function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = "md",
}: ToggleProps) {
  const id = useId();

  const handleClick = () => {
    if (!disabled) onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!disabled) onChange(!checked);
    }
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex items-center gap-sm select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
    >
      {/* 트랙 */}
      <div
        id={id}
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-0/30",
          TRACK_SIZE[size],
          checked ? "bg-0" : "bg-7"
        )}
      >
        {/* 썸 */}
        <span
          className={cn(
            "absolute rounded-full bg-white shadow-sm transition-transform duration-200",
            THUMB_SIZE[size],
            THUMB_OFFSET[size],
            checked ? THUMB_TRANSLATE[size] : "translate-x-0"
          )}
        />
      </div>

      {/* 레이블 */}
      {label && (
        <span className="text-Body-Primary-KR text-4">{label}</span>
      )}
    </label>
  );
}
