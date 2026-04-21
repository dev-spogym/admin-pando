# SCR-075 전자계약 등록 — 상태: Step2 상품선택

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-075 |
| 상태 코드 | `step2-product-select` |
| 경로 | `/contracts/new` |
| 역할 | 센터장 / 매니저 / FC |
| 우선순위 | P0 |
| 이전 상태 | `01-Step1-회원선택` |
| 다음 상태 | `03-Step3-할인적용` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind CSS 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-075 전자계약 등록 — 상태: Step 2 상품 선택

파일: src/app/(marketing)/contracts/new/page.tsx

레이아웃 (grid grid-cols-1 lg:grid-cols-3 gap-xl animate-in):

좌측 영역 (lg:col-span-2 space-y-lg):
- stepErrors[2] 오류 메시지 (AlertCircle + 메시지)
- TabNav tabs: 시설이용(facility) / 1:1수업(pt) / 그룹수업(gx) / 옵션(option)
  - activeCategory state로 탭 전환
- 상품 grid (grid-cols-1 md:grid-cols-2 gap-md):
  - 각 상품 카드: button w-full text-left p-lg border rounded-xl
    - already (이미 선택됨): border-accent bg-accent-light cursor-default disabled
    - 미선택: border-line hover:border-accent cursor-pointer
    - 상단: 상품명(font-bold) + 아이콘(선택됨=CheckCircle2/미선택=Plus)
    - 하단: 기간(N일) + 가격(formatKRW)
    - 클릭 → setSelectedProducts([...selectedProducts, p]), clearStepError(2)

우측 장바구니 (bg-primary-light rounded-xl p-xl sticky top-xl):
- "장바구니 {N}" 헤더
- 선택 상품 목록 (max-h-[360px] overflow-auto):
  - 각 항목: 상품명 + formatKRW(price) + Trash2(제거) 버튼
  - 빈 경우: "상품을 선택해주세요." (text-center)
- border-t 합계: "총 합계" + formatKRW(totalPrice)

하단 내비게이션:
- [← 이전] → prevStep() → step=1
- [다음 단계 →] → nextStep() → validateStep(2): selectedProducts.length===0 → stepErrors[2]

데이터:
- type ProductRow = { id: string, name: string, price: number, duration: number }
- products: Record<string, ProductRow[]> = { facility:[], pt:[], gx:[], option:[] }
- supabase.from('products').select('id,name,price,duration,category').eq('branchId', getBranchId())
- DB category 매핑: MEMBERSHIP→facility / PT→pt / GX→gx / 그외→option
- totalPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0)

인터랙션:
- 탭 클릭 → setActiveCategory(key)
- 상품 카드 클릭 → 장바구니 추가 (중복 방지)
- Trash2 버튼 → setSelectedProducts(prev.filter(_, i) => i !== idx)
- [다음 단계] → validateStep(2) → step=3

사용 유틸:
- formatKRW from '@/lib/format'
- supabase from '@/lib/supabase'
- TabNav from '@/components/common/TabNav'
- lucide-react: CheckCircle2, Plus, Trash2, AlertCircle
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Step1에서 회원 선택 후 [다음 단계] 클릭
- step=2 상태

### 필수 데이터
| 블록 | 테이블 | 조건 |
|------|--------|------|
| 상품 목록 | `products` | `branchId = ?` |
| 카테고리 분류 | `products.category` | MEMBERSHIP/PT/GX → 탭 매핑 |

### 인터랙션 (User Actions)
1. 탭 전환 → 카테고리별 상품 목록 변경
2. 상품 카드 클릭 → 장바구니 추가 + clearStepError(2)
3. 장바구니 Trash2 → 해당 상품 제거
4. [← 이전] → step=1 (선택 내용 유지)
5. [다음 단계] → 상품 0개면 `stepErrors[2]` 세팅 + 진행 차단

### 비즈니스 룰
- 동일 상품 중복 선택 불가 (already 체크로 disabled 처리)
- 복수 상품 선택 가능 (시설 + PT 복합 계약)
- 총 기간 = 선택 상품 중 최대 duration (computedEndDate 계산에 사용)

### 에지 케이스
- 특정 카테고리 상품 0개 → 해당 탭 내 빈 grid (별도 빈상태 없음)
- 상품 fetch 실패 → 빈 목록 + 장바구니 비어있음

### 접근성 (A11y)
- 탭 `role="tablist"` + 각 탭 `role="tab"` + `aria-selected`
- 상품 카드 `aria-disabled={!!already}`

### 연결 화면
- 이전: `01-Step1-회원선택`
- 다음: `03-Step3-할인적용`
