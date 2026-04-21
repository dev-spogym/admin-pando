# SCR-P001 상품 관리 — 상태: 읽기 전용 (trainer)

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-P001 |
| 상태 코드 | `readonly-trainer` |
| 경로 | `/products` |
| 역할 | trainer, front |
| 우선순위 | P1 |
| 이전 상태 | `02-정상-데이터있음` (trainer 역할) |
| 다음 상태 | 행 클릭 → 패널(읽기 전용) |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 CRM 관리자 화면을 작성하라.
화면: SCR-P001 상품 관리 — 상태: 읽기 전용 (trainer/front 역할)

파일: src/app/products/page.tsx (hasPermission('canEditProduct')=false + 데이터 있음)

레이아웃:
- AppLayout + PageHeader (제목: "상품 관리")
- 우측 버튼 전체 숨김 (상품 등록, 전지점 배포, 상품 가져오기)
- DataTable: 액션 컬럼 숨김 (수정/삭제 버튼 없음)
- 행 클릭 → 패널 오픈 가능 (조회용)

구현:
const canEdit = hasPermission('canEditProduct') // false
// 조건부 렌더링으로 버튼 및 액션 컬럼 제거

사용 컴포넌트: AppLayout, PageHeader, DataTable, StatusBadge
사용 유틸: hasPermission, useAuthStore
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- 로딩 완료 + 데이터 있음 + `hasPermission('canEditProduct') = false`
- trainer, front 역할 진입 시

### 필수 데이터
- 동일 (`products`, `product_groups`)

### 인터랙션 (User Actions)
1. 탭/검색/필터 → 조회 가능
2. 행 클릭 → 패널 오픈 (읽기 전용 패널)

### 비즈니스 룰
- 상품 등록 / 전지점 배포 / 상품 가져오기 버튼 미노출
- DataTable 액션 컬럼(수정/삭제) 숨김

### 에지 케이스
- 권한 변경 시 페이지 새로고침 필요

### 연결 화면
- 행 클릭: SCR-P003 읽기 전용 패널
