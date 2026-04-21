# SCR-075 전자계약 — 상태: Step 3 계약 조건

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-075 |
| 상태 코드 | `step3-contract-terms` |
| 경로 | `/contracts/new` |
| 역할 | owner, manager, fc |
| 우선순위 | P0 |
| 이전 상태 | `02-Step2-상품선택` |
| 다음 상태 | `04-Step4-약관동의` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 CRM 데스크톱 페이지를 작성하라.
화면: SCR-075 전자계약 — Step 3: 계약 조건

파일: src/app/(marketing)/contracts/new/page.tsx

Stepper: Step 3 활성 (1,2번 체크마크, 3번 blue)

Step 3 컨텐츠 (bg-white rounded-xl border p-6):
- 제목: "계약 조건을 설정하세요" (text-lg font-semibold mb-4)

폼 필드:
1. 계약 시작일 (DatePicker, 필수)
   - label: "계약 시작일" required
2. 계약 금액 (NumberInput, 필수)
   - 선택된 상품 기본가 자동 입력, 수정 가능
   - label: "계약 금액 (원)" required
3. 결제 방식 (Select, 필수)
   - 옵션: 일시불 / 분할 2회 / 분할 3회 / 분할 6회
4. 특이사항 (Textarea, 선택)
   - rows=3, placeholder="특이사항이 있으면 입력해주세요"

자동 계산 표시 (bg-gray-50 rounded-lg p-4 mt-4):
- "계약 종료일: {endDate}" (상품 기간 기준 자동 계산)
- 횟수제: "총 {count}회"

하단 버튼:
- "이전" variant=outline
- "다음" variant=primary disabled={!isStep3Valid}

사용 컴포넌트:
- Button, Select
- date-fns addDays/addMonths
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Step 2에서 상품 선택 후 "다음"

### 인터랙션 (User Actions)
1. 시작일 변경 → 종료일 자동 갱신
2. 결제 방식 선택 → 분할 정보 표시
3. "이전" → Step 2 (선택 유지)
4. "다음" → 필수 필드 검증 후 Step 4

### 비즈니스 룰
- 계약 시작일 < 오늘 불가
- 금액은 0 이상 양수
- 분할 결제 시 회차별 금액 자동 계산 표시

### 연결 화면
- 이전: `02-Step2`
- 다음: `04-Step4-약관동의`
