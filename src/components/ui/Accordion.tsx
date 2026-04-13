import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

function AccordionPanel({ item }: { item: AccordionItem }) {
  const [open, setOpen] = useState(item.defaultOpen ?? false);

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-md py-sm bg-surface hover:bg-surface-secondary transition-colors duration-150 text-left"
      >
        <span className="text-Body-Primary-KR text-content font-medium">{item.title}</span>
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
          open ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
        role="region"
      >
        <div className="px-md py-sm border-t border-line bg-surface text-Body-Secondary-KR text-content-secondary">
          {item.content}
        </div>
      </div>
    </div>
  );
}

export default function Accordion({ items, className }: AccordionProps) {
  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      {items.map((item, i) => (
        <AccordionPanel key={i} item={item} />
      ))}
    </div>
  );
}
