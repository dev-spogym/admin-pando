# SCR-075 전자계약 등록 — 상태: Step1 회원선택

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-075 |
| 상태 코드 | `step1-member-select` |
| 경로 | `/contracts/new` |
| 역할 | 센터장 / 매니저 / FC |
| 우선순위 | P0 |
| 이전 상태 | 사이드바 마케팅 > 전자계약 / 회원 상세 [계약 등록] |
| 다음 상태 | `02-Step2-상품선택` (다음 단계 클릭) |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind CSS 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-075 전자계약 등록 — 상태: Step 1 회원 선택

파일: src/app/(marketing)/contracts/new/page.tsx

레이아웃:
- <AppLayout> 데스크톱
- max-w-[1200px] mx-auto pb-xxl
- <PageHeader title="전자계약 등록" description="회원 선택부터 상품 결제, 확인까지 5단계로 진행합니다."
    actions={<button onClick={handleCancel}>취소</button>} />

Step Indicator (데스크톱):
- 5개 단계: 회원선택 / 상품선택 / 기간/금액 / 결제 / 확인
- 현재 step=1: 1번 원 bg-primary text-white scale-110, 나머지 bg-surface border
- 완료 step: bg-accent text-white + CheckCircle2 아이콘
- 단계 사이 연결선: step > s.id 시 bg-accent (100%), 아니면 0%

Step 1 본문 (space-y-lg animate-in):
상단 행:
- h2 "회원 조회"
- 우측: [+ 신규 회원 등록] 버튼 → moveToPage(986)

검색 input:
- relative div
- Search 아이콘 absolute left
- input placeholder="이름 또는 전화번호로 검색"
- value={searchQuery} onChange → setSearchQuery

오류 메시지 (stepErrors[1] 있을 때):
- flex items-center gap-sm text-state-error bg-state-error/5 border border-state-error/20 rounded-xl
- AlertCircle 아이콘 + stepErrors[1] 텍스트

DataTable:
- columns: 이름(120) / 연락처(160) / 상태(100, StatusBadge) / 보유상품 / 선택버튼(100)
- 선택 버튼: selectedMember?.id === row.id ? "선택됨"(bg-accent) : "선택"(bg-primary-light)
- 클릭 시 setSelectedMember(row), clearStepError(1), 자동 스크롤

선택 완료 확인 (selectedMember 있을 때):
- ref={selectedMemberInfoRef} bg-accent-light border-accent/30 rounded-xl
- CheckCircle2 아이콘(text-accent) + "{name}({phone}) 회원이 선택되었습니다."

하단 내비게이션:
- 좌: [이전] 버튼 disabled (step=1)
- 우: [다음 단계 →] 버튼 → nextStep() → validateStep(1) → step=2

데이터:
- type MemberRow = { id, name, phone, status, membership }
- supabase.from('members').select('id, name, phone, status, membershipType').eq('branchId', getBranchId())
- filteredMembers = searchQuery ? members.filter(name/phone 포함) : members

인터랙션:
- 회원 선택 → setSelectedMember + clearStepError(1) + 스크롤
- [다음 단계] → validateStep(1): !selectedMember → stepErrors[1] 세팅 후 return false

사용 유틸:
- supabase from '@/lib/supabase'
- moveToPage from '@/internal'
- lucide-react: User, Search, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Plus
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `/contracts/new` 라우트 진입 시 (step=1 초기)
- [다음 단계] 클릭 후 유효성 실패 시 step=1 유지

### 필수 데이터
| 블록 | 테이블 | 조건 |
|------|--------|------|
| 회원 목록 | `members` | `branchId = ?` |
| 직원 목록 (Step3용 미리 fetch) | `staff` | `branchId = ?` |
| 상품 목록 (Step2용 미리 fetch) | `products` | `branchId = ?` |

### 인터랙션 (User Actions)
1. 검색 입력 → filteredMembers 실시간 필터
2. 회원 선택 → `setSelectedMember(row)` + 확인 메시지 표시 + 스크롤
3. [+ 신규 회원 등록] → `moveToPage(986)` (회원 등록 화면)
4. [다음 단계] → validateStep(1) → step=2

### 비즈니스 룰
- 회원 미선택 시 [다음 단계] 클릭 → `stepErrors[1] = "계약 대상 회원을 선택해주세요."` + 진행 차단
- 취소 버튼: 입력 내용 있으면 `window.confirm` 확인 후 `moveToPage(970)`
- 상태 표시: ACTIVE=활성/EXPIRED=만료/HOLDING=홀딩/INACTIVE=미등록/SUSPENDED=정지

### 에지 케이스
- 검색 결과 0건 → DataTable emptyMessage
- 회원 0명 (신규 센터) → [+ 신규 회원 등록] CTA 강조

### 접근성 (A11y)
- Step Indicator: `aria-current="step"` 현재 단계에 적용
- 선택 버튼: `aria-pressed={selectedMember?.id === row.id}`

### 연결 화면
- 이전: 사이드바 / 회원 상세
- 다음: `02-Step2-상품선택`
