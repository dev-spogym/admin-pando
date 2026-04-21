# SCR-M002 회원등록 — 상태: Step2 (추가 정보)

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M002 |
| 상태 코드 | `step2` |
| 경로 | `/members/new` |
| 역할 | primary / owner / manager / staff |
| 우선순위 | P0 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M002_회원등록/F6_상태별.md` |
| 이전 상태 | `02-입력중` (Step1 통과) |
| 다음 상태 | `07-저장중` |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M002 회원등록 — 상태: Step2 (추가 정보)

파일: src/app/members/new/page.tsx

레이아웃: AppLayout > PageHeader + StepIndicator(Step2 활성) + FormCard

컴포넌트 구조:
- StepIndicator: Step1(완료 체크) / Step2(활성)
- FormCard (Step2):
  - 주소 Input + "주소 검색" Button → DLG-M027
  - 상세주소 Input
  - 가입경로 Select: [SNS, 지인추천, 광고, 직접방문, 기타]
  - 건강 상태 Textarea (선택)
  - 운동 목적 Checkbox: [다이어트, 근력강화, 재활, 건강유지, 기타]
  - 긴급연락처 Input (선택)
  - 서비스 동의 Checkbox (필수): [이용약관, 개인정보처리방침]
- BottomBar:
  - 이전 Button → Step1으로 복귀
  - 저장 Button (서비스 동의 완료 시 활성)

인터랙션:
- 주소 검색 클릭 → DLG-M027
- 저장 클릭 → `07-저장중`
- 이전 클릭 → Step1으로 복귀

사용 유틸: react-hook-form, supabase, lucide-react
```

## 📝 디스크립션

### 사용 시점
- Step1 모든 필수 필드 충족 + 다음 버튼 클릭

### 필수 데이터
| 항목 | 상태 |
|------|------|
| Step1 데이터 | 모두 유효 |
| 서비스 동의 | 미완료 (초기) |

### 인터랙션
1. 주소 검색 → DLG-M027 (주소 검색 다이얼로그)
2. 서비스 동의 완료 → 저장 버튼 활성
3. 저장 → `07-저장중`
4. 이전 → Step1 복귀 (기존 입력값 유지)

### 비즈니스 룰
- 서비스 동의(이용약관 + 개인정보처리방침) 모두 체크 필수
- 운동 목적은 복수 선택 가능
- 주소는 선택 항목

### 에지 케이스
- 이전 버튼으로 Step1 복귀 후 재수정 시 Step2 입력값 유지

### 접근성
- 동의 체크박스 `aria-required="true"`
- "저장" 버튼 비활성 시 `aria-disabled="true"`

### 연결 화면
- DLG-M027 (주소 검색)
- `07-저장중`

### 다이어그램 참조
- 엣지: `E_NEXT_OK_01` (Step1 통과)
- 상태: `STATE_STEP2`
