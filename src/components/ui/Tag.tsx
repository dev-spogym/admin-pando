import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TagVariant = "default" | "primary" | "success" | "warning" | "error";
export type TagSize = "sm" | "md";

export interface TagProps {
  /** 태그 라벨 */
  label: string;
  /** 색상 변형 */
  variant?: TagVariant;
  /** 제거 버튼 표시 */
  removable?: boolean;
  /** 제거 콜백 */
  onRemove?: () => void;
  /** 크기 */
  size?: TagSize;
  /** 왼쪽 아이콘 */
  icon?: React.ReactNode;
  /** 클릭 핸들러 */
  onClick?: () => void;
  /** 추가 클래스 */
  className?: string;
}

const VARIANT_STYLES: Record<TagVariant, string> = {
  default: "bg-gray-100 text-gray-700 border border-gray-200",
  primary: "bg-primary/10 text-primary border border-primary/20",
  success: "bg-green-100 text-green-700 border border-green-200",
  warning: "bg-amber-100 text-amber-700 border border-amber-200",
  error: "bg-red-100 text-red-700 border border-red-200",
};

const SIZE_STYLES: Record<TagSize, string> = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
};

export default function Tag({
  label,
  variant = "default",
  removable = false,
  onRemove,
  size = "md",
  icon,
  onClick,
  className,
}: TagProps) {
  const isClickable = typeof onClick === "function";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        isClickable && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {/* 왼쪽 아이콘 */}
      {icon && <span className="flex-shrink-0">{icon}</span>}

      {label}

      {/* 제거 버튼 */}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="flex-shrink-0 rounded-full hover:bg-black/10 transition-colors ml-0.5"
          aria-label={`${label} 제거`}
        >
          <X size={size === "sm" ? 10 : 12} />
        </button>
      )}
    </span>
  );
}
