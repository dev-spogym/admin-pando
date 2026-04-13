import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
}

const SIDE_STYLES: Record<NonNullable<PopoverProps["side"]>, string> = {
  top: "bottom-full mb-2",
  bottom: "top-full mt-2",
  left: "right-full mr-2 top-0",
  right: "left-full ml-2 top-0",
};

const ALIGN_STYLES: Record<NonNullable<PopoverProps["align"]>, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

export default function Popover({
  trigger,
  content,
  side = "bottom",
  align = "start",
  className,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, close]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <div onClick={toggle} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            "absolute z-50 min-w-[180px]",
            SIDE_STYLES[side],
            ALIGN_STYLES[align],
            "bg-surface border border-line rounded-xl shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            className
          )}
          role="dialog"
        >
          {content}
        </div>
      )}
    </div>
  );
}
