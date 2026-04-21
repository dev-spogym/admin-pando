# SCR-M007 회원병합 — 상태: Step2 데이터비교

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M007 |
| 상태 코드 | `step2-compare` |
| 경로 | `/members/merge` |
| 역할 | primary / owner |
| 우선순위 | P1 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M007_회원병합/F6_상태별화면.md` |
| 비고 | 🆕 미구현 기능 |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M007 회원병합 — 상태: Step2-데이터비교

파일: src/app/members/merge/page.tsx (🆕 신규 구현)

DataTable: 각 필드별 기준회원값 vs 대상회원값 비교.\nradio로 병합 후 유지할 값 선택.\n전체 필드 선택 완료 시 '다음' 버튼 활성.

사용 유틸: useAuthStore, supabase, hasPermission, lucide-react, toast
```

## 📝 디스크립션

### 사용 시점
두 회원 선택 완료. 필드별 비교 테이블 표시.

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
- 엣지: `E_STEP2_01`
- 상태 코드: `step2-compare` (🆕 신규)
