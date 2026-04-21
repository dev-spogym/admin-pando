# SCR-I007 회원건강연동요약 — 상태: InBody 미측정

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-I007 |
| 상태 코드 | `inbody-unmeasured` |
| 경로 | `/members/[id]/health` |
| 역할 | superAdmin, primary, owner, manager, fc, staff |
| 우선순위 | P1 |
| 이전 상태 | `02-정상` (InBody 측정 기록 없는 회원) |
| 다음 상태 | 수기 등록 → DLG-I003 / 측정 완료 후 새로고침 → `02-정상` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-I007 회원건강연동요약 — 상태: InBody 미측정 카드

파일: src/app/members/[id]/health/page.tsx (체성분 카드 조건부)

조건: !bodyComposition || bodyComposition.length === 0

[체성분 카드 — 미측정 상태]
<div className="bg-white rounded-xl shadow-sm p-5">
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-semibold text-gray-800">체성분 최신 측정</h3>
    <span className="px-2 py-1 bg-sky-100 text-sky-700 text-xs rounded-full font-medium">
      미측정
    </span>
  </div>

  <div className="flex flex-col items-center py-4 text-center">
    <svg ... className="w-10 h-10 text-gray-300 mb-3" /> {/* 체중계 아이콘 */}
    <p className="text-sm text-gray-500 font-medium">체성분 측정 기록이 없습니다</p>
    <p className="mt-1 text-xs text-gray-400">
      InBody 측정을 진행하거나 수기로 데이터를 등록하세요.
    </p>
  </div>

  {hasPermission('bodyComposition:write') && (
    <button
      onClick={() => openManualModal(memberId)}
      className="w-full mt-2 px-4 py-2 bg-sky-50 border border-sky-200 text-sky-700 text-sm rounded-lg hover:bg-sky-100"
    >
      📝 수기 등록
    </button>
  )}
</div>

openManualModal: DLG-I003 오픈 (회원 pre-fill)

[측정 권장 메시지 — 카드 하단]
마지막 측정 없음 → "첫 측정을 권장합니다" (초록 텍스트)
측정 후 3개월 이상 경과 → "재측정을 권장합니다 (마지막: N개월 전)"
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `bodyComposition.length === 0` (해당 회원 측정 이력 없음)
- 최근 측정 3개월 이상 경과 (재측정 권장 포함)

### 필수 데이터
- `bodyComposition` WHERE `member_id=?`: 빈 배열
- 마지막 측정일 (있으면 경과 일수 계산)

### 인터랙션 (User Actions)
1. "수기 등록" → DLG-I003 (member_id pre-fill)
2. 나머지 카드 정상 인터랙션

### 비즈니스 룰
- 미측정은 info 상태 (에러 아님)
- DLG-I003 완료 후: 카드 자동 갱신 (onSuccess 콜백)
- `bodyComposition:write` 없으면 버튼 숨김

### 에지 케이스
- 측정 후 즉시 카드 갱신: 수기 등록 성공 콜백 → 재조회
- InBody 장비 없는 지점: "수기 등록" 버튼만 표시

### 연결 화면
- 이전: `02-정상` (미측정 회원)
- 다음: DLG-I003 → 등록 완료 후 카드 갱신 → `02-정상`
