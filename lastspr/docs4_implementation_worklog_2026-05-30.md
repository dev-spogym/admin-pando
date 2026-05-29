# docs4 구현 정합성 작업 기록 (2026-05-30)

## 작업 원칙

- 기준 문서: `docs4/V1`, 공통 정책은 `docs4/_공통`, `docs4/_정책확인필요.md`, `docs4/핏지니_정책.md`.
- `docs/admin`은 참고가 필요한 경우에만 별도 확인하고, 구현 기준으로 우선하지 않는다.
- 단순 라벨 맞추기나 임시 숨김 처리로 끝내지 않고, 화면 진입 경로, 상태, 예외, DB 연결, 후속 동작을 함께 맞춘다.
- 어색하거나 즉시 결정하기 어려운 항목은 이 파일에 기록해 사용자가 한 번에 검토할 수 있게 한다.

## 1차 자동 매핑 결과

- docs4/V1 화면/다이얼로그 heading 추출: 212개
- docs4/V1에서 URL 경로가 명시된 항목: 99개
- 현재 `src/app` 구현 route: 118개

### 우선 확인이 필요한 route 중복

| route | docs4 기준 항목 | 판단 |
|---|---|---|
| `/body-composition` | D02 `SCR-M006 체성분 관리`, D11 `SCR-I006 체성분 통합 관리`, D11 `DLG-I003 체성분 수기 등록` | 같은 route에 개인 화면과 통합 운영 화면이 함께 배정되어 혼선 가능. 현재 구현은 D02 개인 화면 중심. |
| `/message/auto-alarm` | D08 `SCR-072 자동 알림 설정`, `SCR-072A 자동알림 운영현황` | 단일 route 안에서 설정/운영현황 탭 또는 분리 route 필요 여부 확인 필요. |
| `/locker` | D06 락커 관리 + 다수 DLG, D11 옷 락커 배정 DLG | D06 시설 락커와 D11 통합운영 락커 맥락이 섞이지 않도록 팝업 범위 확인 필요. |
| `/settings/permissions` | 권한 설정 + 권한 초기화/충돌/역할 생성/삭제/복사 DLG | 화면 내 DLG 완성도 점검 필요. |
| `/kpi` | D10 KPI 대시보드 + 목표 설정 DLG | 목표 설정 DLG 연결 여부 점검 필요. |

### docs4 route 표기상 바로 구현 route로 매핑하기 어려운 항목

| 항목 | 이유 |
|---|---|
| D01 `SCR-104 알림 센터` | route가 `(전체 화면 공통 - 상단 알림 아이콘)`으로 표기되어 별도 page가 아니라 layout component 기준. |
| D01 `DLG-000 세션 만료` | route가 `(전체 화면 공통 - 자동 감지)`로 표기되어 global dialog 기준. |
| D07 `SCR-061 직원 등록/수정` | route가 `/staff/new 또는 /staff/edit` 복합 표기. 실제 구현은 두 route로 분리됨. |

## 2026-05-30 진행

### 공통 레이아웃 퍼블리싱 노출 제거

- 수정 파일:
  - `src/components/layout/AppHeader.tsx`
  - `src/components/layout/AppSidebar.tsx`
  - `src/components/common/PageHeader.tsx`
- 기존 문제:
  - 운영 화면 상단에 `퍼블리싱 갤러리` 버튼이 남아 있음.
  - 사이드바 로고 아래 `Publishing Workspace` 문구가 남아 있어 실제 운영/검수 화면과 어긋남.
  - 모든 화면 PageHeader에 `Screen Publishing` chip이 노출됨.
- 조치:
  - 헤더의 퍼블리싱 갤러리 진입 버튼 제거.
  - 사이드바 보조 문구를 `운영 관리자`로 변경.
  - PageHeader의 `Screen Publishing` chip 제거.
