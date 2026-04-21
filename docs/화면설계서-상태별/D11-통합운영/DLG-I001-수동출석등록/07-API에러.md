# DLG-I001 수동출석등록 — 상태: API 에러

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | DLG-I001 |
| 상태 코드 | `api-error` |
| 경로 | SCR-I001 위 모달 |
| 역할 | superAdmin, primary, owner, manager, fc, staff |
| 우선순위 | P1 |
| 이전 상태 | `04-저장중` (500 / timeout) |
| 다음 상태 | 재시도 → `04-저장중` / 닫기 → 모달 닫힘 |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 'use client' 컴포넌트를 작성하라.
화면: DLG-I001 수동출석등록 — 상태: API 에러

파일: src/components/attendance/ManualAttendanceModal.tsx

에러 처리:
catch (e) {
  const errMsg = e instanceof Error ? e.message : '알 수 없는 오류'
  setApiError(errMsg)
  toast.error('출석 등록에 실패했습니다', { id: 'attendance-submit-error' })
  setIsSubmitting(false)
}

[API 에러 UI — 폼 하단]
{apiError && (
  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
    <svg ... className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-medium text-red-700">등록에 실패했습니다</p>
      <p className="text-xs text-red-500 mt-0.5">{apiError}</p>
    </div>
    <button
      onClick={() => { setApiError(null); submitAttendance() }}
      className="text-xs text-red-600 underline whitespace-nowrap"
    >
      재시도
    </button>
  </div>
)}

타임아웃 처리 (10초):
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10_000)
// 타임아웃 에러: '요청 시간이 초과되었습니다' 메시지
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Supabase insert 500 오류
- 네트워크 타임아웃 (10초 초과)
- RLS 정책 위반

### 인터랙션
1. "재시도" → submitAttendance() 재호출 → `04-저장중`
2. 폼 유지 (모달 닫히지 않음)
3. 취소 버튼 → 모달 닫힘

### 비즈니스 룰
- 에러 시 폼 데이터 유지 (재입력 불필요)
- 토스트 id로 중복 방지
- 타임아웃: 10초 (AbortController)

### 연결 화면
- 이전: `04-저장중`
- 다음: 재시도 → `04-저장중` / 닫기 → SCR-I001
