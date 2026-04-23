# SCR-M003 회원수정 — 상태: Pre-fill 완료 (기존 데이터 표시)

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M003 |
| 상태 코드 | `prefill` |
| 경로 | `/members/edit?id={id}` |
| 역할 | primary / owner / manager / staff |
| 우선순위 | P0 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M003_회원수정/F6_상태별.md` |
| 이전 상태 | `01-데이터로딩중` |
| 다음 상태 | `04-수정중` |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M003 회원수정 — 상태: Pre-fill 완료 (기존 데이터 표시, isDirty=false)

파일: src/app/members/edit/page.tsx

레이아웃: AppLayout > PageHeader + StepIndicator + FormCard(기존값)

컴포넌트 구조:
- FormCard (Step1): 기존 회원 데이터로 채워진 상태
  - 회원 구분: member.memberType 선택됨
  - 이름: member.name 표시
  - 성별: member.gender 선택됨
  - 생년월일: member.birthDate 표시
  - 연락처: member.phone 표시 (중복확인 완료 상태)
  - 이메일: member.email 표시
  - 프로필: member.photoUrl 미리보기
  - 담당FC: member.fcId 선택됨

상태:
- isDirty: false (아직 수정 없음)
- phoneChecked: true (기존 번호이므로 확인 완료 처리)

BottomBar:
- 취소: isDirty=false → /members/detail?id={id} 즉시 이동
- 다음: 활성 (기존 데이터 유효)

인터랙션:
- 필드 수정 시작 → `04-수정중`

사용 유틸: useAuthStore, supabase, react-hook-form reset(memberData)
```

## 📝 디스크립션

### 사용 시점
- GET /api/members/{id} 200 OK + 데이터 수신 완료
- react-hook-form reset(memberData) 실행 후

### 필수 데이터
| 항목 | 상태 |
|------|------|
| member | 전체 필드 로드 완료 |
| isDirty | false |
| phoneChecked | true (기존 번호) |

### 인터랙션
1. 필드 수정 → `04-수정중` (isDirty=true)
2. 취소 → isDirty=false → `/members/detail?id={id}`
3. 다음 → `06-Step2`

### 비즈니스 룰
- 기존 연락처는 중복확인 완료 처리 (자기 번호)
- 연락처 변경 시 중복확인 재필요

### 에지 케이스
- 다른 사용자가 동시 수정 중: 낙관적 잠금 미적용 시 마지막 저장 우선

### 접근성
- 모든 필드 기존값 표시로 `aria-label` 명확화

### 연결 화면
- 수정 시작: `04-수정중`
- 취소: SCR-M004

### 다이어그램 참조
- 엣지: `E_LOAD_OK_01`
- 상태: `STATE_PREFILL`
