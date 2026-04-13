import React, { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  /** 모달 열림 여부 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 모달 제목 */
  title?: string;
  /** 모달 너비 */
  size?: "sm" | "md" | "lg" | "xl";
  /** 모달 본문 콘텐츠 */
  children?: React.ReactNode;
  /** 하단 푸터 영역 */
  footer?: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기 + 포커스 트랩 (Tab 키 모달 내부 순환)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    // 모달 열릴 때 body 스크롤 잠금
    document.body.style.overflow = "hidden";
    // 모달 패널에 포커스 이동
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // 백드롭 클릭 시 닫기 (패널 내부 클릭은 무시)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-content/50 backdrop-blur-sm p-md animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative w-full rounded-modal bg-surface shadow-card-deep outline-none",
          "animate-in fade-in zoom-in-95 duration-200",
          SIZE_CLASSES[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {/* 헤더 */}
        {title && (
          <div className="flex items-center justify-between border-b border-line px-xl py-lg">
            <h2
              id="modal-title"
              className="text-Section-Title text-content font-semibold leading-[1.4]"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="ml-md rounded-button p-xs text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* 제목 없을 때 닫기 버튼만 표시 */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute right-md top-md rounded-button p-xs text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        )}

        {/* 본문 */}
        <div className="px-xl py-lg text-Body-Primary-KR text-content">{children}</div>

        {/* 푸터 */}
        {footer && (
          <div className="border-t border-line px-xl py-lg">{footer}</div>
        )}
      </div>
    </div>
  );
}
