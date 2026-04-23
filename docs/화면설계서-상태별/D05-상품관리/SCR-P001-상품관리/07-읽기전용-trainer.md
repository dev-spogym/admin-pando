# SCR-P001 상품 관리 — 상태: 읽기 전용(trainer/fc/staff/front) (07-읽기전용-trainer)

> 델타 문서. 공통 스펙은 `00-기본화면.md` 상속.

## 메타

| 항목 | 값 |
|------|----|
| 상태 코드 | `products-readonly-trainer` |
| 다이어그램 노드 | `F7_권한RBAC.md` (trainer/fc/staff/front 분기) |
| 이전 상태 | `01-로딩` |
| 다음 상태 | `06-패널열림`(읽기 전용 variant) |
| 역할 조건 | role ∈ `trainer`, `fc`, `staff`, `front` (읽기 허용, 편집 차단) |

## 상태 진입 조건
- `useProductsQuery` 성공 & 데이터 존재
- `!can(role, 'edit')` (편집 차단 역할)
- trainer: 상품 조회 가능, 가격이력 조회 가능
- fc: 조회 + 가격이력 조회
- staff/front: 최소 정보(이름/가격/상태) 조회

## 비주얼 델타

```
┌─PageHeader  [상품목록|분류관리]                         [Excel]┐
│  ("+ 상품 등록" "전 지점 배포" 비렌더)                          │
│  상단에 "🔒 읽기 전용" 배지 (small, gray-100)                  │
├──────────────────────────────────────────────────────────────┤
│ StatCardGrid: 실제 값 표시 (읽기 전용)                         │
├──────────────────────────────────────────────────────────────┤
│ TabNav/필터/검색: 활성 (허용)                                  │
├──────────────────────────────────────────────────────────────┤
│ 테이블: 정상 렌더                                              │
│  행 클릭 → 읽기 전용 패널 (SCR-P003 06-읽기전용)               │
│  커서 cursor-pointer 유지 (조회 목적)                          │
└──────────────────────────────────────────────────────────────┘
```

| 요소 | 값/동작 |
|---|---|
| + 상품 등록 | 비렌더 |
| 전 지점 배포 | 비렌더 |
| Excel | 렌더 (다운로드 허용) |
| 분류 관리 탭 | 렌더 (조회만, CRUD 버튼 hidden) |
| 읽기 전용 배지 | PageHeader 우측 `bg-gray-100 text-gray-600 text-[10px] rounded px-2 py-0.5` |
| 행 클릭 | 허용 → 읽기 전용 패널 |
| 패널 내 저장/복사/삭제 | 비렌더 |
| 가격 이력 버튼 | trainer/fc 에서 표시, staff/front 는 비렌더 |

## 역할별 차이

| 역할 | 상세 |
|---|---|
| trainer | 조회 + 가격이력 조회, 패널 readOnly, 담당 회원 상품만 필터 가능(옵션) |
| fc | 조회 + 가격이력 + 상담 컨텍스트 링크 |
| staff | 최소 필드만 표시 (가격, 상태), 패널 간소화 variant |
| front | 결제 시 필요한 상품 정보만 (현금가/카드가/기간/횟수), 그 외 collapse |

## 상태 고유 인터랙션
- 모든 CRUD 버튼 비렌더 + 클릭 시 toast(방어적) "권한이 없습니다".
- 필터/검색/정렬/엑셀은 모두 허용.
- 행 클릭 시 패널은 읽기 전용(SCR-P003 `06-읽기전용`).
- 분류 관리 탭 진입 시 폼 입력 가능해 보이지만 저장 버튼 비렌더.

## 비즈니스 룰 델타
- **권한 API 호출 가드**: 서버 RLS가 INSERT/UPDATE/DELETE 차단. 클라 가드는 UX 용도만.
- **ACL 로깅**: 읽기 전용 역할이 권한 초과 액션 시도 시 `AUDIT.PRODUCT_FORBIDDEN_ATTEMPT` 기록.
- **Excel 다운로드**: 허용하되 제한된 컬럼만(가격/기간/횟수/상태) export.
- **URL 조작**으로 `?edit=1` 진입해도 서버 RLS로 차단.

## 에지 케이스
- owner → trainer 로 역할 다운그레이드된 세션 → React Query cache invalidate 필요. `useAuthStore` 변경 시 products 리스트 refetch.
- trainer에게 가격 이력이 개인정보를 노출하는지 여부 → 센터 정책에 따라 가격 이력 버튼 hidden 가능.
- staff가 front로 전환 → 컬럼 세트가 더 축소(가격 중심).

## 바이브코딩 프롬프트 (델타)

```
상태: SCR-P001 / 07-읽기전용-trainer

변경:
- PageHeader actions 조건부 렌더 매트릭스
- PageHeader 오른쪽에 "🔒 읽기 전용" 배지 (bg-gray-100 text-gray-600 text-[10px] rounded px-2 py-0.5)
- 행 클릭 → ProductDetailPanel readOnly=true
  (내부 input readOnly, select disabled, 저장/복사/삭제 hidden)
- Excel COLS 축소 (trainer: 6컬럼 / staff,front: 4컬럼)
- 가격이력 버튼: can(role,'viewPriceHistory') true 시만
- 분류 관리 탭: 저장 버튼 hidden (조회 UX)
- ACL audit.forbidden-attempt 이벤트 훅

접근성:
- 배지 aria-label="이 화면은 읽기 전용입니다"
- hidden 버튼은 DOM 제거
```

## TC 후보

| TC ID | 설명 | Given | When | Then |
|---|---|---|---|---|
| TC-P001-07-01 | trainer 진입 | role=trainer | - | 배지, 등록 버튼 없음 |
| TC-P001-07-02 | trainer 패널 | 행 클릭 | - | readOnly, 저장 hidden |
| TC-P001-07-03 | trainer 가격이력 | 패널 | 가격이력 클릭 | DLG-P003 조회 모달 |
| TC-P001-07-04 | fc 조회 | role=fc | - | readonly + 모든 컬럼 조회 |
| TC-P001-07-05 | staff 축소 | role=staff | Excel | 4컬럼만 |
| TC-P001-07-06 | front 축소 | role=front | - | 최소 필드만 |
| TC-P001-07-07 | URL 조작 차단 | role=fc | `?edit=1` | 서버 RLS 403 |
| TC-P001-07-08 | 역할 다운그레이드 | owner→trainer | - | 캐시 invalidate |
| TC-P001-07-09 | 분류 탭 조회 | role=trainer | 분류 탭 | 저장 버튼 없음 |

## 다이어그램 링크
- `F7_권한RBAC.md` (trainer/fc/staff/front 분기)
- SCR-P003 `06-읽기전용.md`
- `R1_역할화면_매트릭스.md`
