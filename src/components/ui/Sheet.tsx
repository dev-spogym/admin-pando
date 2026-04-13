import React, { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SheetSide = "left" | "right";
export type SheetSize = "sm" | "md" | "lg" | "xl";

export interface SheetProps {
  /** 열림 여부 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 슬라이드 방향 */
  side?: SheetSide;
  /** 패널 너비 */
  size?: SheetSize;
  /** 헤더 제목 */
  title?: string;
  /** 본문 콘텐츠 */
  children?: React.ReactNode;
  /** 배경 딤 오버레이 */
  overlay?: boolean;
  /** 추가 클래스 */
  className?: string;
}

const SIZE_STYLES: Record<SheetSize, string> = {
  sm: "w-[320px]",
  md: "w-[480px]",
  lg: "w-[640px]",
  xl: "w-[800px]",
};

const TRANSLATE_HIDDEN: Record<SheetSide, string> = {
  right: "translate-x-full",
  left: "-translate-x-full",
};

const POSITION_STYLES: Record<SheetSide, string> = {
  right: "right-0",
  left: "left-0",
};

export default function Sheet({
  isOpen,
  onClose,
  side = "right",
  size = "md",
  title,
  children,
  overlay = true,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  return (
    <>
      {/* 오버레이 */}
      {overlay && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-content/40 backdrop-blur-sm transition-opacity duration-300",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 패널 */}
      <div
        ref={panelRef}
        className={cn(
          "fixed top-0 z-50 flex h-full flex-col bg-surface shadow-card-deep",
          "transition-transform duration-300 ease-in-out",
          SIZE_STYLES[size],
          POSITION_STYLES[side],
          isOpen ? "translate-x-0" : TRANSLATE_HIDDEN[side],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "sheet-title" : undefined}
      >
        {/* 헤더 */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-6 py-4">
          {title && (
            <h2 id="sheet-title" className="text-base font-semibold text-content">
              {title}
            </h2>
          )}
          {!title && <span />}
          <button
            onClick={onClose}
            className="rounded-button p-1.5 text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </>
  );
}
