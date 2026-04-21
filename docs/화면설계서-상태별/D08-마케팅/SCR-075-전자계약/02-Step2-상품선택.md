# SCR-075 전자계약 — 상태: Step 2 상품 선택

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-075 |
| 상태 코드 | `step2-product-select` |
| 경로 | `/contracts/new` |
| 역할 | owner, manager, fc |
| 우선순위 | P0 |
| 이전 상태 | `01-Step1-회원선택` |
| 다음 상태 | `03-Step3-계약조건` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 CRM 데스크톱 페이지를 작성하라.
화면: SCR-075 전자계약 — Step 2: 상품 선택

파일: src/app/(marketing)/contracts/new/page.tsx

Stepper: Step 2 활성 (2번 원 bg-blue-600, 1번 체크마크 bg-green-500)

Step 2 컨텐츠 (bg-white rounded-xl border p-6):
- 제목: "계약할 상품을 선택하세요" (text-lg font-semibold mb-4)
- 선택된 회원 칩: "{member.name}" (bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm mb-4)
- 상품 카드 그리드 (grid grid-cols-2 gap-3):
  각 카드: border rounded-xl p-4 cursor-pointer
  · 상품명 (font-semibold)
  · 유형 배지 (PT/GX/기간제/횟수제)
  · 가격 (text-lg font-bold text-blue-600)
  · 기간/횟수 정보 (text-sm text-gray-500)
  · 선택 시: border-2 border-blue-500 bg-blue-50 + 우상단 체크 아이콘

하단 버튼:
- "이전" Button variant=outline onClick={goToStep1}
- "다음" Button variant=primary disabled={!selectedProduct} onClick={goToStep3}

데이터:
- supabase.from('products').select('*').eq('branchId', branchId).eq('isActive', true)

사용 컴포넌트:
- AppLayout, PageHeader, Button
- supabase
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Step 1에서 회원 선택 후 "다음" 클릭

### 필수 데이터
| 블록 | 테이블 | 조건 |
|------|--------|------|
| 상품 목록 | `products` | branchId = ?, isActive = true |

### 인터랙션 (User Actions)
1. 상품 카드 클릭 → 선택
2. "이전" → Step 1 (회원 선택 유지)
3. "다음" → Step 3

### 비즈니스 룰
- 비활성 상품 표시 안 함
- 상품 미선택 시 "다음" 비활성

### 연결 화면
- 이전: `01-Step1`
- 다음: `03-Step3-계약조건`
