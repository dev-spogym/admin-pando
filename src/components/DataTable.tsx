import React from "react";
import {
  ChevronUp,
  ChevronDown,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
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
  onDownloadExcel?: () => void;
  title?: string;
  onSearch?: (value: string) => void;
  searchValue?: string;
  searchPlaceholder?: string;
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
  onDownloadExcel,
  title,
  onSearch,
  searchValue = "",
  searchPlaceholder = "검색어를 입력하세요...",
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
      <div className="w-full bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-lg py-md border-b border-line flex justify-between items-center">
          <div className="h-5 w-[120px] bg-surface-tertiary animate-pulse rounded-md" />
          <div className="h-8 w-[100px] bg-surface-tertiary animate-pulse rounded-md" />
        </div>
        <table className="w-full">
          <thead className="bg-surface-secondary">
            <tr>
              {selectable && <th className="w-10 px-3 py-2.5"><div className="h-4 w-4 bg-line rounded mx-auto" /></th>}
              {columns.map((_, i) => <th className="px-3 py-2.5" key={i}><div className="h-3 w-20 bg-line rounded" /></th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-light">
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
    <div className="w-full bg-surface border border-line rounded-xl overflow-hidden">
      {(title || onDownloadExcel || onSearch) && (
        <div className="px-lg py-md border-b border-line flex flex-col lg:flex-row justify-between items-start lg:items-center gap-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-md w-full lg:w-auto">
            {title && <h2 className="text-Section-Title text-content">{title}</h2>}
            {onSearch && (
              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
                <input
                  className="w-full pl-8 pr-3 py-[6px] bg-surface-secondary border border-line rounded-lg text-[13px] text-content placeholder-content-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
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
                className="flex items-center gap-[6px] px-3 py-[6px] bg-surface text-content-secondary border border-line hover:bg-surface-tertiary transition-colors rounded-lg text-[13px] font-medium"
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
          <thead className="bg-surface-secondary">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2.5 text-center">
                  <input
                    className="w-3.5 h-3.5 rounded border-line text-primary focus:ring-0 cursor-pointer accent-primary"
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2.5 text-[11px] font-semibold text-content-secondary uppercase tracking-wider whitespace-nowrap",
                    col.sortable && "cursor-pointer hover:text-content",
                    col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
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
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-light">
            {data.length === 0 ? (
              <tr>
                <td className="px-lg py-xl text-center" colSpan={columns.length + (selectable ? 1 : 0)}>
                  <div className="flex flex-col items-center justify-center gap-sm">
                    <AlertCircle className="text-line" size={36} />
                    <p className="text-[14px] text-content-secondary">{emptyMessage}</p>
                    <p className="text-[12px] text-content-tertiary">조건을 변경하거나 필터를 초기화해보세요.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "transition-colors",
                    selectedRows.has(idx) ? "bg-primary-light/40" : "hover:bg-surface-secondary"
                  )}
                >
                  {selectable && (
                    <td className="px-3 py-2.5 text-center">
                      <input
                        className="w-3.5 h-3.5 rounded border-line text-primary focus:ring-0 cursor-pointer accent-primary"
                        type="checkbox"
                        checked={selectedRows.has(idx)}
                        onChange={() => toggleSelectRow(idx)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2.5 text-[13px] text-content tabular-nums",
                        col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"
                      )}
                    >
                      {col.render ? col.render(row[col.key], row, idx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-lg py-md border-t border-line bg-surface flex flex-col md:flex-row justify-between items-center gap-md">
          <div className="flex items-center gap-lg">
            <p className="text-[12px] text-content-secondary">
              총 <span className="text-content font-semibold">{pagination.total}</span>건 중{" "}
              <span className="text-content font-semibold">
                {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.total)}
              </span>
            </p>
            {onPageSizeChange && (
              <select
                className="bg-surface border border-line rounded-md px-2 py-1 text-[12px] text-content outline-none cursor-pointer focus:border-primary"
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
              className="p-1.5 rounded-md border border-line text-content-secondary hover:text-content hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    "min-w-[30px] h-[30px] flex items-center justify-center rounded-md text-[12px] font-medium transition-colors",
                    pagination.page === pageNum
                      ? "bg-primary text-white"
                      : "text-content-secondary hover:bg-surface-tertiary"
                  )}
                  onClick={() => onPageChange?.(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="p-1.5 rounded-md border border-line text-content-secondary hover:text-content hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
