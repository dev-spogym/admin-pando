import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DetailSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function DetailSection({
  title,
  defaultOpen = true,
  children,
  className,
}: DetailSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("bg-surface border border-line rounded-xl overflow-hidden", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-md py-sm hover:bg-surface-secondary transition-colors duration-150"
      >
        <span className="text-Body-Primary-KR text-content font-semibold">{title}</span>
        <ChevronDown
          size={16}
          className={cn(
            "text-content-secondary shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-line px-md py-md">{children}</div>
      </div>
    </div>
  );
}
