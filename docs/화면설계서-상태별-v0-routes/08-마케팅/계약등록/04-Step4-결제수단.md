# SCR-075 전자계약 등록 — 상태: Step4 결제수단

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-075 |
| 상태 코드 | `step4-payment` |
| 경로 | `/contracts/new` |
| 역할 | 센터장 / 매니저 / FC |
| 우선순위 | P0 |
| 이전 상태 | `03-Step3-할인적용` |
| 다음 상태 | `05-Step5-서명` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind CSS 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-075 전자계약 등록 — 상태: Step 4 결제 수단

파일: src/app/(marketing)/contracts/new/page.tsx

레이아웃 (grid grid-cols-1 lg:grid-cols-2 gap-xl animate-in):

좌측 (space-y-xl):

FormSection "결제 수단 선택 (복수 선택 가능)":
- 4개 버튼 그룹 (grid grid-cols-2 gap-md):
  - 카드(CreditCard) / 현금(Banknote) / 마일리지(Coins) / 계좌이체(ArrowRightLeft)
  - 선택됨: border-accent bg-accent-light text-accent border-2
  - 미선택: border-line bg-surface text-content-secondary hover:border-accent/50
  - 클릭 → toggleMethod(id): Set 토글 처리
- 선택된 수단별 금액 입력 (mt-md space-y-sm):
  - 각 수단명(w-[72px]) + 금액 input(number, text-right, pr-[32px]) + "원"
  - paymentAmounts[method.id] 관리
  - 합계 검증: paymentTotal vs finalPrice
    - 일치: "금액이 일치합니다 ✓" (text-green-600)
    - 불일치: "금액 합계가 일치하지 않습니다" (text-state-error)

FormSection "결제 금액":
- 상품 합계: formatKRW(totalPrice)
- 할인(N%): - formatKRW(discountAmount) (text-state-error)
- 최종 결제 금액: formatKRW(finalPrice) (text-primary text-Heading-1 font-bold)

우측 — 결제 대기 UI:
- flex flex-col items-center justify-center p-xxl bg-surface rounded-xl border-2 border-dashed border-line
- CreditCard 아이콘 (w-[80px] h-[80px] bg-accent-light rounded-full)
- h3 "결제 대기 중"
- p "단말기를 통해 결제를 진행하거나, 아래 버튼을 눌러 결제 처리를 완료하세요."
- [결제 실행하기] 버튼 (w-full py-xl bg-accent text-white rounded-button font-bold) → nextStep()

하단 내비게이션:
- [← 이전] → prevStep() → step=3
- (우측 결제 실행 버튼이 nextStep 역할)

데이터:
- PAYMENT_METHODS = [{ id:'card', label:'카드', icon:CreditCard }, { id:'cash', label:'현금', icon:Banknote }, { id:'mileage', label:'마일리지', icon:Coins }, { id:'transfer', label:'계좌이체', icon:ArrowRightLeft }]
- selectedMethods: Set<string> (기본: new Set(['card']))
- paymentAmounts: Record<string, number> = { card:0, cash:0, mileage:0, transfer:0 }
- paymentTotal = Array.from(selectedMethods).reduce(sum + paymentAmounts[id], 0)
- paymentMatchesOk = paymentTotal === finalPrice && selectedMethods.size > 0

인터랙션:
- 수단 버튼 토글 → selectedMethods Set 업데이트 + 해제 시 금액 초기화
- 금액 input 변경 → paymentAmounts 업데이트 → 합계 검증
- [결제 실행하기] → nextStep() → step=5

사용 유틸:
- formatKRW from '@/lib/format'
- lucide-react: CreditCard, Banknote, Coins, ArrowRightLeft
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Step3에서 [다음 단계] 클릭 (시작일 유효성 통과)
- step=4 상태

### 필수 데이터
| 항목 | 소스 |
|------|------|
| finalPrice | totalPrice - discountAmount |
| selectedMethods | Set<string> (state) |
| paymentAmounts | Record<string, number> (state) |

### 인터랙션 (User Actions)
1. 결제 수단 버튼 클릭 → Set 토글 (복수 선택 가능)
2. 금액 input 입력 → paymentTotal 재계산 → 일치 여부 표시
3. [결제 실행하기] → step=5 (금액 일치 여부 관계없이 진행 가능)
4. [← 이전] → step=3

### 비즈니스 룰
- 복수 결제 수단 허용 (예: 카드 + 마일리지)
- 마일리지 단독 결제 시 마일리지 적립 제외 (doInsert 로직)
- 금액 불일치여도 [결제 실행] 가능 — 현장 처리 유연성 확보
- 실제 결제 처리는 POS 단말기 연동 (UI는 흐름 안내 역할)

### 에지 케이스
- 수단 선택 해제 시 해당 금액 자동 0 초기화
- 단독 선택 시 paymentMethod 동기화 (Set size=1 → paymentMethod=[...next][0])

### 접근성 (A11y)
- 수단 버튼: `role="checkbox"` + `aria-checked={selectedMethods.has(id)}`
- 금액 input: `aria-label="{method.label} 결제 금액"`

### 연결 화면
- 이전: `03-Step3-할인적용`
- 다음: `05-Step5-서명`
