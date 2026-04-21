# SCR-071 메시지 발송 — 상태: SMS 카드 (채널=SMS)

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-071 |
| 상태 코드 | `channel-sms` |
| 경로 | `/message` |
| 역할 | 센터장 / 매니저 / FC |
| 우선순위 | P0 |
| 이전 상태 | `01-기본` (SMS/LMS 채널 선택) |
| 다음 상태 | `01-기본` (채널 변경) / 발송 미리보기 모달 |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind CSS 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-071 메시지 발송 — 상태: SMS/LMS 채널 선택됨 (sendForm.channel="sms")

파일: src/app/(marketing)/message/page.tsx

채널 선택 UI 변화 (sendForm.channel="sms"):
- SMS/LMS 라디오 카드: border-primary bg-primary-light text-primary shadow-sm (active 스타일)
- 알림톡, 앱 푸시: border-line bg-surface text-content-secondary (inactive)

채널 안내 문구:
- "SMS: 90자 이하 / LMS: 90자 초과 ~ 2,000자" (AlertCircle + text-content-secondary)

SMS/LMS 자동 전환 표시:
- contentLen <= 90: smsTypeLabel="SMS", effectiveCost=70원/건
- contentLen > 90: smsTypeLabel="LMS", effectiveCost=30원/건

예상 비용 영역:
- "SMS 70원/건" 또는 "LMS 30원/건" + 수신자 수 + 예상 총 비용
- contentLen 변화 시 실시간 업데이트

메시지 글자수 표시:
- {contentLen} / 2,000자 (maxLen=2000)
- smsTypeLabel 배지 병기: "(SMS)" 또는 "(LMS)"
- contentLen > 2000: isOverLimit=true → border-error + "초과" 텍스트
- 글자수 게이지: 90자 기준선 표시 (SMS/LMS 경계)

글자수 초과 시:
- Textarea border: border-error
- 글자수 게이지 bg-error
- [메시지 발송] 버튼: disabled={isOverLimit}

비용 계산 로직:
- effectiveCost = contentLen > 90 ? 30 : 70  (channel==="sms" 시)
- totalCost = recipientCount × effectiveCost

데이터:
- sendForm.channel = "sms"
- contentLen = sendForm.content.length
- smsTypeLabel: "SMS" | "LMS" | null (sms 채널일 때만)
- effectiveCost: number
- maxLen = 2000 (CHANNEL_CONFIG.sms.maxLen)

인터랙션:
- 메시지 입력 → 90자 기준 SMS/LMS 자동 판단
- 채널 변경 → "kakao" 또는 "push" → 01-기본 / 03-카카오톡카드
- [메시지 발송] → isOverLimit 시 disabled → 정상 시 PreviewModal

사용 유틸:
- cn from '@/lib/utils'
- formatNumber from '@/lib/format'
- lucide-react: Smartphone, AlertCircle
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- 발송 채널 라디오에서 "SMS/LMS" 선택
- `setSendForm(prev => ({ ...prev, channel: "sms" }))`

### 필수 데이터
| 항목 | 계산 |
|------|------|
| smsTypeLabel | contentLen > 90 ? "LMS" : "SMS" |
| effectiveCost | contentLen > 90 ? 30 : 70 |
| totalCost | recipientCount × effectiveCost |

### 인터랙션 (User Actions)
1. 메시지 90자 이내 입력 → "SMS 70원/건" 표시
2. 메시지 91자 이상 입력 → "LMS 30원/건" 자동 전환
3. 2000자 초과 → isOverLimit=true → [발송] 버튼 disabled
4. [메시지 발송] → PreviewModal (isOverLimit=false 시)

### 비즈니스 룰
- SMS = 90자 이하, 70원/건
- LMS = 90자 초과 ~ 2000자, 30원/건
- 2000자 초과 = 발송 불가 (버튼 disabled)
- 변수(`#{이름}` 등) 포함 시 실제 발송 시 치환되어 글자수 달라질 수 있음

### 에지 케이스
- 정확히 90자: SMS
- 정확히 91자: LMS 전환
- 수신자 0명 + 전체 미선택: 발송 버튼 disabled

### 접근성 (A11y)
- 글자수 표시: `aria-live="polite"` (실시간 업데이트)

### 연결 화면
- 이전: `01-기본`
- 다음: PreviewModal → 발송 완료 → `01-기본`
