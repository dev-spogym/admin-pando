import React from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  /** 툴팁에 표시할 내용 */
  content: string;
  /** 툴팁 표시 방향 */
  position?: "top" | "bottom" | "left" | "right";
  /** 툴팁을 트리거할 자식 요소 */
  children: React.ReactNode;
  /** 추가 클래스 */
  className?: string;
}

// 방향별 툴팁 위치 클래스
const POSITION_STYLES: Record<NonNullable<TooltipProps["position"]>, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

// 방향별 화살표 클래스
const ARROW_STYLES: Record<NonNullable<TooltipProps["position"]>, string> = {
  top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-4",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-4",
  left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-4",
  right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-4",
};

/**
 * Tooltip - hover 시 content를 지정된 방향으로 표시하는 CSS-only 컴포넌트.
 * JS 상태 없이 group/peer Tailwind 유틸리티로 구현합니다.
 */
export default function Tooltip({
  content,
  position = "top",
  children,
  className,
}: TooltipProps) {
  return (
    <span className={cn("group relative inline-flex items-center", className)}>
      {children}

      {/* 툴팁 말풍선 */}
      <span
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-1 bg-4 px-sm py-xs",
          "text-[11px] font-medium text-white shadow-0",
          "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
          POSITION_STYLES[position]
        )}
        role="tooltip"
      >
        {content}

        {/* 화살표 */}
        <span
          className={cn(
            "absolute h-0 w-0 border-4 border-solid border-4",
            // 화살표 색상은 방향에 맞게 조정
            position === "top" && "top-full left-1/2 -translate-x-1/2 border-x-transparent border-b-transparent border-t-4 border-t-content",
            position === "bottom" && "bottom-full left-1/2 -translate-x-1/2 border-x-transparent border-t-transparent border-b-4 border-b-content",
            position === "left" && "left-full top-1/2 -translate-y-1/2 border-y-transparent border-r-transparent border-l-4 border-l-content",
            position === "right" && "right-full top-1/2 -translate-y-1/2 border-y-transparent border-l-transparent border-r-4 border-r-content"
          )}
        />
      </span>
    </span>
  );
}
