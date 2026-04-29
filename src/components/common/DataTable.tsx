import React from "react";
import {
  ChevronUp,
  ChevronDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: React.ReactNode;
  width?: number | string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  selectable?: boolean;
  selectedRows?: Set<number>;
  onSelectRows?: (selected: Set<number>) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    pageSizeOptions?: number[];
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortConfig?: { key: string; direction: "asc" | "desc" };
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  onDownloadExcel?: () => void;
  title?: string;
  onSearch?: (value: string) => void;
  searchValue?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: T, index: number) => void;
}

export default function DataTable<T extends Record<string, any>>({
  columns = [],
  data = [],
  loading = false,
  selectable = false,
  selectedRows = new Set(),
  onSelectRows,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSort,
  sortConfig,
  emptyMessage = "조회된 데이터가 없습니다.",
  emptyAction,
  onDownloadExcel,
  title,
  onSearch,
  searchValue = "",
  searchPlaceholder = "검색어를 입력하세요...",
  onRowClick,
}: DataTableProps<T>) {
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectRows?.(new Set(data.map((_, idx) => idx)));
    } else {
      onSelectRows?.(new Set());
    }
  };

  const toggleSelectRow = (idx: number) => {
    const next = new Set(selectedRows);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    onSelectRows?.(next);
  };

  const handleSort = (key: string) => {
    if (!onSort) return;
    const direction = sortConfig?.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    onSort(key, direction);
  };

  if (loading) {
    return (
      <div className="w-full overflow-hidden rounded-[24px] border border-line/70 bg-white/82 shadow-card backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-line/70 px-lg py-md">
          <div className="h-5 w-[120px] bg-surface-tertiary animate-pulse rounded-md" />
          <div className="h-8 w-[100px] bg-surface-tertiary animate-pulse rounded-md" />
        </div>
        <table className="w-full">
          <thead className="bg-surface-secondary/80">
            <tr>
              {selectable && <th className="w-10 px-3 py-2.5"><div className="h-4 w-4 bg-line rounded mx-auto" /></th>}
              {columns.map((_, i) => <th className="px-3 py-2.5" key={i}><div className="h-3 w-20 bg-line rounded" /></th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {selectable && <td className="px-3 py-2.5"><div className="h-4 w-4 bg-surface-tertiary rounded mx-auto" /></td>}
                {columns.map((_, j) => <td className="px-3 py-2.5" key={j}><div className="h-3 w-full bg-surface-tertiary rounded" /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const isAllSelected = data.length > 0 && selectedRows.size === data.length;

  return (
    <div className="w-full overflow-hidden rounded-[24px] border border-line/70 bg-white/82 shadow-card backdrop-blur-xl">
      {(title || onDownloadExcel || onSearch) && (
        <div className="flex flex-col items-start justify-between gap-md border-b border-line/70 px-lg py-md lg:flex-row lg:items-center">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-md w-full lg:w-auto">
            {title && <h2 className="text-Section-Title text-content">{title}</h2>}
            {onSearch && (
              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
                <input
                  className="app-control w-full rounded-2xl pl-8 pr-3 py-[8px] text-[13px] text-content placeholder-content-tertiary transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-sm ml-auto">
            {onDownloadExcel && (
              <button
                className="flex items-center gap-[6px] rounded-2xl border border-line/80 bg-white/72 px-3 py-[8px] text-[13px] font-semibold text-content-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-colors hover:border-primary/30 hover:bg-white"
                onClick={onDownloadExcel}
              >
                <Download size={14} /> Excel
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-surface-secondary/85">
            <tr>
              {selectable && (
                <th className="sticky left-0 z-20 w-10 bg-surface-secondary/85 px-3 py-3 text-center">
                  <input
                    className="w-3.5 h-3.5 rounded border-line text-primary focus:ring-0 cursor-pointer accent-primary"
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((col, colIdx) => {
                const isFirstDataCol = colIdx === 0;
                const stickyLeft = selectable ? "left-10" : "left-0";
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-content-secondary whitespace-nowrap",
                      col.sortable && "cursor-pointer hover:text-content focus:outline-none focus:ring-2 focus:ring-primary/30",
                      col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left",
                      isFirstDataCol && [
                        "sticky z-20 bg-surface-secondary/85",
                        stickyLeft,
                        "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-line",
                        "md:static md:z-auto md:after:hidden",
                      ]
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => col.sortable && handleSort(col.key)}
                    role={col.sortable ? "button" : undefined}
                    tabIndex={col.sortable ? 0 : undefined}
                    aria-sort={col.sortable ? (sortConfig?.key === col.key ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none") : undefined}
                    onKeyDown={col.sortable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort(col.key); } } : undefined}
                  >
                    <div className={cn("flex items-center gap-1", col.align === "center" ? "justify-center" : col.align === "right" ? "justify-end" : "justify-start")}>
                      {col.header}
                      {col.sortable && (
                        <div className="flex flex-col -space-y-[3px]">
                          <ChevronUp className={cn(sortConfig?.key === col.key && sortConfig.direction === "asc" ? "text-primary" : "text-line")} size={11} />
                          <ChevronDown className={cn(sortConfig?.key === col.key && sortConfig.direction === "desc" ? "text-primary" : "text-line")} size={11} />
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {data.length === 0 ? (
              <tr>
                <td className="px-lg py-[72px] text-center" colSpan={columns.length + (selectable ? 1 : 0)}>
                  <div className="flex flex-col items-center justify-center gap-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-secondary text-content-tertiary">
                      <Search className="text-line" size={28} />
                    </div>
                    <p className="text-[13px] font-medium text-content-secondary">{emptyMessage}</p>
                    {emptyAction && (
                      <button
                        className="rounded-2xl border border-primary/15 bg-primary-light px-3 py-2 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10"
                        onClick={emptyAction.onClick}
                      >
                        + {emptyAction.label}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "transition-colors",
                    selectedRows.has(idx) ? "bg-primary-light/40" : "hover:bg-surface-secondary/70",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
                >
                  {selectable && (
                    <td className="sticky left-0 z-10 bg-[inherit] px-3 py-3 text-center">
                      <input
                        className="w-3.5 h-3.5 rounded border-line text-primary focus:ring-0 cursor-pointer accent-primary"
                        type="checkbox"
                        checked={selectedRows.has(idx)}
                        onChange={() => toggleSelectRow(idx)}
                      />
                    </td>
                  )}
                  {columns.map((col, colIdx) => {
                    const isFirstDataCol = colIdx === 0;
                    const stickyLeft = selectable ? "left-10" : "left-0";
                    const rowBg = selectedRows.has(idx) ? "bg-primary-light/40" : "bg-surface";
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-3 text-[13px] text-content tabular-nums align-middle",
                          col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left",
                          isFirstDataCol && [
                            "sticky z-10",
                            stickyLeft,
                            rowBg,
                            "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-line",
                            "md:static md:z-auto md:after:hidden",
                          ]
                        )}
                      >
                        {col.render ? col.render(row[col.key], row, idx) : row[col.key]}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex flex-col items-center justify-between gap-md border-t border-line/70 bg-white/72 px-lg py-md md:flex-row">
          <div className="flex items-center gap-lg">
            <p className="text-[12px] text-content-secondary">
              총 <span className="text-content font-semibold">{pagination.total}</span>건 중{" "}
              <span className="text-content font-semibold">
                {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.total)}
              </span>
            </p>
            {onPageSizeChange && (
              <select
                className="app-control rounded-xl px-2 py-1 text-[12px] text-content outline-none cursor-pointer focus:border-primary"
                value={pagination.pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {(pagination.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
                  <option key={size} value={size}>{size}개</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-[4px]">
            <button
              className="rounded-xl border border-line/80 p-1.5 text-content-secondary transition-colors hover:bg-white hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.pageSize)) }).map((_, i) => {
              const totalPages = Math.ceil(pagination.total / pagination.pageSize);
              let pageNum = i + 1;
              if (pagination.page > 3 && totalPages > 5) {
                pageNum = pagination.page - 2 + i;
                if (pageNum + (4 - i) > totalPages) pageNum = totalPages - 4 + i;
              }
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  className={cn(
                    "flex h-[32px] min-w-[32px] items-center justify-center rounded-xl text-[12px] font-semibold transition-colors",
                    pagination.page === pageNum
                      ? "bg-primary text-white"
                      : "text-content-secondary hover:bg-white"
                  )}
                  onClick={() => onPageChange?.(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="rounded-xl border border-line/80 p-1.5 text-content-secondary transition-colors hover:bg-white hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page === Math.ceil(pagination.total / pagination.pageSize)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
