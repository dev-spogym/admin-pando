# SCR-M002 회원 등록 — 상태: SMS 인증

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M002 |
| 상태 코드 | `new-sms-verify` |
| 경로 | `/members/new` |
| 역할 | primary / owner / manager / staff |
| 우선순위 | P1 |
| 이전 상태 | `02-입력중` ([SMS 인증] 클릭) |
| 다음 상태 | `02-입력중` (인증 완료) / `02-입력중` (취소) |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-M002 회원 등록 — 상태: SMS 인증 진행 중

파일: src/app/members/new/page.tsx (smsStep: 'sending' | 'verifying' | 'verified')

레이아웃:
- 폼 내 SMS 인증 인라인 패널 (연락처 필드 아래 슬라이드 다운)

컴포넌트 구조:
1. [SMS 발송 단계] (smsStep === 'sending')
   - "인증번호를 발송했습니다. 연락처: 010-xxxx-xxxx" (text-sm text-gray-500)
   - [재발송] 버튼 (outline, 60초 쿨다운 타이머)
   - 타이머: "재발송 가능: MM:SS" 카운트다운

2. [인증번호 입력 단계] (smsStep === 'verifying')
   - 인증번호 Input (6자리, maxLength=6, inputmode=numeric)
   - [확인] 버튼 (primary)
   - 타이머: "남은 시간: MM:SS" (5분 카운트다운, 0 되면 재발송 요청)
   - [취소] 링크 → smsStep = null, smsVerified = false

3. [인증 완료] (smsStep === 'verified' / smsVerified === true)
   - "✓ 인증이 완료되었습니다" (text-green-600)
   - 연락처 Input readonly 처리

데이터:
- smsStep: null | 'sending' | 'verifying' | 'verified'
- smsVerified: boolean
- verificationCode: string (6자리)
- timer: number (초 단위 카운트다운)
- cooldown: number (재발송 60초 쿨다운)

인터랙션:
- [SMS 인증] 클릭 → SMS API 호출 → smsStep='verifying' → 타이머 시작
- [확인] 클릭 → 코드 검증 API → 성공: smsVerified=true → 폼으로 복귀
- 타이머 0 → "인증 시간이 만료되었습니다. 재발송하세요" 인라인 에러
- [재발송] → 새 인증 코드 발송 + 타이머 리셋

사용 유틸:
- useInterval (타이머 카운트다운)
- toast from 'sonner'
- lucide-react: CheckCircle, Clock
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- 연락처 11자리 입력 완료 후 [SMS 인증] 버튼 클릭

### 필수 데이터
- 입력된 phone 번호 (SMS 발송 대상)
- 인증 코드 (서버 생성, 클라이언트에 직접 노출 안 함)

### 인터랙션 (User Actions)
1. [SMS 인증] → 인증번호 발송 + 입력창 노출
2. 인증번호 6자리 입력 → [확인] → 검증
3. 인증 성공 → smsVerified=true + 폼 계속
4. [재발송] → 새 코드 발송 (60초 쿨다운)
5. 타임아웃 → 재발송 안내

### 비즈니스 룰
- 인증 유효시간: 5분
- 재발송 쿨다운: 60초
- 최대 재발송 횟수: 5회 (초과 시 10분 잠금)
- 인증 완료 후 연락처 수정 시 인증 초기화

### 에지 케이스
- 잘못된 인증번호 → "인증번호가 일치하지 않습니다" 인라인 에러
- 타임아웃 → 입력창 비활성화 + 재발송 요청
- SMS 발송 실패 → 에러 토스트 + 재시도 옵션

### 접근성 (A11y)
- 타이머 `aria-live="polite"` + `role="timer"`
- 인증번호 Input `aria-label="SMS 인증번호 6자리 입력"` + `inputMode="numeric"`

### 연결 화면
- 이전: `02-입력중`
- 다음: `02-입력중` (인증 완료 또는 취소)
