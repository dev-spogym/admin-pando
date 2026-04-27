# SCR-075 전자계약 — 상태: Step 5 서명

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-075 |
| 상태 코드 | `step5-signature` |
| 경로 | `/contracts/new` |
| 역할 | owner, manager, fc |
| 우선순위 | P0 |
| 이전 상태 | `04-Step4-약관동의` |
| 다음 상태 | `06-계약완료` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 CRM 데스크톱 페이지를 작성하라.
화면: SCR-075 전자계약 — Step 5: 서명

파일: src/app/(marketing)/contracts/new/page.tsx

Stepper: Step 5 활성 (1,2,3,4 체크마크, 5번 blue)

Step 5 컨텐츠 (bg-white rounded-xl border p-6):
- 제목: "계약서에 서명해주세요" (text-lg font-semibold mb-4)

계약 요약 (bg-gray-50 rounded-lg p-4 mb-6):
- 회원: {member.name} ({member.phone})
- 상품: {product.name}
- 계약 기간: {startDate} ~ {endDate}
- 금액: {amount:,}원
- 결제 방식: {paymentType}

서명 패드:
<div className="border-2 border-dashed border-gray-300 rounded-xl h-40 flex items-center justify-center mb-4 bg-white cursor-crosshair">
  {signature ? (
    <img src={signature} alt="서명" className="max-h-32" />
  ) : (
    <p className="text-gray-400 text-sm">이곳에 서명해주세요</p>
  )}
</div>
- "서명 지우기" Button variant=ghost size=sm (서명 있을 때)
- 실제 canvas 서명 패드 구현 (react-signature-canvas 또는 직접 구현)

하단 버튼:
- "이전" variant=outline
- "계약 완료" variant=primary disabled={!signature} onClick={submitContract}

submitContract:
- POST /contracts (supabase insert)
- body: { memberId, productId, startDate, endDate, amount, paymentType, termsAgreed, signatureData, status: '서명완료' }
- 성공 → toast.success("계약이 완료되었습니다.") → `06-계약완료`
- 실패 → toast.error("계약 저장에 실패했습니다.")

사용 컴포넌트:
- AppLayout, PageHeader, Button
- supabase, toast, moveToPage
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Step 4 완료 후

### 인터랙션 (User Actions)
1. 서명 패드 드래그 → 서명 입력
2. "서명 지우기" → 서명 초기화
3. "계약 완료" → 서명 없으면 비활성, 있으면 API 호출

### 비즈니스 룰
- 서명 없으면 "계약 완료" 비활성
- `status = '서명완료'` 로 저장
- 계약 완료 후 회원 이용권 자동 생성 (서버 트리거)

### 에지 케이스
- API 실패: toast.error + Step 5 유지 (서명 데이터 보존)

### 연결 화면
- 이전: `04-Step4`
- 다음: `06-계약완료`