- 검증:
  - `pnpm exec tsc --noEmit --pretty false` 통과.
  - `퍼블리싱 갤러리`, `Publishing Workspace` 노출 문자열이 레이아웃 코드에서 제거됨 확인.

### D02 / D11 체성분 route

- 수정 파일: `src/app/body-composition/page.tsx`
- docs4 기준:
  - `docs4/V1/D02-회원관리/회원관리.md`의 `SCR-M006 체성분 관리`
  - 사이드바 진입 시 회원 선택 필요
  - 회원 상세에서 진입한 경우 해당 회원 자동 선택
  - 회원 미선택 진입 시 "회원을 선택해주세요" 상태 필요
- 기존 문제:
  - `/body-composition`에 `memberId`가 없으면 1번 회원을 강제로 표시.
  - 사이드바에서 들어와도 개인 회원 화면과 "회원 상세로 돌아가기"가 표시.
  - 목표 데이터가 없는 회원에서 `member_goals.single()` 406 로그 발생.
  - 측정 기록 0~1건에서 그래프/변화요약 예외 가능.
- 조치:
  - `memberId` 없는 진입은 회원 선택 화면으로 변경.
  - 회원 검색/선택 후 `/body-composition?memberId=...`로 이동.
  - 개인 화면 상단에 `회원 변경`, `회원 상세로 이동` 동선 분리.
  - 목표 조회를 `maybeSingle()`으로 변경.
  - 기록 2건 미만 그래프 안내 처리.
- 검증:
  - `pnpm exec tsc --noEmit --pretty false` 통과.
  - `/body-composition`에서 개인 회원이 강제 표시되지 않음 확인.
  - 회원 선택 후 `memberId` query로 이동 확인.

## D03 결제/환불 문서 반영 확인

- `docs4/_정책확인필요.md`에 CRM 내부 승인번호/수납행 취소 후 미수 전환 정책 존재.
- `docs4/핏지니_정책.md`에 장바구니 내부 승인번호 1개, 상품별 수납 행, 수납행 취소와 상품 환불/계약 취소 분리 정책 존재.
- `docs4/V1/D03-매출관리/매출관리.md`와 `운영정책.md`에 `/sales/cancel-refund`, 수납행 취소, 미수금 전환, 내부 승인번호, 상품별 수납 행 기준 반영 확인.
- 현 단계 판단: 방금 구현한 분할 결제/부분 환불 정책은 docs4에 이미 반영된 상태로 보며, 추가 문서 수정은 보류.

### D02 회원 상세 결제내역 탭

- 수정 파일: `src/components/member/TabPaymentDetail.tsx`
- docs4 기준:
  - 회원 상세 결제내역에서 CRM 내부 승인번호를 확인할 수 있어야 함.
  - 하나의 내부 승인번호 아래 상품별 수납 행을 표시해야 함.
  - 수납 행별 결제수단, 금액, 카드 승인번호, 계좌이체 확인번호, 현금영수증 정보를 확인해야 함.
  - 정상 결제건만 환불/부분 환불 진입 버튼을 제공해야 함.
- 기존 문제:
  - 결제 상세가 단일 결제 합계 중심이라 분할 결제의 상품별 수납 구조를 확인하기 어려움.
  - 환불된 이력에도 환불 버튼이 남을 수 있어 재환불 오해가 생김.
  - 최초 보강 중 실제 DB에 없는 `cashReceiptApprovalNo`, `receiptFileUrl` 컬럼을 조회해 Supabase 400이 발생.
- 조치:
  - 목록에 `내부 승인번호` 컬럼 추가.
  - 상세 모달에 `sale_payment_lines` 기반 상품별 수납 행 테이블 추가.
  - 카드/현금/계좌이체/포인트 결제수단, 기환불액, 승인/확인번호, 입금자, 현금영수증 식별번호 표시.
  - 실제 DB 컬럼인 `cashReceiptIdentifier` 기준으로 현금영수증 정보를 표시.
  - 영수증은 현재 수납 행 단위 URL 컬럼이 없어 `sales.memo`에 저장된 그룹 영수증 링크를 표시.
  - 정상 완료 결제건에만 환불 버튼을 노출하도록 유지.
