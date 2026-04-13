import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** 이 항목 위에 구분선 추가 */
  divider?: boolean;
}

export interface DropdownProps {
  /** 드롭다운을 여는 트리거 */
  trigger: React.ReactNode;
  /** 메뉴 항목 */
  items: DropdownItem[];
  /** 정렬 방향 */
  align?: "left" | "right";
  /** 추가 클래스 */
  className?: string;
}

export default function Dropdown({ trigger, items, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {/* 트리거 */}
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>

      {/* 메뉴 */}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 min-w-[160px] rounded-xl border border-line bg-surface shadow-card-deep",
            "animate-in fade-in zoom-in-95 duration-150",
            align === "right" ? "right-0" : "left-0"
          )}
          role="menu"
        >
          <div className="py-1">
            {items.map((item, index) => (
              <React.Fragment key={index}>
                {/* 구분선 */}
                {item.divider && <div className="my-1 border-t border-line" />}

                <button
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors text-left",
                    item.danger
                      ? "text-red-600 hover:bg-red-50"
                      : "text-content hover:bg-surface-secondary",
                    item.disabled && "cursor-not-allowed opacity-40 pointer-events-none"
                  )}
                  disabled={item.disabled}
                  role="menuitem"
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick();
                      setOpen(false);
                    }
                  }}
                >
                  {item.icon && (
                    <span className="flex-shrink-0 opacity-70">{item.icon}</span>
                  )}
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
