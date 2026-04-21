# SCR-M004 회원상세 — 상태: SUSPENDED (이용 정지)

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M004 |
| 상태 코드 | `suspended` |
| 경로 | `/members/detail?id={id}` |
| 역할 | primary / owner / manager |
| 우선순위 | P1 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M004_회원상세/F6_상태별.md` |
| 이전 상태 | `02-ACTIVE` (정지 처리) |
| 다음 상태 | `02-ACTIVE` (정지 해제 후) |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M004 회원상세 — 상태: SUSPENDED (이용 정지)

파일: src/app/members/detail/page.tsx

컴포넌트 구조:
- StatusBadge("이용 정지", color="gray", icon=Ban)
- 정지 해제 버튼 (🆕, primary/owner/manager only):
  <Button variant="outline" onClick={() => handleUnsuspend()}>
    정지 해제
  </Button>
- SuspendedBanner:
  <div className="mx-4 mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
    <p className="text-sm text-gray-600">이용 정지 사유: {member.suspendReason}</p>
    <p className="text-xs text-gray-400 mt-1">정지일: {member.suspendedAt}</p>
  </div>
- TabContent: 조회 가능

인터랙션:
- "정지 해제" → DLG-M001 (상태 변경 다이얼로그, ACTIVE로 변경)

사용 유틸: useAuthStore, supabase, lucide-react (Ban), hasPermission
```

## 📝 디스크립션

### 사용 시점
- member.status === 'SUSPENDED'

### 비즈니스 룰
- 정지 해제: primary/owner/manager만 가능
- 정지 사유 표시

### 다이어그램 참조
- 엣지: `E_F6_07`
- 상태: `SUSP` (🆕 신규)
