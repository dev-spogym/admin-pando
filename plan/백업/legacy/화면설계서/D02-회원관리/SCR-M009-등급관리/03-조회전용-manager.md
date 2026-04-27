# SCR-M009 등급관리 — 상태: 조회전용-manager

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M009 |
| 상태 코드 | `view-only` |
| 경로 | `/members/grades` |
| 역할 | primary / owner / manager |
| 우선순위 | P1 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M009_등급관리/F6_상태별화면.md` |
| 비고 | 🆕 미구현 기능 |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M009 등급관리 — 상태: 조회전용-manager

파일: src/app/members/grades/page.tsx (🆕 신규 구현)

등급 카드 조회, 등급 이력 테이블. 수정/변경 버튼 없음.

사용 유틸: useAuthStore, supabase, hasPermission, lucide-react, toast
```

## 📝 디스크립션

### 사용 시점
manager 역할 — 조회만.

### 비즈니스 룰
- 등급 설정: primary/owner만 수정 가능
- manager: 등급 현황 조회 + 수동 변경만 가능
- 등급 변경 이력 보관

### 연결 화면
- DLG-M030 (등급 변경)

### 다이어그램 참조
- 엣지: `E_ROLE_MGR_01`