- 검증:
  - `pnpm exec tsc --noEmit --pretty false` 통과.
  - `/members/detail?id=1930&tab=payment_detail`에서 `CRM-SPLIT-0529` 내부 승인번호 표시 확인.
  - 상세 모달에서 상품별 수납 행 3개(카드/현금/계좌이체) 표시 확인.
  - Supabase 400 콘솔 오류 없음 확인.
- 확인 필요:
  - 수납 행별 영수증 파일을 별도로 관리해야 한다면 `sale_payment_lines`에 receipt URL 컬럼 추가가 필요함. 현재 구현은 결제건 단위 영수증 링크 기준.

### D03 결제 취소 / 부분 환불 화면

- 수정 파일: `src/app/sales/cancel-refund/page.tsx`
- docs4 기준:
  - 좌측 메뉴 → `매출 > 결제 취소 / 부분 환불`(`/sales/cancel-refund`)에서 실제 취소·부분 환불 처리와 승인 요청을 수행한다.
  - CRM 내부 승인번호 기준으로 원결제와 상품별 수납 행을 조회한다.
  - 수납행 취소와 상품 환불/계약 취소를 구분한다.
  - 수납행 취소로 상품 계약을 유지하면 취소 수납금액을 미수금으로 전환한다.
- 기존 문제:
  - 화면 기능은 구현되어 있었으나 `AppLayout`으로 감싸져 있지 않아 직접 route 진입 시 좌측 메뉴/헤더가 빠진 독립 화면처럼 열림.
- 조치:
  - `AppLayout`을 적용해 다른 관리자 화면과 동일한 좌측 메뉴/헤더 구조로 진입되도록 수정.
- 검증:
  - `pnpm exec tsc --noEmit --pretty false` 통과.
  - `/sales/cancel-refund`에서 좌측 메뉴와 화면 제목 표시 확인.
  - `/sales/cancel-refund?saleId=8261`에서 `CRM-SPLIT-0529`, 상품별 수납 행, 수납행 취소, 미수금 전환 안내 표시 확인.
  - 콘솔 오류 없음 확인.

### D03 영수증 업로드 storage bucket

- 관련 파일: `supabase/migrations/20260529_storage_buckets.sql`, `src/app/pos/payment/page.tsx`, `src/lib/uploadFile.ts`
- 문제:
  - POS 결제 완료 등록 시 `영수증 업로드에 실패했습니다: Bucket not found` 발생.
  - 원인 확인 결과 `.env`가 가리키는 Supabase 프로젝트에 `files` storage bucket이 없었음.
- 조치:
  - 기존 migration `20260529_storage_buckets.sql`을 현재 DB에 적용해 `files`, `profiles` bucket과 storage policy를 생성.
- 검증:
  - `storage.buckets`에서 `files`, `profiles` 존재 확인.
  - `files` bucket에 `application/pdf` 테스트 업로드 성공 후 테스트 파일 제거.

### D03 환불 관리 상태 / 결제링크 후속 범위 표시

- 수정 파일:
  - `src/app/refunds/page.tsx`
  - `src/app/sales/page.tsx`
  - `src/app/unpaid/page.tsx`
  - `src/components/common/PaymentLinkModal.tsx`
- docs4 기준:
  - 환불/취소 상태 배지는 요청 / 승인대기 / 완료 / 반려·거절 4종을 사용한다.
  - PG 결제링크는 V1 확정 구현 범위가 아니며, V1 화면에는 발송 기능처럼 오해되면 안 된다.
  - 후속/V2 항목이 화면에 함께 남아야 하는 경우 빨간색 계열로 식별한다.
- 기존 문제:
  - `환불 관리` 조회가 `REFUND_REJECTED`를 제외해 반려·거절 건이 목록에서 빠질 수 있음.
  - 결제링크 버튼이 일반 액션처럼 보여 V1 확정 기능으로 오해될 수 있음.
