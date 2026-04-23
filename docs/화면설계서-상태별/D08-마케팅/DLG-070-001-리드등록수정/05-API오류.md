# DLG-070-001 리드 등록/수정 — 상태 05: API 오류

> 상속: [`00-기본화면.md`](./00-기본화면.md)

## 메타
| 항목 | 값 |
|------|----|
| 상태 코드 | `api-error` |
| 상태 ID | STATE_API_ERROR |
| 다이어그램 노드 | `F7_에러처리.md` → API_ERROR |
| 이전 상태 | `01/02` 저장 → 4xx/5xx / 네트워크 실패 |
| 다음 상태 | 재시도 → `03-저장성공` 또는 재진입 |

## 상태 진입 조건
- supabase insert/update 실패 (4xx/5xx)
- 네트워크 오류(Promise reject)

## 상태 고유 비주얼 델타
- 모달 유지
- 저장 버튼 활성 복귀
- 토스트 `toast.error("저장 실패: ${message}")`
- 인라인 에러(role=alert) 빨간 텍스트

## 역할별 차이
공통.

## 상태 고유 인터랙션
1. 값 수정 후 재시도 가능
2. ESC/취소로 닫기 (값 소실)
3. 동일 에러 3회 후 "잠시 후 다시" 안내(선택)

## 상태 고유 비즈니스 룰 델타
- `setSaving(false)` 로 복귀
- 에러 메시지는 PostgrestError.message 또는 err.message
- 401 → DLG-000으로 위임(인터셉터)
- 403 → `toast.error("권한이 없습니다.")` + 모달 자동 닫힘
- 409 → `toast.error("중복된 연락처입니다.")` (option)

## 에지 케이스
- 네트워크 복구 후 재시도 → 03
- 서버 성공 + 클라 타임아웃 → 중복 생성 우려, upsert 권장(미래 개선)
- 모달 닫는 중 에러 도착 → 토스트만 노출

## 🧩 바이브코딩 프롬프트 (델타)
```
상속: 00 §14. 상태: api-error

try { ... }
catch (e: any) {
  setSaving(false);
  if (e.status === 401) return;
  if (e.status === 403) { toast.error('권한이 없습니다.'); onClose(); return; }
  const msg = e?.message ?? '알 수 없는 오류';
  setErr(msg);
  toast.error(`저장 실패: ${msg}`);
}
{err && <div role="alert" className="text-sm text-red-600 mt-2">{err}</div>}
```

## TC 후보
| TC ID | 타입 | Given | When | Then |
|---|---|---|---|---|
| TC-DLG-070-001-05-01 | neg | 500 | 저장 | 토스트 + 모달 유지 |
| TC-DLG-070-001-05-02 | neg | 네트워크 끊김 | 저장 | 토스트 |
| TC-DLG-070-001-05-03 | pos | 재시도 | 성공 | 03 전이 |
| TC-DLG-070-001-05-04 | neg | 403 | 저장 | "권한이 없습니다." + 닫힘 |
| TC-DLG-070-001-05-05 | neg | 401 | 저장 | DLG-000 위임 |

## 다이어그램 링크
- F7 에러처리: `…/F7_에러처리.md` → API_ERROR
- F3 결과분기: `…/F3_결과분기.md`
