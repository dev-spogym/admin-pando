# SCR-075 전자계약 — 상태: Step 4 약관 동의

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-075 |
| 상태 코드 | `step4-terms-agree` |
| 경로 | `/contracts/new` |
| 역할 | owner, manager, fc |
| 우선순위 | P0 |
| 이전 상태 | `03-Step3-계약조건` |
| 다음 상태 | `05-Step5-서명` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 CRM 데스크톱 페이지를 작성하라.
화면: SCR-075 전자계약 — Step 4: 약관 동의

파일: src/app/(marketing)/contracts/new/page.tsx

Stepper: Step 4 활성 (1,2,3 체크마크, 4번 blue)

Step 4 컨텐츠 (bg-white rounded-xl border p-6):
- 제목: "약관에 동의해주세요" (text-lg font-semibold mb-4)

약관 목록:
1. 전체 동의 (굵은 체크박스, border-b pb-3 mb-3)
2. [필수] 서비스 이용약관 (체크박스 + "보기" 링크)
3. [필수] 개인정보 수집 및 이용 동의 (체크박스 + "보기" 링크)
4. [필수] 환불 및 취소 정책 동의 (체크박스 + "보기" 링크)
5. [선택] 마케팅 정보 수신 동의 (체크박스)

각 항목: flex items-center gap-3 py-2
- Checkbox (w-5 h-5)
- label text-sm
- [필수] 배지: text-xs text-red-500 font-medium
- "보기": text-xs text-blue-500 underline cursor-pointer

약관 내용 펼침: 각 "보기" 클릭 시 아코디언 확장
- bg-gray-50 rounded-lg p-4 text-xs text-gray-600 leading-relaxed

하단 버튼:
- "이전" variant=outline
- "다음" variant=primary disabled={!allRequiredChecked}

구현:
- allRequiredChecked: 필수 3개 모두 체크 시 활성
- 전체 동의: 4개 모두 체크/해제
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Step 3 완료 후

### 인터랙션 (User Actions)
1. 전체 동의 체크 → 모두 선택
2. 개별 체크 → 전체 동의 상태 업데이트
3. "보기" 클릭 → 약관 내용 아코디언
4. "다음" → 필수 약관 미동의 시 비활성

### 비즈니스 룰
- 필수 약관 3개 모두 동의해야 Step 5 진행 가능
- 선택 약관은 마케팅 동의 여부로 저장

### 연결 화면
- 이전: `03-Step3`
- 다음: `05-Step5-서명`
