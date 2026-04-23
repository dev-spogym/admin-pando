# SCR-065 급여명세서 — 상태: 발송 완료 / PDF 생성 완료

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-065 |
| 상태 코드 | `action-done` |
| 경로 | `/payroll/statements` |
| 역할 | primary / owner / manager |
| 우선순위 | P0 |
| 이전 상태 | `02-정상` (이메일 발송 또는 PDF 생성 버튼 클릭 후 성공) |
| 다음 상태 | `02-정상` (상태 갱신) |

## 🧩 바이브코딩 프롬프트

```
이메일 발송 완료 처리:
  toast.success('급여 명세서가 발송되었습니다.')
  // 해당 행 StatusBadge: "발송완료" (green) 즉시 업데이트
  setStatements(prev => prev.map(s =>
    s.id === statementId
      ? { ...s, email_sent: true, sent_at: new Date().toISOString() }
      : s
  ))
  // 발송 완료 배지 표시 (해당 행):
  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
    <CheckIcon className="h-3 w-3" /> 발송완료
  </span>

PDF 생성 완료 처리:
  toast.success('PDF가 생성되었습니다.')
  window.open(data.pdfUrl, '_blank')  // 새 탭 다운로드
  // 해당 행 StatusBadge: "생성완료" (blue) 즉시 업데이트
  setStatements(prev => prev.map(s =>
    s.id === statementId
      ? { ...s, pdf_generated: true, pdf_url: data.pdfUrl }
      : s
  ))

전체 발송 완료:
  toast.success(`${successCount}건 발송 완료 / ${failCount}건 실패`)
  fetchStatements()  // 전체 갱신

통계 카드 즉시 갱신:
  - 발송 완료 수 +1
  - 미발송 수 -1
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- 개별/전체 이메일 발송 API 성공
- 개별/전체 PDF 생성 API 성공

### 인터랙션 (User Actions)
- 자동 처리 (낙관적 업데이트)
- toast 3초 후 자동 닫힘

### 비즈니스 룰
- 발송 완료 후 재발송: 허용 (재발송 확인 없이 바로 실행)
- PDF 재생성: 기존 PDF URL 덮어쓰기

### 에지 케이스
- 이메일 발송 실패(SMTP 오류): toast.error + 해당 행 StatusBadge 유지
- PDF 팝업 차단: "팝업 차단 해제 후 다시 시도하세요" 안내

### 연결 화면
- 이전: `02-정상`
- 다음: `02-정상` (상태 갱신 후)