- 조치:
  - `REFUND_REJECTED` 조회 포함.
  - `반려·거절` 배지 색상을 오류/빨강으로 처리.
  - 매출 상세와 미수금 관리의 결제링크 버튼을 빨간색 `V2/후속` 표시로 변경.
  - 결제링크 모달에 `v2Only` 모드를 추가해 실제 발송 버튼을 비활성화하고 V2/후속 안내를 표시.
- 검증:
  - `pnpm exec tsc --noEmit --pretty false` 통과.
  - `/refunds`, `/unpaid`, `/sales` 진입 시 콘솔 오류 없음 확인.
  - `/unpaid`에서 `V2/후속` 결제링크 표시 확인.

### D03 선수익금 / 할부 / 세금계산서 보조 화면

- 수정 파일:
  - `src/api/endpoints/deferredRevenue.ts`
  - `src/app/sales/installment/page.tsx`
  - `src/app/sales/invoice/page.tsx`
- docs4 기준:
  - 선수익금은 `deferred_revenue` 원천이 있으면 권한 지점 기준의 실제 인식/잔여 금액을 표시해야 한다.
  - 할부/세금계산서 화면은 현재 월 기준으로 요약 지표를 계산해야 한다.
- 기존 문제:
  - 선수익금 API가 `deferred_revenue` 테이블 모델이 있음에도 `sales`에서 추정 계산만 수행.
  - 할부/세금계산서 화면의 오늘/이번달 기준이 2026-05 계열로 고정되어 시간이 지나면 통계가 틀어짐.
- 조치:
  - 선수익금 목록은 `deferred_revenue` 테이블 데이터를 우선 조회하고, 데이터가 없을 때만 완료 매출 기준 추정 계산으로 fallback.
  - 완료 매출 fallback은 `COMPLETED` 및 양수 금액만 대상으로 제한.
  - 할부 납입 처리일과 이번 달 통계를 현재 날짜 기준으로 변경.
  - 세금계산서 발행/전송/재발행 날짜와 이번 달 통계를 현재 날짜 기준으로 변경.
- 검증:
  - `pnpm exec tsc --noEmit --pretty false` 통과.
  - `/deferred-revenue`, `/sales/installment`, `/sales/invoice` 진입 시 콘솔 오류 없음 확인.
- 확인 필요:
  - `할부결제 관리`와 `세금계산서 발행`은 현재 별도 DB 테이블이 없어서 seed/local state 기반이다. 운영 저장·조회까지 정식화하려면 `installment_contracts`, `installment_rounds`, `tax_invoices`, `tax_invoice_items` 계열 DB 설계와 migration이 필요하다.

### D04 수업관리 1차 보강

- 수정 파일:
  - `src/app/(classes)/valid-lessons/page.tsx`
  - `src/app/(classes)/class-waitlist/page.tsx`
  - `src/app/schedule-requests/page.tsx`
  - `src/app/(classes)/class-feedback/page.tsx`
  - `src/app/(classes)/penalties/page.tsx`
  - `src/app/(classes)/class-recording/page.tsx`
  - `src/lib/appNavigation.ts`
  - `src/components/layout/AppSidebar.tsx`
  - `supabase/migrations/20260530_d04_class_operations_support.sql`
  - `supabase/migrations/20260530_penalty_release_status.sql`
- docs4 기준:
  - `SCR-C008 페널티 관리`: 노쇼 중심, 해제 사유 필수, 삭제가 아니라 적용/해제 상태 관리.
  - `SCR-C009 일정 요청 처리`: 요청 유형 2종, 처리 상태 6종, 24시간 SLA, 대안 일정 제시.
  - `SCR-C011 유효 수업 목록`: 확정 예약 원장 기준 출석/결석/노쇼 처리, PT 서명 상태 표시.
  - `SCR-C012 대기열 관리`: `WAITLIST` 예약을 순번 기준으로 조회하고 수동 배정/취소 처리.
  - `SCR-C013 수업 평가 피드백`: 기간/강사/유형 필터, 평균 평점, 낮은 평점 강조, 상세 보기.
  - `SCR-C015 수업 녹화 관리`: docs4 V2/후속 범위이므로 V1 화면에서는 빨간색 계열로 식별.
