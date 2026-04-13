import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

export interface ContextMenuProps {
  trigger: React.ReactNode;
  items: ContextMenuItem[];
  className?: string;
}

export default function ContextMenu({ trigger, items, className }: ContextMenuProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  const close = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    const handleClick = () => close();
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [pos, close]);

  return (
    <>
      <div onContextMenu={handleContextMenu} className="inline-block">
        {trigger}
      </div>

      {pos && (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            "fixed z-[9999] min-w-[160px] bg-surface border border-line rounded-xl shadow-lg py-xs",
            "animate-in fade-in-0 zoom-in-95 duration-100",
            className
          )}
          style={{ left: pos.x, top: pos.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {item.divider && i > 0 && (
                <div className="h-px bg-line my-xs mx-xs" />
              )}
              <button
                role="menuitem"
                type="button"
                onClick={() => { item.onClick(); close(); }}
                className={cn(
                  "w-full flex items-center gap-sm px-md py-xs text-left text-Body-Secondary-KR",
                  "hover:bg-surface-secondary transition-colors duration-100 rounded-lg mx-xs",
                  item.danger ? "text-red-500" : "text-content"
                )}
                style={{ width: "calc(100% - 8px)" }}
              >
                {item.icon && (
                  <span className="shrink-0 text-content-secondary">{item.icon}</span>
                )}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );
}
