# SCR-M007 회원병합 — 상태: Step1 회원검색

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M007 |
| 상태 코드 | `step1-search` |
| 경로 | `/members/merge` |
| 역할 | primary / owner |
| 우선순위 | P1 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M007_회원병합/F6_상태별화면.md` |
| 비고 | 🆕 미구현 기능 |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M007 회원병합 — 상태: Step1-회원검색

파일: src/app/members/merge/page.tsx (🆕 신규 구현)

Step1 화면. 기준 회원 검색 + 병합 대상 회원 검색.\n두 개의 SearchInput + 검색 결과 드롭다운.\n두 회원 선택 완료 시 '다음' 버튼 활성.

사용 유틸: useAuthStore, supabase, hasPermission, lucide-react, toast
```

## 📝 디스크립션

### 사용 시점
초기 상태. 두 회원 검색 폼 표시.

### 비즈니스 룰
- primary/owner만 접근 가능 (매우 위험한 작업)
- 병합 후 대상 회원 soft delete
- 되돌릴 수 없음 — 최종 확인 다이얼로그 필수

### 접근성
- 위험 액션 버튼 ,  명확히

### 연결 화면
- DLG-M028 (병합 확인)
- 완료: SCR-M004 (기준 회원 상세)

### 다이어그램 참조
- 엣지: `E_STEP1_01`
- 상태 코드: `step1-search` (🆕 신규)
