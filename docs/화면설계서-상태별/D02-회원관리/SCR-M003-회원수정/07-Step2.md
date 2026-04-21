# SCR-M003 회원수정 — 상태: Step2

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M003 |
| 상태 코드 | `step2` |
| 경로 | `/members/edit?id={id}` |
| 역할 | primary / owner / manager / staff |
| 우선순위 | P0 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M003_회원수정/F6_상태별.md` |
| 이전 상태 | `04-수정중 (Step1 통과)` |
| 다음 상태 | `08-저장중` |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M003 회원수정 — 상태: Step2

파일: src/app/members/edit/page.tsx

SCR-M003 회원수정 — 상태: Step2\n\nStep1 통과 후 Step2. 기존 주소/가입경로 등 pre-fill.\n서비스 동의는 기존 동의 완료 상태로 표시.\n저장 버튼 즉시 활성.

사용 유틸: useAuthStore, supabase, react-hook-form, toast, lucide-react
```

## 📝 디스크립션

### 사용 시점
Step1 통과 후 Step2 진입. SCR-M002 Step2와 유사하나 기존 주소/동의 값 pre-fill.

### 필수 데이터
- memberId: URL 쿼리 파라미터
- member 데이터: API 로드 완료

### 인터랙션
- 상태별 세부 인터랙션은 프롬프트 참조
- 공통: 취소(DLG-M007), 초기화(DLG-M008)

### 비즈니스 룰
- primary/owner/manager/staff만 접근
- 수정 권한: 소속 지점 회원만

### 에지 케이스
- 동시 수정: 마지막 저장 우선 (낙관적 잠금 미적용)

### 접근성
- 변경된 필드 시각적 강조
- 에러 시 aria-invalid, aria-describedby 연결

### 연결 화면
- DLG-M006 (전화번호 중복), DLG-M007 (취소 확인), DLG-M008 (초기화), DLG-M027 (주소 검색)
- 완료: SCR-M004

### 다이어그램 참조
- 엣지: `E_NEXT_OK_01`
- 상태: `STATE_STEP2`
