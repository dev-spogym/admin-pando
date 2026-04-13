import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** 현재 페이지 (1-indexed) */
  currentPage: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 페이지 변경 콜백 */
  onPageChange: (page: number) => void;
  /** 첫 페이지 버튼 표시 */
  showFirst?: boolean;
  /** 마지막 페이지 버튼 표시 */
  showLast?: boolean;
  /** 현재 페이지 좌우 표시 수 */
  sibling?: number;
  /** 크기 */
  size?: "sm" | "md";
  /** "1-20 / 총 100건" 형태 정보 표시 */
  showInfo?: boolean;
  /** 전체 항목 수 (showInfo 사용 시) */
  totalItems?: number;
  /** 페이지당 항목 수 (showInfo 사용 시) */
  pageSize?: number;
  /** 추가 클래스 */
  className?: string;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirst = false,
  showLast = false,
  sibling = 1,
  size = "md",
  showInfo = false,
  totalItems,
  pageSize,
  className,
}: PaginationProps) {
  const btnBase = cn(
    "inline-flex items-center justify-center rounded border border-line font-medium text-content-secondary transition-colors",
    "hover:bg-surface-secondary hover:text-content disabled:cursor-not-allowed disabled:opacity-40",
    size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"
  );

  const btnActive = "bg-primary text-white border-primary hover:bg-primary hover:text-white";

  /** 표시할 페이지 번호 배열 (ellipsis는 null) */
  const pages = React.useMemo((): (number | null)[] => {
    const delta = sibling;
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);
    const result: (number | null)[] = [];

    if (left > 2) {
      result.push(1, null); // 1 + ellipsis
    } else {
      for (let i = 1; i < left; i++) result.push(i);
    }

    for (let i = left; i <= right; i++) result.push(i);

    if (right < totalPages - 1) {
      result.push(null, totalPages); // ellipsis + last
    } else {
      for (let i = right + 1; i <= totalPages; i++) result.push(i);
    }

    return result;
  }, [currentPage, totalPages, sibling]);

  /** showInfo 문자열 */
  const infoText = React.useMemo(() => {
    if (!showInfo) return null;
    if (totalItems !== undefined && pageSize !== undefined) {
      const start = (currentPage - 1) * pageSize + 1;
      const end = Math.min(currentPage * pageSize, totalItems);
      return `${start}-${end} / 총 ${totalItems.toLocaleString()}건`;
    }
    return `${currentPage} / ${totalPages}`;
  }, [showInfo, currentPage, totalPages, totalItems, pageSize]);

  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* 정보 텍스트 */}
      {infoText && (
        <span className={cn("text-content-secondary mr-2", size === "sm" ? "text-xs" : "text-sm")}>
          {infoText}
        </span>
      )}

      <div className="flex items-center gap-1">
        {/* 첫 페이지 */}
        {showFirst && (
          <button
            className={btnBase}
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="첫 페이지"
          >
            <ChevronsLeft size={size === "sm" ? 14 : 16} />
          </button>
        )}

        {/* 이전 페이지 */}
        <button
          className={btnBase}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="이전 페이지"
        >
          <ChevronLeft size={size === "sm" ? 14 : 16} />
        </button>

        {/* 페이지 번호 */}
        {pages.map((page, idx) =>
          page === null ? (
            <span
              key={`ellipsis-${idx}`}
              className={cn("inline-flex items-center justify-center text-content-secondary select-none",
                size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"
              )}
            >
              …
            </span>
          ) : (
            <button
              key={page}
              className={cn(btnBase, page === currentPage && btnActive)}
              onClick={() => onPageChange(page)}
              aria-label={`${page}페이지`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}

        {/* 다음 페이지 */}
        <button
          className={btnBase}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="다음 페이지"
        >
          <ChevronRight size={size === "sm" ? 14 : 16} />
        </button>

        {/* 마지막 페이지 */}
        {showLast && (
          <button
            className={btnBase}
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="마지막 페이지"
          >
            <ChevronsRight size={size === "sm" ? 14 : 16} />
          </button>
        )}
      </div>
    </div>
  );
}