- 기존 문제:
  - `/valid-lessons`, `/class-waitlist`, `/schedule-requests`, `/class-feedback` 일부가 `src/mocks/class.ts` 고정 데이터 기반.
  - `/schedule-requests`, `/class-feedback`는 운영 저장 원장이 없어 검수 시 실제 데이터와 연결되지 않음.
  - `/class-recording`은 docs4 V2 항목인데 V1 메뉴에서 일반 항목처럼 보임.
  - `/penalties`는 페널티를 삭제 처리했고, 해제 사유/해제 상태 이력이 남지 않음.
- 조치:
  - `schedule_requests`, `class_feedbacks` 테이블을 추가하고 앱 접근 권한을 부여.
  - `promote_waitlist_booking()` DB 함수를 추가해 대기열 수동 배정을 예약 상태 변경과 수업 booked 증가가 함께 처리되도록 구성.
  - 유효 수업 목록은 `lesson_bookings` + `classes` + `members` 기준으로 조회하도록 변경.
  - 대기열 관리는 `lesson_bookings.status = WAITLIST` 기준으로 조회하고, 배정/취소를 DB에 반영하도록 변경.
  - 일정 요청 처리와 수업 평가 피드백은 신규 운영 테이블 기준으로 조회/처리하도록 변경.
  - 페널티는 `status`, `releasedAt`, `releasedBy`, `releaseReason`을 추가하고 해제 사유 입력 후 `RELEASED` 상태로 변경하도록 수정.
  - 수업 녹화 메뉴와 화면은 `V2/후속` 빨간색 표시로 바꾸고 업로드/공유/삭제 실행 버튼을 비활성화.
- 검증:
  - `pnpm exec tsc --noEmit --pretty false` 통과.
  - Playwright로 `/penalties`, `/schedule-requests`, `/valid-lessons`, `/class-waitlist`, `/class-feedback`, `/class-recording` 진입 확인.
  - 신규 테이블 권한 보강 후 `/schedule-requests`, `/class-feedback`의 401/permission denied 콘솔 오류 해소.
- 확인 필요:
  - `lesson_bookings`에는 자동 배정 동의 여부 필드가 없어 대기열 화면은 현재 `알림만`으로 표시한다. 자동 배정 동의까지 운영하려면 예약 원장에 `autoAssignAgreed` 또는 대기열 별도 원장 컬럼이 필요하다.
  - 회원별 잔여 횟수 원장이 유효 수업 화면에 직접 연결되어 있지 않아 현재는 회원 상태/만료일 기준으로 유효 여부를 표시한다. 정확한 잔여 횟수 차감/차단은 이용권 원장 연결이 필요하다.
  - PT 서명은 현재 `classes.signature_at` 수업 단위만 저장한다. 예약/회원별 서명 이미지와 감사 로그가 필요하면 별도 서명 테이블이 필요하다.
  - 일정 요청 수락 후 실제 `classes` 일정 변경/예약 취소/알림 큐 반영은 별도 트랜잭션 설계가 필요하다. 이번 보강은 요청 상태와 대안/거절 사유 저장까지 반영했다.

### D05 상품관리 1차 범위 정리

- 수정 파일:
  - `src/lib/appNavigation.ts`
  - `src/app/products/catalog/page.tsx`
  - `src/app/products/compare/page.tsx`
  - `src/app/products/inventory/page.tsx`
  - `src/app/products/seasonal-price/page.tsx`
