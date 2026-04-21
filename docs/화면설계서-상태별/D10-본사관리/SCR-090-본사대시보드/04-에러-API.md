# SCR-090 본사대시보드 — 상태: 에러 (API 오류)

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-090 |
| 상태 코드 | `error-api` |
| 경로 | `src/app/(admin)/super-dashboard/page.tsx` |
| 역할 | primary, owner, manager, fc, staff, readonly |
| 우선순위 | P1 |
| 이전 상태 | `01-로딩` |
| 다음 상태 | 새로고침 → `01-로딩` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-090 본사대시보드 — 상태: API 에러

조건: E_090_ST_04 — API 오류로 데이터 로드 실패

에러 처리 구현:
try {
  const data = await fetchDashboardData()
  setData(data)
} catch (err) {
  setError(true)
  toast.error('대시보드 데이터를 불러오지 못했습니다.')
}

에러 UI:
- AppLayout + PageHeader 유지
- 콘텐츠 영역에:
  <div className="flex flex-col items-center justify-center h-96 gap-4">
    <p className="text-gray-500 text-base">데이터를 불러오지 못했습니다.</p>
    <Button variant="outline" onClick={loadDashboard}>
      새로고침
    </Button>
  </div>

- toast.error("대시보드 데이터를 불러오지 못했습니다.") 1회 발사

사용 유틸:
- toast from sonner
- Button 컴포넌트
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `E_090_ST_04`: API 오류 (4xx / 5xx)
- `E_090_ST_08`: 로딩 실패

### TC 연결
- TC-090-F6-001: API 오류 → 진입 → 에러 토스트 + 에러 상태

### 인터랙션 (User Actions)
1. [새로고침] 버튼 → `E_090_ST_09` → `01-로딩` 재진입

### 연결 화면
- 이전: `01-로딩`
- 다음: 새로고침 → `01-로딩`
