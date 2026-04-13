import React from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "default" | "bordered" | "elevated";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  /** 카드 변형 */
  variant?: CardVariant;
  /** 내부 패딩 */
  padding?: CardPadding;
  /** 카드 헤더 */
  header?: React.ReactNode;
  /** 카드 푸터 */
  footer?: React.ReactNode;
  /** 클릭 핸들러 (hover 효과 자동 적용) */
  onClick?: () => void;
  /** 추가 클래스 */
  className?: string;
  /** 본문 콘텐츠 */
  children?: React.ReactNode;
}

const VARIANT_STYLES: Record<CardVariant, string> = {
  default: "bg-surface border border-line",
  bordered: "bg-surface border-2 border-line",
  elevated: "bg-surface border border-line shadow-card-deep",
};

const PADDING_STYLES: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export default function Card({
  variant = "default",
  padding = "md",
  header,
  footer,
  onClick,
  className,
  children,
}: CardProps) {
  const isClickable = typeof onClick === "function";

  return (
    <div
      className={cn(
        "rounded-xl",
        VARIANT_STYLES[variant],
        isClickable && "cursor-pointer transition-shadow hover:shadow-card-deep hover:border-primary/30",
        className
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {/* 헤더 */}
      {header && (
        <div className={cn("border-b border-line", padding !== "none" ? PADDING_STYLES[padding] : "p-5")}>
          {header}
        </div>
      )}

      {/* 본문 */}
      <div className={PADDING_STYLES[padding]}>{children}</div>

      {/* 푸터 */}
      {footer && (
        <div className={cn("border-t border-line", padding !== "none" ? PADDING_STYLES[padding] : "p-5")}>
          {footer}
        </div>
      )}
    </div>
  );
}
