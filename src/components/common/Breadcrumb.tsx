import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  /** 경로 항목 배열 */
  items: BreadcrumbItem[];
  /** 구분자 */
  separator?: "/" | ">" | "chevron";
  /** 추가 클래스 */
  className?: string;
}

export default function Breadcrumb({
  items,
  separator = "chevron",
  className,
}: BreadcrumbProps) {
  const SeparatorNode =
    separator === "chevron" ? (
      <ChevronRight size={14} className="text-content-secondary flex-shrink-0" />
    ) : (
      <span className="text-content-secondary text-sm select-none">{separator}</span>
    );

  return (
    <nav aria-label="breadcrumb">
      <ol className={cn("flex items-center gap-1 flex-wrap", className)}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              <li>
                {isLast ? (
                  /* 현재 페이지 - 비링크, bold */
                  <span
                    className="text-sm font-semibold text-content"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : item.href ? (
                  <a
                    href={item.href}
                    className="text-sm text-content-secondary hover:text-content transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <button
                    onClick={item.onClick}
                    className="text-sm text-content-secondary hover:text-content transition-colors"
                  >
                    {item.label}
                  </button>
                )}
              </li>

              {/* 구분자 (마지막 항목 뒤에는 표시 안 함) */}
              {!isLast && (
                <li aria-hidden="true" className="flex items-center">
                  {SeparatorNode}
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
