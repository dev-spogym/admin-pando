import * as XLSX from 'xlsx';

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

/**
 * 데이터 배열을 엑셀(.xlsx)로 다운로드
 * @param data - 객체 배열
 * @param columns - { key, header } 배열 (테이블 컬럼 정의)
 * @param options - filename, sheetName
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: { key: string; header: string }[],
  options: ExportOptions
) {
  const { filename, sheetName = 'Sheet1' } = options;

  // 헤더 매핑: key → header 라벨
  const headers = columns.map(c => c.header);
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return '';
      return val;
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 컬럼 너비 자동 조정
  ws['!cols'] = columns.map((_, i) => {
    const maxLen = Math.max(
      headers[i].length,
      ...rows.map(r => String(r[i]).length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
