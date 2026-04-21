# SCR-M004 회원상세 — 상태: null (회원 없음)

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M004 |
| 상태 코드 | `null-member` |
| 경로 | `/members/detail?id={id}` |
| 역할 | 모든 역할 |
| 우선순위 | P1 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M004_회원상세/F6_상태별.md` |
| 이전 상태 | `01-로딩중` |
| 다음 상태 | (없음) |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M004 회원상세 — 상태: null (회원 없음)

파일: src/app/members/detail/page.tsx

처리:
if (!member) return null
// 또는 빈 화면 return, router.push('/members')

일반적으로 useEffect에서:
if (!isLoading && !member) {
  toast.error("존재하지 않는 회원입니다.")
  router.push('/members')
}

사용 유틸: router, toast
```

## 📝 디스크립션

### 사용 시점
- GET /api/members/{id} 404 또는 member=null

### 비즈니스 룰
- toast.error + /members 이동

### 다이어그램 참조
- 엣지: `E_F6_03`
- 상태: `NULL_SCREEN`
