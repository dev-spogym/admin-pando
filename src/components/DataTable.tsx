import React from "react";
import {
  ChevronUp,
  ChevronDown,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
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

/**
 * DataTable Component
 */
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
      const allIdx = new Set(data.map((_, idx) => idx));
      onSelectRows?.(allIdx);
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
      <div className="w-full bg-3 rounded-card-normal border border-7 overflow-hidden shadow-card-soft" >
        <div className="px-6 py-4 border-b border-7 flex justify-between items-center" >
          <div className="h-6 w-[150px] bg-2 animate-pulse rounded-2" />
          <div className="h-9 w-[120px] bg-2 animate-pulse rounded-2" />
        </div>
        <div className="p-4" >
          <table className="w-full" >
            <thead className="bg-2" >
              <tr >
                {selectable && <th className="w-12 px-4 py-3" ><div className="h-4 w-4 bg-7 rounded mx-auto" /></th>}
                {columns.map((_, i) => <th className="px-4 py-3" key={i}><div className="h-4 w-24 bg-7 rounded" /></th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-7" >
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td className="px-4 py-3" ><div className="h-4 w-4 bg-2 rounded mx-auto" /></td>}
                  {columns.map((_, j) => <td className="px-4 py-3" key={j}><div className="h-4 w-full bg-2 rounded" /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const isAllSelected = data.length > 0 && selectedRows.size === data.length;

  return (
    <div className="w-full bg-3 border border-7 rounded-card-normal overflow-hidden shadow-card-soft" >
      {(title || onDownloadExcel || onSearch) && (
        <div className="px-6 py-4 border-b border-7 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4" >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto" >
            {title && <h2 className="text-Section-Title text-4" >{title}</h2>}
            {onSearch && (
              <div className="relative w-full sm:w-[300px]" >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-5" size={16}/>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-2 border border-8 rounded-2 text-sm text-4 placeholder-5 focus:outline-none focus:ring-2 focus:ring-0/20 focus:border-0 transition-all" type="text" placeholder={searchPlaceholder} value={searchValue} onChange={(e) => onSearch(e.target.value)}/>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto" >
            {onDownloadExcel && (
              <button
                className="flex items-center gap-2 px-4 py-2 bg-3 text-4 border border-8 hover:bg-2 transition-all rounded-button text-sm font-medium shadow-card-soft" onClick={onDownloadExcel}>
                <Download size={14}/> Excel 다운로드
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto" >
        <table className="w-full border-collapse" >
          <thead className="bg-2" >
            <tr >
              {selectable && (
                <th className="w-12 px-4 py-3 text-center" >
                  <input
                    className="w-4 h-4 rounded-2 border-8 text-0 focus:ring-0 cursor-pointer" type="checkbox" checked={isAllSelected} onChange={handleSelectAll}/>
                </th>
              )}
              {columns.map((col) => (
                <th
                  className={cn(
                    "px-4 py-3 text-xs font-semibold text-5 uppercase tracking-wider whitespace-nowrap",
                    col.sortable && "cursor-pointer hover:bg-2",
                    col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"
                  )} key={col.key} style={col.width ? { width: col.width } : undefined} onClick={() => col.sortable && handleSort(col.key)}>
                  <div className={cn("flex items-center gap-1", col.align === "center" ? "justify-center" : col.align === "right" ? "justify-end" : "justify-start")} >
                    {col.header}
                    {col.sortable && (
                      <div className="flex flex-col" >
                        <ChevronUp className={cn("-mb-1", sortConfig?.key === col.key && sortConfig.direction === "asc" ? "text-0" : "text-8")} size={12}/>
                        <ChevronDown className={cn(sortConfig?.key === col.key && sortConfig.direction === "desc" ? "text-0" : "text-8")} size={12}/>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-7" >
            {data.length === 0 ? (
              <tr >
                <td className="px-6 py-20 text-center" colSpan={columns.length + (selectable ? 1 : 0)}>
                  <div className="flex flex-col items-center justify-center gap-3" >
                    <AlertCircle className="text-8" size={48}/>
                    <div >
                      <p className="text-lg text-4 font-medium" >{emptyMessage}</p>
                      <p className="text-sm text-5 mt-1" >조건을 변경하거나 필터를 초기화해보세요.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  className={cn(
                    "transition-colors",
                    selectedRows.has(idx) ? "bg-6" : "hover:bg-2"
                  )} key={idx}>
                  {selectable && (
                    <td className="px-4 py-3 text-center" >
                      <input
                        className="w-4 h-4 rounded-2 border-8 text-0 focus:ring-0 cursor-pointer" type="checkbox" checked={selectedRows.has(idx)} onChange={() => toggleSelectRow(idx)}/>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      className={cn(
                        "px-4 py-3 text-sm text-Body-Primary-KR text-4 tabular-nums",
                        col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"
                      )} key={col.key}>
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
        <div className="px-6 py-4 border-t border-7 bg-3 flex flex-col md:flex-row justify-between items-center gap-4" >
          <div className="flex items-center gap-6" >
            <p className="text-sm text-5" >
              총 <span className="text-4 font-semibold" >{pagination.total}</span>건 중 <span className="text-4 font-semibold" >{(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> 표시
            </p>
            {onPageSizeChange && (
              <div className="flex items-center gap-2" >
                <span className="text-xs font-medium text-5" >표시</span>
                <select
                  className="bg-3 border border-8 rounded-2 px-2 py-1 text-sm text-4 outline-none cursor-pointer focus:ring-2 focus:ring-0/20 focus:border-0" value={pagination.pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
                  {(pagination.pageSizeOptions || [10, 20, 50, 100]).map(size => <option key={size} value={size}>{size}개</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2" >
            <button
              className="p-2 rounded-2 border border-8 bg-3 text-5 hover:text-0 hover:bg-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all" onClick={() => onPageChange?.(pagination.page - 1)} disabled={pagination.page === 1}>
              <ChevronLeft size={20}/>
            </button>
            <div className="flex items-center gap-1" >
              {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.pageSize)) }).map((_, i) => {
                const totalPages = Math.ceil(pagination.total / pagination.pageSize);
                let pageNum = i + 1;
                if (pagination.page > 3 && totalPages > 5) {
                    pageNum = pagination.page - 2 + i;
                    if (pageNum + (4-i) > totalPages) pageNum = totalPages - 4 + i;
                }
                if (pageNum > totalPages) return null;
                return (
                  <button
                    className={cn(
                      "min-w-[36px] h-[36px] flex items-center justify-center rounded-2 text-sm font-medium transition-all",
                      pagination.page === pageNum ? "bg-0 text-white" : "bg-3 border border-8 text-4 hover:bg-2"
                    )} key={pageNum} onClick={() => onPageChange?.(pageNum)}>
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              className="p-2 rounded-2 border border-8 bg-3 text-5 hover:text-0 hover:bg-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all" onClick={() => onPageChange?.(pagination.page + 1)} disabled={pagination.page === Math.ceil(pagination.total / pagination.pageSize)}>
              <ChevronRight size={20}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
