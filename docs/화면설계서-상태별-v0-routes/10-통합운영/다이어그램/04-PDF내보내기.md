# SCR-D001 다이어그램 — 상태: PDF 내보내기

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-D001 |
| 상태 코드 | `pdf-exporting` |
| 경로 | `/diagrams` |
| 역할 | 센터장 / 본사 관리자 |
| 우선순위 | P1 |
| 이전 상태 | `02-기본` 또는 `03-확대뷰` → PDF 내보내기 버튼 |
| 다음 상태 | `02-기본` (완료) |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-D001 다이어그램 — 상태: PDF 내보내기 처리 중

파일: src/app/diagrams/DiagramBrowser.tsx

PDF 내보내기 로직:
const handleExportPDF = async () => {
  setIsExporting(true);
  try {
    // SVG → Canvas → PDF
    const svgEl = mermaidRef.current?.querySelector('svg');
    if (!svgEl) throw new Error('SVG not found');

    // html2canvas로 SVG 캡처
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(mermaidRef.current!, {
      backgroundColor: '#ffffff',
      scale: 2, // 고해상도
    });

    // jsPDF로 PDF 생성
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${selectedDiagram.title}_${formatDate(new Date(), 'yyyyMMdd')}.pdf`);

    toast.success(`'${selectedDiagram.title}' PDF 내보내기 완료`);
  } catch {
    toast.error('PDF 내보내기에 실패했습니다.');
  } finally {
    setIsExporting(false);
  }
};

내보내기 진행 중 UI:
- PDF 버튼: <Loader2 className="animate-spin w-4 h-4 mr-1" /> "내보내는 중..." disabled
- 뷰어 영역 오버레이: relative + <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl z-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

대안 — 브라우저 인쇄 API:
const handlePrint = () => {
  window.print(); // @media print CSS로 제어
};

CSS (globals.css):
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  #mermaid-viewer { width: 100%; page-break-inside: avoid; }
}

사용 유틸:
- toast from 'sonner'
- lucide-react: Loader2, Download
- dynamic import: html2canvas, jspdf
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- "PDF 내보내기" 버튼 클릭 시
- `02-기본` 또는 `03-확대뷰`에서 가능

### 필수 데이터
- 없음 (렌더링된 SVG DOM 사용)

### 인터랙션 (User Actions)
1. PDF 버튼 클릭 → 진행 중 UI 표시
2. 완료 → 자동 다운로드, toast.success
3. 실패 → toast.error

### 비즈니스 룰
- 파일명: `{다이어그램 제목}_{날짜}.pdf`
- 해상도: scale=2 (고해상도 캡처)
- 페이지 방향: 다이어그램 비율에 따라 자동 결정

### 에지 케이스
- html2canvas/jsPDF 로드 실패 → 브라우저 인쇄 fallback
- SVG 없음 → toast.error

### 접근성 (A11y)
- PDF 버튼 `aria-busy="true"` (진행 중)
- 완료 후 `aria-live="polite"` 성공 공지

### 연결 화면
- 이전: `02-기본` / `03-확대뷰`
- 다음: `02-기본` (완료 후)
