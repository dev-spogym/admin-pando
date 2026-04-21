# SCR-075 전자계약 등록 — 상태: Step5 서명

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-075 |
| 상태 코드 | `step5-signature` |
| 경로 | `/contracts/new` |
| 역할 | 센터장 / 매니저 / FC |
| 우선순위 | P0 |
| 이전 상태 | `04-Step4-결제수단` |
| 다음 상태 | `06-저장중` (계약 완료 클릭) / `07-완료` (저장 성공) |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind CSS 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-075 전자계약 등록 — 상태: Step 5 확인 및 서명

파일: src/app/(marketing)/contracts/new/page.tsx

레이아웃 (space-y-xl animate-in):

안내 배너:
- bg-accent-light border-accent/30 rounded-xl p-lg
- CheckCircle2(text-accent) + "계약 내용을 최종 확인해주세요." + 부제목

계약 내용 요약 카드 (bg-surface rounded-xl border border-line p-xl shadow-card):
- grid grid-cols-1 md:grid-cols-2 gap-xl
- 회원 정보: 이름 + 연락처
- 계약 조건: 시작일 + 종료일 + 결제 수단
- 상품 목록 (md:col-span-2): 각 상품명 + 가격
- 금액 내역 (md:col-span-2): 원가 + 할인(-N%) + 최종 결제 금액

전자서명 카드 (bg-surface rounded-xl border border-line p-xl shadow-card space-y-xl):
- h3 "전자서명"
- signatureError 배너 (있을 때): AlertCircle + 오류 메시지

고객 서명 영역:
- 제목 "고객 서명" + 완료 시 CheckCircle2(text-state-success) "서명 완료"
- <SignaturePad onSign={(dataUrl) => { setCustomerSignatureDataUrl(dataUrl); setSignatureError(''); }} height={180} />

센터장 서명 영역:
- 제목 "센터장 서명" + 완료 시 CheckCircle2 "서명 완료"
- <SignaturePad onSign={(dataUrl) => { setManagerSignatureDataUrl(dataUrl); setSignatureError(''); }} height={180} />

하단 내비게이션:
- [← 이전] → prevStep() → step=4
- 우측: [PDF 다운로드] + [계약 완료 확인] 버튼
  - PDF: toast.info('인쇄 다이얼로그에서 PDF로 저장을 선택하세요.') → setTimeout(window.print, 300)
  - 계약 완료: handleContractSave() → 06-저장중

handleContractSave 유효성:
- !selectedMember → toast.error('회원을 선택해주세요.')
- !customerSignatureDataUrl || !managerSignatureDataUrl → setSignatureError('고객 서명과 센터장 서명을 모두 완료해주세요.')
- isSaving → return (중복 방지)

데이터:
- customerSignatureDataUrl: string | null
- managerSignatureDataUrl: string | null
- signatureError: string
- isSaving: boolean

사용 유틸:
- SignaturePad from '@/components/common/SignaturePad'
- uploadFile from '@/lib/uploadFile'
- supabase from '@/lib/supabase'
- lucide-react: CheckCircle2, AlertCircle, FileText
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Step4 [결제 실행하기] 클릭 후 step=5
- 계약 내용 최종 확인 + 서명 단계

### 필수 데이터
| 항목 | 소스 |
|------|------|
| 계약 요약 | selectedMember + selectedProducts + contractDetails + 금액 계산 |
| 서명 데이터 | SignaturePad onSign 콜백 → dataUrl |
| isSaving | boolean state (중복 저장 방지) |

### 인터랙션 (User Actions)
1. SignaturePad 서명 → `customerSignatureDataUrl` / `managerSignatureDataUrl` 업데이트
2. [계약 완료 확인] → `handleContractSave()` → `06-저장중`
3. [PDF 다운로드] → `window.print()` 팝업
4. [← 이전] → step=4

### 비즈니스 룰
- 고객 서명 + 센터장 서명 모두 필수 (미완료 시 signatureError 표시)
- 저장 성공 시 `contracts` + `sales` 테이블 동시 INSERT
- 마일리지 자동 적립: `accruePoints(memberId, finalPrice)` (마일리지 결제 단독 제외)
- 회원 상태 + 이용권 기간 자동 업데이트: `updateMembershipPeriod`
- 저장 완료 → `toast.success("계약이 완료되었습니다.")` → `moveToPage(985, { id: selectedMember.id })`

### 에지 케이스
- 중복 결제 감지: `checkDuplicatePayment(memberId, finalPrice)` → ConfirmDialog 오픈
- 서명 이미지 업로드 실패 → toast.error + isSaving=false (계약 미저장)
- isSaving=true 중 [완료] 재클릭 → return (무시)

### 접근성 (A11y)
- SignaturePad: `aria-label="고객 서명 패드"` / `aria-label="센터장 서명 패드"`
- signatureError: `role="alert"` live region

### 연결 화면
- 이전: `04-Step4-결제수단`
- 다음: `06-저장중` → `07-완료`
