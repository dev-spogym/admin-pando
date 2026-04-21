# SCR-M004 회원상세 — 상태: INACTIVE (비활성)

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M004 |
| 상태 코드 | `inactive` |
| 경로 | `/members/detail?id={id}` |
| 역할 | primary / owner / manager / fc / staff |
| 우선순위 | P2 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M004_회원상세/F6_상태별.md` |
| 이전 상태 | (탈퇴 처리 등) |
| 다음 상태 | (없음) |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M004 회원상세 — 상태: INACTIVE (비활성/탈퇴)

파일: src/app/members/detail/page.tsx

컴포넌트 구조:
- StatusBadge("비활성", color="gray")
- 액션 버튼 없음 (조회 전용)
- TabContent: 조회 가능 (이력 확인 목적)
- InactiveNotice:
  <p className="text-sm text-gray-400 text-center mt-4">
    이 회원은 비활성 상태입니다. 조회만 가능합니다.
  </p>

사용 유틸: useAuthStore, supabase
```

## 📝 디스크립션

### 사용 시점
- member.status === 'INACTIVE'

### 비즈니스 룰
- 모든 액션 버튼 비표시
- 탭 조회만 허용

### 다이어그램 참조
- 엣지: `E_F6_08`
- 상태: `INACT`
