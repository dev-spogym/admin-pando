import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnDef {
  key: string;
  header: string;
}

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: ColumnDef[];
  fileName?: string;
  format?: 'csv' | 'xlsx';
  className?: string;
  disabled?: boolean;
}

function generateCsv(data: Record<string, unknown>[], columns: ColumnDef[]): string {
  const bom = '\uFEFF';
  const header = columns.map((c) => c.header).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const v = row[c.key];
        if (v === null || v === undefined) return '';
        const str = String(v);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(',')
  );
  return bom + [header, ...rows].join('\n');
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportButton({
  data,
  columns,
  fileName = 'export',
  format = 'csv',
  className,
  disabled = false,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (loading || disabled) return;
    setLoading(true);
    try {
      // xlsx 포맷은 현재 csv로 fallback (xlsx 라이브러리 미포함 시)
      const csv = generateCsv(data, columns);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const ext = format === 'xlsx' ? 'csv' : 'csv'; // xlsx 지원 시 확장 가능
      downloadBlob(blob, `${fileName}.${ext}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-sm py-[9px]',
        'text-sm font-medium text-content transition-colors',
        'hover:bg-surface-secondary active:bg-surface-tertiary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-content-secondary border-t-transparent" />
      ) : (
        <Download size={15} />
      )}
      엑셀 다운로드
    </button>
  );
}

export { ExportButton };
export type { ColumnDef };
