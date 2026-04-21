# SCR-065 급여 명세서 — 상태: PDF 내보내기

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-065 |
| 상태 코드 | `pdf-export` |
| 경로 | `/payroll/statements` |
| 역할 | 센터장 / 최고관리자 / 슈퍼관리자 |
| 우선순위 | P1 |
| 이전 상태 | `02-기본-개인` ([PDF] 클릭) |
| 다음 상태 | `02-기본-개인` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-065 급여 명세서 — 상태: PDF 내보내기 처리

파일: src/app/payroll/statements/page.tsx

컴포넌트 구조:
1. 개별 PDF 다운로드 핸들러:
   const handleSinglePdf = async (record: PayrollRecord) => {
     setIsPdfGenerating(true);
     try {
       // PDF 생성 (jspdf 또는 react-pdf 사용)
       const doc = generatePayrollPdf(record);
       doc.save(`급여명세서_${record.staffName}_${record.year}년${record.month}월.pdf`);
       toast.success(`${record.staffName} 급여 명세서가 다운로드되었습니다.`);
     } catch (err) {
       toast.error("PDF 생성 중 오류가 발생했습니다.");
     } finally {
       setIsPdfGenerating(false);
     }
   }

2. 일괄 PDF 다운로드:
   const handleBulkPdfDownload = async () => {
     const targets = selectedRows.size > 0
       ? statements.filter(s => selectedRows.has(s.id))
       : statements;
     setIsPdfGenerating(true);
     for (const record of targets) {
       await handleSinglePdf(record);
       await delay(200); // 브라우저 다운로드 큐 처리
     }
     toast.success(`${targets.length}건 PDF 다운로드 완료`);
     setIsPdfGenerating(false);
   }

3. PDF 생성 중 로딩 오버레이 (선택적):
   {isPdfGenerating && (
     <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
       <div className="bg-white rounded-xl p-6 flex items-center gap-3">
         <Loader2 size={24} className="animate-spin text-primary"/>
         <p>PDF 생성 중...</p>
       </div>
     </div>
   )}

4. PDF 내용 구조 (generatePayrollPdf):
   - 헤더: 센터명, 급여명세서 제목, 지급월
   - 직원 정보: 이름, 역할, 직급
   - 지급 항목: 기본급 + 수당 상세
   - 공제 항목: 세금 + 4대보험
   - 실수령액 강조
   - 푸터: 발급일, 센터장 서명란

데이터:
- isPdfGenerating: boolean
- selectedRows: Set<number> (일괄 대상)
- PayrollRecord: 명세서 상세 데이터

인터랙션:
- [PDF] 클릭 → handleSinglePdf() → 브라우저 다운로드
- 전체 PDF 버튼 → handleBulkPdfDownload()
- 생성 완료 → toast.success

사용 유틸:
- toast from 'sonner'
- lucide-react: Download, Loader2, FileText
- jspdf 또는 @react-pdf/renderer (외부 라이브러리)
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- DataTable 행의 [PDF] 버튼 클릭
- PageHeader "전체 PDF" 버튼 클릭
- `isPdfGenerating = true`

### 필수 데이터
| 블록 | 소스 | 설명 |
|------|------|------|
| 명세서 상세 | PayrollRecord.details | 지급/공제 항목 |
| 센터 정보 | branchInfo | PDF 헤더용 |

### 인터랙션 (User Actions)
1. [PDF] 클릭 → 개별 PDF 생성 + 다운로드
2. 전체 PDF → 일괄 순차 PDF 생성
3. 성공 → toast.success + 파일 저장

### 비즈니스 룰
- 파일명: `급여명세서_{직원명}_{년}년{월}월.pdf`
- 일괄 PDF: 브라우저 다운로드 큐 처리 (delay 200ms)
- PDF 생성 중 중복 클릭 방지 (isPdfGenerating)

### 에지 케이스
- 브라우저 팝업 차단 → toast.warning으로 안내
- 대용량 일괄 생성 → 로딩 오버레이 표시

### 접근성 (A11y)
- 로딩 오버레이 `aria-modal="true"` + `role="dialog"`
- 다운로드 버튼 `aria-label="PDF 다운로드"`

### 연결 화면
- 이전: 02-기본-개인
- 다음: 02-기본-개인 (완료 후)
