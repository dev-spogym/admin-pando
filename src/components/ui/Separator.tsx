import React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export default function Separator({
  orientation = "horizontal",
  className,
}: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "horizontal"
          ? "h-px w-full bg-line"
          : "w-px h-full bg-line self-stretch",
        className
      )}
    />
  );
}
