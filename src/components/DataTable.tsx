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
      <div className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm" >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center" >
          <div className="h-6 w-[150px] bg-gray-100 animate-pulse rounded" />
          <div className="h-9 w-[120px] bg-gray-100 animate-pulse rounded" />
        </div>
        <div className="p-4" >
          <table className="w-full" >
            <thead className="bg-gray-50" >
              <tr >
                {selectable && <th className="w-12 px-4 py-3" ><div className="h-4 w-4 bg-gray-200 rounded mx-auto" /></th>}
                {columns.map((_, i) => <th className="px-4 py-3" key={i}><div className="h-4 w-24 bg-gray-200 rounded" /></th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200" >
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td className="px-4 py-3" ><div className="h-4 w-4 bg-gray-100 rounded mx-auto" /></td>}
                  {columns.map((_, j) => <td className="px-4 py-3" key={j}><div className="h-4 w-full bg-gray-100 rounded" /></td>)}
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
    <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm" >
      {(title || onDownloadExcel || onSearch) && (
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4" >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto" >
            {title && <h2 className="text-lg font-bold text-gray-900" >{title}</h2>}
            {onSearch && (
              <div className="relative w-full sm:w-[300px]" >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                <input 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" type="text" placeholder={searchPlaceholder} value={searchValue} onChange={(e) => onSearch(e.target.value)}/>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto" >
            {onDownloadExcel && (
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-all rounded-md text-sm font-medium shadow-sm" onClick={onDownloadExcel}>
                <Download size={14}/> Excel 다운로드
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto" >
        <table className="w-full border-collapse" >
          <thead className="bg-gray-50" >
            <tr >
              {selectable && (
                <th className="w-12 px-4 py-3 text-center" >
                  <input 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" type="checkbox" checked={isAllSelected} onChange={handleSelectAll}/>
                </th>
              )}
              {columns.map((col) => (
                <th 
                  className={cn(
                    "px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap", 
                    col.sortable && "cursor-pointer hover:bg-gray-100", 
                    col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"
                  )} key={col.key} style={col.width ? { width: col.width } : undefined} onClick={() => col.sortable && handleSort(col.key)}>
                  <div className={cn("flex items-center gap-1", col.align === "center" ? "justify-center" : col.align === "right" ? "justify-end" : "justify-start")} >
                    {col.header}
                    {col.sortable && (
                      <div className="flex flex-col" >
                        <ChevronUp className={cn("-mb-1", sortConfig?.key === col.key && sortConfig.direction === "asc" ? "text-blue-600" : "text-gray-300")} size={12}/>
                        <ChevronDown className={cn(sortConfig?.key === col.key && sortConfig.direction === "desc" ? "text-blue-600" : "text-gray-300")} size={12}/>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200" >
            {data.length === 0 ? (
              <tr >
                <td className="px-6 py-20 text-center" colSpan={columns.length + (selectable ? 1 : 0)}>
                  <div className="flex flex-col items-center justify-center gap-3" >
                    <AlertCircle className="text-gray-300" size={48}/>
                    <div >
                      <p className="text-lg text-gray-900 font-medium" >{emptyMessage}</p>
                      <p className="text-sm text-gray-500 mt-1" >조건을 변경하거나 필터를 초기화해보세요.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr 
                  className={cn(
                    "transition-colors", 
                    selectedRows.has(idx) ? "bg-blue-50" : "hover:bg-gray-50"
                  )} key={idx}>
                  {selectable && (
                    <td className="px-4 py-3 text-center" >
                      <input 
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" type="checkbox" checked={selectedRows.has(idx)} onChange={() => toggleSelectRow(idx)}/>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td 
                      className={cn(
                        "px-4 py-3 text-sm text-gray-700 tabular-nums", 
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
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4" >
          <div className="flex items-center gap-6" >
            <p className="text-sm text-gray-500" >
              총 <span className="text-gray-900 font-semibold" >{pagination.total}</span>건 중 <span className="text-gray-900 font-semibold" >{(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> 표시
            </p>
            {onPageSizeChange && (
              <div className="flex items-center gap-2" >
                <span className="text-xs font-medium text-gray-500" >표시</span>
                <select 
                  className="bg-white border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-700 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={pagination.pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
                  {(pagination.pageSizeOptions || [10, 20, 50, 100]).map(size => <option key={size} value={size}>{size}개</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2" >
            <button 
              className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:text-blue-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all" onClick={() => onPageChange?.(pagination.page - 1)} disabled={pagination.page === 1}>
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
                      "min-w-[36px] h-[36px] flex items-center justify-center rounded-md text-sm font-medium transition-all", 
                      pagination.page === pageNum ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    )} key={pageNum} onClick={() => onPageChange?.(pageNum)}>
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button 
              className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:text-blue-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all" onClick={() => onPageChange?.(pagination.page + 1)} disabled={pagination.page === Math.ceil(pagination.total / pagination.pageSize)}>
              <ChevronRight size={20}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
