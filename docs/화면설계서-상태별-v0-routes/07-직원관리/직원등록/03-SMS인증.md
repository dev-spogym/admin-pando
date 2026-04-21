# SCR-061 직원 등록 — 상태: SMS 인증 (연락처 확인)

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-061 |
| 상태 코드 | `sms-verify` |
| 경로 | `/staff/new` |
| 역할 | 센터장 / 최고관리자 / 슈퍼관리자 |
| 우선순위 | P2 |
| 이전 상태 | `02-입력중` |
| 다음 상태 | `04-저장중` (인증 성공) / `06-검증에러` (인증 실패) |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-061 직원 등록 — 상태: SMS 인증 (연락처 중복 확인 포함)

파일: src/app/staff/new/page.tsx

레이아웃:
- 01-기본-폼과 동일한 레이아웃
- 연락처 필드 아래에 인증 섹션 추가 (선택적 기능)

컴포넌트 구조:
1. 연락처 필드 옆 [중복 확인] 버튼:
   <Button variant="outline" size="sm" onClick={checkDuplicateContact}>
     중복 확인
   </Button>
2. 중복 확인 함수:
   const checkDuplicateContact = async () => {
     const contact = watch("contact");
     const { data } = await supabase
       .from("staff")
       .select("id")
       .eq("phone", contact)
       .eq("branchId", getBranchId())
       .maybeSingle();
     if (data) {
       toast.error("이미 등록된 연락처입니다.");
       setContactDuplicate(true);
     } else {
       toast.success("사용 가능한 연락처입니다.");
       setContactDuplicate(false);
       setContactVerified(true);
     }
   }
3. 인증 상태 표시:
   - 미확인: 기본 border
   - 중복: border-state-error + "이미 등록된 연락처입니다." 에러 텍스트
   - 확인: border-state-success + <Check className="text-state-success"/> 아이콘
4. contactVerified 상태: boolean (중복 없음 확인 시 true)

데이터:
- contactDuplicate: boolean
- contactVerified: boolean
- supabase.from("staff").select("id").eq("phone", contact).eq("branchId", ...)

인터랙션:
- [중복 확인] 클릭 → supabase 쿼리 → 결과에 따라 상태 업데이트
- 연락처 변경 시 → contactVerified = false (재확인 필요)
- 저장하기 클릭 → contactDuplicate=true면 저장 차단

사용 유틸:
- supabase from '@/lib/supabase'
- toast from 'sonner'
- getBranchId from '@/lib/getBranchId'
- lucide-react: Check, AlertCircle
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- 연락처 입력 후 [중복 확인] 버튼 클릭
- 선택적 기능 (필수 아님, P2 우선순위)

### 필수 데이터
| 블록 | 테이블 | 조건 |
|------|--------|------|
| 연락처 중복 확인 | `staff` | `phone = contact AND branchId = ?` |

### 인터랙션 (User Actions)
1. 연락처 입력 → [중복 확인] 클릭
2. 중복 → `toast.error("이미 등록된 연락처입니다.")` + 에러 border
3. 사용 가능 → `toast.success("사용 가능한 연락처입니다.")` + 확인 아이콘
4. 연락처 수정 → 확인 상태 리셋 (재확인 필요)

### 비즈니스 룰
- 같은 지점 내 연락처 중복 방지
- 중복 확인은 선택적 (필수 아님)
- 연락처 변경 후 저장 시 중복 상태 재확인 권장
- `toast.error`로 중복 알림, 저장 버튼은 차단하지 않음 (경고만)

### 에지 케이스
- 연락처 미입력 상태에서 [중복 확인] → 유효성 에러 먼저 표시
- 네트워크 오류 → `toast.error("확인 중 오류가 발생했습니다.")`

### 접근성 (A11y)
- 중복 확인 결과 `aria-live="polite"` 영역에 표시
- 확인/에러 아이콘 `aria-hidden="true"` (텍스트로 의미 전달)

### 연결 화면
- 이전: 02-입력중
- 다음: 04-저장중 (중복 없음 확인 후 저장) / 06-검증에러 (중복 발견)
