# SCR-M004 회원상세 — 상태: EXPIRED (만료)

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M004 |
| 상태 코드 | `expired` |
| 경로 | `/members/detail?id={id}` |
| 역할 | primary / owner / manager / fc / staff |
| 우선순위 | P1 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M004_회원상세/F6_상태별.md` |
| 이전 상태 | `02-ACTIVE` (이용권 만료) |
| 다음 상태 | `02-ACTIVE` (재등록 후) |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M004 회원상세 — 상태: EXPIRED (만료)

파일: src/app/members/detail/page.tsx

컴포넌트 구조:
- StatusBadge("만료", color="red", icon=UserX)
- 재등록 유도 배너 (🆕):
  <div className="mx-4 mt-2 rounded-lg bg-red-50 border border-red-200 p-4">
    <p className="text-sm font-medium text-red-700">이용권이 만료되었습니다.</p>
    <p className="text-xs text-red-500 mt-1">재등록하여 회원 서비스를 이어가세요.</p>
    <Button size="sm" variant="outline" className="mt-3 text-red-600 border-red-300">
      이용권 재등록
    </Button>
  </div>
- ActionButtons: 수동출석 없음, 홀딩 처리 없음
- TabContent: 조회 가능 (이력 확인)

인터랙션:
- "이용권 재등록" → 이용권 등록 화면 또는 결제 모달

사용 유틸: useAuthStore, supabase, lucide-react (UserX)
```

## 📝 디스크립션

### 사용 시점
- member.status === 'EXPIRED'

### 비즈니스 룰
- 재등록 배너: 🆕 신규 기능
- 출석/홀딩 불가

### 에지 케이스
- 재등록 시 자동 ACTIVE 전환

### 다이어그램 참조
- 엣지: `E_F6_06`
- 상태: `EXP`