- docs4 기준:
  - V1 확정: `SCR-P001 상품 관리`, `SCR-P002 상품 등록`, `SCR-P003 상품 상세/수정 패널`, `SCR-P004 할인 설정`, `SCR-P008 시즌 가격 관리`.
  - V2/후속: `SCR-P005 상품 카탈로그`, `SCR-P006 상품 비교`.
  - 책임 이관/후속: D05 `SCR-P007 재고 관리`는 docs4 V2에서 실제 실물 재고 책임을 D06 시설관리 상품 재고로 이관한다고 설명.
- 기존 문제:
  - 사이드바에서 상품 카탈로그/상품 비교/재고 관리가 V1 확정 화면처럼 일반 메뉴로 보임.
  - 상품 카탈로그/비교/재고/시즌 가격 화면에 `seed 갱신`, `Supabase snapshot`, `Fallback 사용` 같은 퍼블리싱/시드 검수 문구가 노출됨.
- 조치:
  - 사이드바 상품 하위 메뉴에서 `상품 카탈로그 V2/후속`, `상품 비교 V2/후속`, `재고 관리 D06/후속`으로 표시하고 빨간색 계열 스타일 적용.
  - 카탈로그/비교/재고 화면 제목에 V2/후속 또는 D06/후속 범위를 명시.
  - 카탈로그/비교/재고 화면 상단에 빨간 안내 배너를 추가해 V1 확정 범위가 아님을 표시.
  - 사용자에게 보이는 `seed 갱신`, `Supabase snapshot`, `Fallback 사용` 문구를 `자료 새로고침`, `지점/기준일`, `임시 자료 사용`으로 변경.
  - 시즌 가격 화면은 V1이므로 V2 배너는 추가하지 않고 퍼블리싱/seed 문구만 운영 표현으로 변경.
- 검증:
  - `pnpm exec tsc --noEmit --pretty false` 통과.
  - Playwright로 `/products`, `/discount-settings`, `/products/seasonal-price`, `/products/catalog`, `/products/compare`, `/products/inventory` 진입 확인.
  - 각 route 콘솔 오류 없음 확인.
- 확인 필요:
  - `product_seasonal_prices`, `product_catalog_items`, `product_inventory` 계열 운영 테이블은 현재 DB에 없다. `시즌 가격 관리`는 V1 확정 화면이므로 운영 저장까지 정식화하려면 `product_seasonal_prices` 마이그레이션과 화면 DB 연결이 필요하다.
  - `상품 카탈로그`, `상품 비교`, `상품 재고`는 현재 후속 범위로 표시만 정리했다. V2로 실제 개발할 경우 카탈로그 노출 원장, 비교 속성 원장, D06 재고 원장과의 관계를 먼저 확정해야 한다.

## 다음 점검 예정

1. D04 수업관리 잔여: 캘린더/수업 관리/횟수 관리/출석완료 확인의 세부 액션과 DB 원장 정합성 점검.
2. D05 상품관리 잔여: 시즌 가격 V1 화면의 운영 DB 원장 설계/연결 여부 결정.
3. D06 시설관리: 락커/사물함/RFID/운동룸/골프타석/옷 보관함의 D06-D11 경계 확인.

## 사용자 확인 필요 후보

- `/body-composition` 하나에 D02 개인 체성분 화면과 D11 체성분 통합 관리가 함께 배정되어 있다. 장기적으로는 `?mode=member|integrated` 또는 `/body-composition/integrated` 같은 분리 여부를 정해야 한다.
- D04 대기열 자동 배정 동의값과 PT 서명 이미지는 현재 DB 원장이 부족하다. 화면은 운영 가능하게 연결했지만, 정책대로 완전 자동화하려면 추가 스키마 결정이 필요하다.
- D05 시즌 가격은 V1 확정인데 현재 운영 테이블이 없어 임시 자료 기반이다. 실제 결제 가격 락인과 시즌별 매출 집계까지 하려면 DB 원장 확정이 필요하다.
