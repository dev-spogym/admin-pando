import React, { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface HoverCardProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const CONTENT_POSITION: Record<NonNullable<HoverCardProps["side"]>, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export default function HoverCard({
  trigger,
  content,
  side = "bottom",
  className,
}: HoverCardProps) {
  const [visible, setVisible] = useState(false);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    enterTimer.current = setTimeout(() => setVisible(true), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    leaveTimer.current = setTimeout(() => setVisible(false), 100);
  }, []);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {trigger}
      <div
        className={cn(
          "absolute z-50 pointer-events-none min-w-[180px]",
          CONTENT_POSITION[side],
          "transition-all duration-150",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        )}
      >
        <div
          className={cn(
            "bg-surface border border-line rounded-xl shadow-lg p-md",
            "text-Body-Secondary-KR text-content",
            className
          )}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
