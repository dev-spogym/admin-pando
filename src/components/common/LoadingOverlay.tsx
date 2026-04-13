import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingOverlay({
  isLoading,
  message,
  fullScreen = false,
  className,
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message ?? "로딩 중"}
      className={cn(
        "flex flex-col items-center justify-center gap-sm",
        "bg-surface/80 backdrop-blur-sm z-50",
        fullScreen ? "fixed inset-0" : "absolute inset-0 rounded-xl",
        className
      )}
    >
      <Loader2 size={28} className="animate-spin text-primary" />
      {message && (
        <span className="text-Label text-content-secondary">{message}</span>
      )}
    </div>
  );
}
