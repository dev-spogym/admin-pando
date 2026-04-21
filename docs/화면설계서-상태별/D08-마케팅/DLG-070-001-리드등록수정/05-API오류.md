# DLG-070-001 리드등록수정 — 상태: API 오류

## 메타

| 항목 | 값 |
|------|----|
| 모달 ID | DLG-070-001 |
| 상태 코드 | `api-error` |
| 트리거 | API 500/timeout 응답 |
| 역할 | owner, manager, fc |
| 우선순위 | P2 |
| 이전 상태 | `01-열림-등록모드` 또는 `02-열림-수정모드` |
| 다음 상태 | 재시도 또는 취소 |

## 🧩 바이브코딩 프롬프트

```
API 오류 처리 (LeadFormModal.tsx):

500 서버 오류 (TC-070-M3-01):
- toast.error("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
- 모달 유지 (닫히지 않음)
- 저장 버튼 loading 해제 (재시도 가능)

타임아웃:
- toast.warning("요청 시간이 초과되었습니다. 다시 시도해주세요.")

400 Bad Request:
- 서버 에러 메시지를 인라인 표시
  setError('root', { message: error.message })
  <p className="text-sm text-red-500 mt-2">{errors.root?.message}</p>

구현:
try {
  const { error } = await supabase.from('leads').insert(data)
  if (error) throw error
  toast.success("리드가 등록되었습니다.")
  onClose()
} catch (err) {
  toast.error("서버 오류가 발생했습니다.")
  setIsSaving(false)
}
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- API 500 (TC-070-M3-01)
- 네트워크 타임아웃

### 인터랙션 (User Actions)
1. 저장 버튼 재클릭 → 재시도
2. "취소" → 모달 닫힘

### 연결 화면
- 다음: 재시도 → `03-저장성공` 또는 반복 오류
