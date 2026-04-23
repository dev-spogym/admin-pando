# SCR-M004 회원상세 — 상태: HOLDING (홀딩 중)

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M004 |
| 상태 코드 | `holding` |
| 경로 | `/members/detail?id={id}` |
| 역할 | primary / owner / manager / fc / staff |
| 우선순위 | P0 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M004_회원상세/F6_상태별.md` |
| 이전 상태 | `02-ACTIVE` (홀딩 처리 후) |
| 다음 상태 | `02-ACTIVE` (홀딩 해제 후) |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M004 회원상세 — 상태: HOLDING

파일: src/app/members/detail/page.tsx

컴포넌트 구조:
- StatusBadge("홀딩 중", color="yellow", icon=PauseCircle)
- ActionButtons:
  - "홀딩 해제" Button → DLG-M004 (HOLDING 상태에만 표시)
  - "수동출석" 버튼 없음 (홀딩 중 출석 불가)
  - 기타 버튼은 ACTIVE와 동일
- HoldingInfoBanner:
  <div className="mx-4 mt-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
    홀딩 기간: {holdingStart} ~ {holdingEnd} (잔여 N일)
  </div>
- TabContent: 정상 렌더링 (홀딩 중에도 이력 조회 가능)

인터랙션:
- "홀딩 해제" → DLG-M004

사용 유틸: useAuthStore, supabase, lucide-react (PauseCircle), toast
```

## 📝 디스크립션

### 사용 시점
- member.status === 'HOLDING'

### 필수 데이터
- member.holdingStart, member.holdingEnd

### 인터랙션
1. 홀딩 해제 → DLG-M004
2. 탭 조회: 정상 가능

### 비즈니스 룰
- 홀딩 중 출석 처리 불가
- 홀딩 기간 정보 배너 표시
- 만료일은 홀딩 기간만큼 자동 연장

### 에지 케이스
- 홀딩 기간 종료: 자동 ACTIVE 전환 (batch job)

### 접근성
- StatusBadge `aria-label="회원 상태: 홀딩 중"`

### 연결 화면
- DLG-M004 (홀딩 해제)

### 다이어그램 참조
- 엣지: `E_F6_05`
- 상태: `HOLD`
