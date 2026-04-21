# SCR-075 전자계약 등록 — 상태: Step3 할인적용

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-075 |
| 상태 코드 | `step3-discount` |
| 경로 | `/contracts/new` |
| 역할 | 센터장 / 매니저 / FC |
| 우선순위 | P0 |
| 이전 상태 | `02-Step2-상품선택` |
| 다음 상태 | `04-Step4-결제수단` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind CSS 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-075 전자계약 등록 — 상태: Step 3 기간/금액 (할인 설정)

파일: src/app/(marketing)/contracts/new/page.tsx

레이아웃 (space-y-xl animate-in):

FormSection "계약 기간" (columns={2}):
- 시작일 (date input, required):
  - stepErrors[3] 시 ring-1 ring-state-error
  - onChange → clearStepError(3)
- 종료일 (readOnly, 자동 계산):
  - computedEndDate = 시작일 + max(상품 duration) + serviceDays
  - Info 아이콘 + "시작일 + 상품기간 자동 계산 (직접 수정 불가)"
- 서비스 일수 추가 (number input):
  - value={contractDetails.serviceDays} onChange → 종료일 재계산

FormSection "할인 설정" (columns={2}):
- 할인 유형 Select: 없음(기본) / 재등록 / 신규 / 이벤트 / 관리자 재량
- 할인율 input (number, 0~50, disabled when !discountType):
  - max 50% 초과 시: discountError = "최대 할인율은 50%입니다."
  - discountError 시 ring-1 ring-state-error + 오류 메시지
- 할인 사유 input (disabled when !discountType)
- 할인 적용 요약 (discountType && discountRateNum > 0 시 표시):
  - bg-primary-light p-lg space-y-sm border
  - 원가 / 할인(-N%) / 최종가(text-primary)

FormSection "실적 담당자" (columns={1}):
- Select: 담당자 없음 + staff 목록
- onChange → setSalesStaffId, setSalesStaffName

FormSection "특약 및 메모" (columns={1}):
- Textarea rows={4} placeholder="계약 시 별도 협의된 내용"

안내 배너:
- bg-accent-light border-accent/30 rounded-xl p-md
- Info 아이콘 + "선택하신 상품의 유효기간과 서비스 일수를 합산하여 종료일이 자동으로 계산됩니다."

계산 로직:
- discountRateNum = Math.min(50, Math.max(0, parseFloat(discountRate)||0))
- discountAmount = Math.round(totalPrice × (discountRateNum/100))
- finalPrice = totalPrice - discountAmount
- computedEndDate = useMemo([startDate, serviceDays, selectedProducts])

인터랙션:
- 할인 유형 미선택 시 → 할인율/사유 input disabled
- [← 이전] → step=2
- [다음 단계] → validateStep(3): !contractDetails.startDate → stepErrors[3]

사용 유틸:
- FormSection from '@/components/common/FormSection'
- Select, Textarea from '@/components/ui'
- formatKRW from '@/lib/format'
- lucide-react: Info, AlertCircle
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Step2에서 상품 선택 후 [다음 단계] 클릭
- step=3 상태

### 필수 데이터
| 항목 | 소스 |
|------|------|
| selectedProducts | Step2 state |
| totalPrice | selectedProducts.reduce |
| staffs | supabase.from('staff') |
| contractDetails | 로컬 state |

### 인터랙션 (User Actions)
1. 시작일 변경 → computedEndDate 자동 재계산
2. 서비스 일수 변경 → computedEndDate 재계산
3. 할인 유형 선택 → 할인율/사유 활성화
4. 할인율 51% 이상 입력 → discountError 표시 + 50% 강제 상한
5. 담당자 선택 → salesStaffId/Name 업데이트
6. [다음 단계] → validateStep(3) → step=4

### 비즈니스 룰
- 할인율 최대 50% 제한 (handleDiscountRateChange 내 검증)
- 종료일 자동 계산 (직접 입력 불가 — readOnly)
- 할인 사유는 discount 타입 선택 시만 입력 가능
- 서비스 일수는 추가 혜택 일수 (무료 서비스 증정)

### 에지 케이스
- 시작일 미입력 후 [다음] → stepErrors[3] + 입력란 border-state-error
- discountRate > 50 → 저장 불가 + discountError 메시지

### 접근성 (A11y)
- 오류 input: `aria-invalid="true"` + `aria-describedby` 오류 메시지 id 연결

### 연결 화면
- 이전: `02-Step2-상품선택`
- 다음: `04-Step4-결제수단`
