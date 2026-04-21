# SCR-M008 가족회원 — 상태: 전체기능-manager이상

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M008 |
| 상태 코드 | `full-access` |
| 경로 | `/members/family?memberId={id}` |
| 역할 | primary / owner / manager / fc / staff |
| 우선순위 | P1 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M008_가족회원/F6_상태별화면.md` |
| 비고 | 🆕 미구현 기능 |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M008 가족회원 — 상태: 전체기능-manager이상

파일: src/app/members/family/page.tsx (🆕 신규 구현)

가족 카드 + '가족 연결' Button → DLG-M029, '해제' Button per 카드.

사용 유틸: useAuthStore, supabase, hasPermission, lucide-react, toast
```

## 📝 디스크립션

### 사용 시점
primary/owner/manager — 전체 기능.

### 비즈니스 룰
- 가족 관계: 배우자, 부모, 자녀, 형제자매
- 가족 연결/해제: primary/owner/manager만 가능
- fc/staff: 조회 전용

### 연결 화면
- DLG-M029 (가족 연결)

### 다이어그램 참조
- 엣지: `E_ROLE_FULL_01`
