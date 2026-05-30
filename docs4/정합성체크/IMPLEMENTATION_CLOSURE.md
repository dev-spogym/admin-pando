# docs4 Implementation Closure Checklist

Generated: 2026-05-30

Source: docs4/V1 and docs4/V2 headings that start with SCR or DLG.

Purpose: use this as the working checklist to close every docs4 domain. A route hit only means a Next.js page route exists after stripping route groups like (classes); detail completion still requires manual UX, DB, permission, and exception checks.

## 2026-05-30 처리 이력

- D01 공통: 세션 만료 시 즉시 로그인으로만 보내던 흐름을 보강했습니다. 세션 만료 플래그가 있으면 현재 경로를 보존한 만료 안내 화면을 보여주고, 재로그인 후 `returnTo` 경로로 복귀합니다.
- D01 알림 센터: 알림 패널에 문맥 바로가기, 전체 읽음, 권한자 전체 삭제, 로드 실패 시 재시도 상태를 추가했습니다. 삭제는 감사 로그 원본을 지우지 않고 알림센터 표시 목록에서만 제외합니다.
- D01 공통 보강: `/logout` route와 로그아웃 확인 다이얼로그를 추가했습니다. 프로필 저장은 `branch_settings.profile_settings_*`와 `users.name` 갱신을 시도하도록 연결했고, 비밀번호 재설정은 Supabase reset/update API를 호출합니다. 글로벌 검색의 직원/수업 검색은 지점 범위와 실제 `classes.title` 컬럼 기준으로 정정했습니다.
- D02 가족 회원: `members/family`가 seed/local 상태에만 의존하던 구조를 제거하고 `member_family_groups`, `member_family_members` DB 저장으로 전환했습니다. 그룹 생성, 구성원 추가, 구성원 분리가 새로고침 후에도 유지됩니다.
- D02 회원 병합: mock 중복 회원 목록을 제거하고 실제 `members` 검색 결과를 주/부 계정으로 선택하게 했습니다. 병합 실행 시 결제, 출석, 체성분, 계약, 메모, 상담, 평가, 운동 이력 등 주요 `memberId` 이력을 주 계정으로 이전하고 부 계정은 `WITHDRAWN` + `deletedAt`으로 비활성화합니다. 병합 이력은 `member_merge_logs`에 남깁니다.
- D02 회원 상세/세그먼트: 회원 상세의 마일리지 조정은 `members.mileage`와 `audit_log`로 저장하고, 운동 프로그램 배정은 `member_exercise_programs`에 저장하도록 전환했습니다. 세그먼트 관리는 seed/목업 계산을 제거하고 `members`, `attendance`, `sales`, `consultations`, `member_evaluations` 기준으로 자동 세그먼트와 조건 미리보기를 계산하며 커스텀 세그먼트/발송 이력은 `branch_settings`에 저장합니다.
- D07 직원관리: 좌측 메뉴에서 직원/급여 기능이 설정 영역에 섞여 보이던 문제를 줄이기 위해 `직원` 메뉴 그룹으로 직원 목록, 직원 등록, 직원 근태, 급여 관리, 급여 명세서를 묶었습니다.
- D07 직원 등록/수정: 근로계약서 파일 첨부를 구현했습니다. PDF/JPG/PNG/WebP, 10MB 이하 파일을 Supabase Storage `files/staff-contracts/{branchId}/{staffId}/...` 경로에 업로드하고 `staff_documents` 테이블에 메타데이터를 저장합니다.
- D07 직원 목록: 직원별 근로계약서 첨부 건수를 조회해 목록/엑셀 다운로드에 반영했습니다.
- D07 직원 근태: 수동 보정/누락 추가가 로컬 상태에만 반영되던 문제를 수정했습니다. `staff_attendance`에 `date`, `workMinutes`, `source`, `corrections`, `memo` 컬럼을 보강하고, 누락 근태 추가와 기존 근태 보정이 DB에 저장되도록 연결했습니다.
- D07 급여 관리: 급여 상세 편집의 수동 수당/공제 항목이 로컬 상태에만 남던 문제를 수정해 `payroll.details`, `bonus`, `deduction`, `netSalary`에 저장되도록 연결했습니다. 급여 정책 템플릿도 `salary_policies` 테이블로 분리해 추가/수정/삭제가 새로고침 후에도 유지되도록 했습니다.
- D07 급여 확정/명세서: `payroll.status` DB enum을 `PENDING/PAID`로 저장하도록 수정하고, 명세서 발송/재발송/무효/이력을 `payroll_statement_deliveries` 원장에 저장하도록 전환했습니다.
- D03 할부결제 관리: seed 기반 목록을 제거하고 `installment_contracts`, `installment_rounds`로 할부 계약/회차를 저장하도록 전환했습니다. `DLG-S007` 회차 상세, `DLG-S008` 납입 처리, `DLG-S009` 할부 등록이 DB 기반으로 동작하며 카드/현금/계좌이체 증빙과 현금영수증 정보를 저장합니다.
- D03 할부 납입 처리: `process_installment_round_payment` RPC를 추가했습니다. 회차 금액 검증, 결제수단별 필수 증빙 검증, 회차 완료 처리, 원 매출 연계 계약의 경우 `sale_payment_lines`와 `sales.unpaid` 동기화까지 처리합니다.
- D03 세금계산서 발행: seed 기반 발행 대상/이력을 제거하고 `tax_invoices`, `tax_invoice_items`로 발행 이력을 저장하도록 전환했습니다. 법인/사업자 회원의 완료 매출을 발행 대상으로 구성하고, `DLG-S011` 발행 폼과 `DLG-S010` 상세/전송 상태를 DB에 저장합니다.
- D03 매출 예측: 하드코딩된 과거 실적/상품 기여도/목표값을 제거하고 `sales` 완료 매출 기반 예측으로 전환했습니다. 목표 매출은 `sales_forecast_targets`에 기간별로 저장하고, 1억원 이상 목표는 본사 승인 대기 상태로 남깁니다.
- D03 매출 기본/환불/미수: 매출 상세 메모 편집을 `sales.memo` 저장으로 보강했고, `/sales`, `/pos`, `/pos/payment`, `/refunds`, `/sales/cancel-refund`, `/unpaid`, `/deferred-revenue`, `/sales/stats`, `/sales/statistics-management`를 실제 원장 기준으로 검증했습니다. 환불은 `sales` 환불 상태와 `sale_payment_lines` 환불 배분 행 기준으로 처리하며, 수납행 취소 시 미수 전환은 `sales.status=UNPAID`로 생성됩니다. 결제링크는 V2/후속 표시만 유지합니다.
- D04 수업 출석/완료 확인: `/attendance/lesson-completion`의 하드코딩 수업/회원 데이터를 제거하고 `classes`, `lesson_bookings`, `members`, `lesson_counts`, `attendance` 기반으로 조회하도록 전환했습니다. 출석, 완료, Push 요청, 노쇼 처리는 `process_lesson_attendance` RPC로 저장합니다.
- D04 수강권 차감 이력: `lesson_count_logs` 원장을 추가하고 완료/노쇼/수동 차감/수동 조정 이력을 한 테이블에 남기도록 정리했습니다. `/lesson-counts`의 세션 상세, 횟수 조정, 차감 이력 모달은 DB 이력 기준으로 표시합니다.
- D04 그룹 수업 현황: `/class-stats`의 예약자 명단 더미 생성과 로컬 정원 조정을 제거했습니다. `lesson_bookings`/`members`로 실제 명단을 조회하고, 정원 변경과 수업 취소를 `classes` 및 예약 원장에 저장합니다.
- D04 운동 프로그램 관리: 회원 배정 목업을 제거하고 `member_exercise_programs` 저장으로 전환했습니다. 배정/해제/배정회원 필터가 새로고침 후 유지됩니다.
- D05 시즌 가격 관리: `/products/seasonal-price`의 seed/local 상태를 제거하고 `product_seasonal_prices` 테이블로 등록/수정/진행 중 즉시 종료를 저장하도록 전환했습니다. 대상 상품은 실제 `products` 원장에서 선택하고, 동일 상품의 기간 중복 시즌은 저장 차단합니다.
- D05 할인 설정: `/discount-settings`의 변경 이력을 `localStorage`에서 `audit_log`로 전환했습니다. 할인 정책 등록/수정/삭제는 `discount_policies` 원장과 감사 로그를 함께 갱신합니다.
- D05 복합 할인 정책: 할인 정책 모달에 적용 기간과 전체/특정 상품 조건을 추가했습니다. 조건은 `discount_policies.conditions`에 저장하며, 기간 역전과 특정 상품 미선택은 저장을 차단합니다.
- D05 상품 상세/이미지: `/products/detail`의 목업 안내를 제거하고 실제 `products`, `sales`, `audit_log` 기준으로 상세/판매/가격 이력을 표시하도록 연결했습니다. 상품 패널에는 대표 이미지 업로드/미리보기/적용을 추가하고 `products.imageUrl/imageMimeType/imageUpdatedAt`에 저장합니다.
- D05 작업 취소 확인: 상품 패널에서 입력 변경 후 닫기/X 클릭 시 저장되지 않은 변경 취소 확인을 표시하도록 보강했습니다.
- D06 락커 관리: `/locker`의 이력 조회가 존재하지 않는 `audit_logs`를 보던 오류를 수정하고 `audit_log`로 이동/회수/배정/고장/비밀번호·메모 변경 이력을 남기도록 보강했습니다. 락커 상태 저장은 DB enum 기준 `AVAILABLE/IN_USE/MAINTENANCE`로 통일했습니다.
- D06 사물함 배정 관리: `/locker/management`의 배정/만료 일괄 해제가 화면 상태에만 반영되던 문제를 수정해 `lockers` 원장에 저장하고 감사 이력을 남기도록 연결했습니다.
- D06 RFID/밴드 카드 관리: `/rfid`의 `localStorage` 저장을 제거하고 `rfid_cards` 테이블로 등록/수정/분실/해제/이력 조회를 연결했습니다. 회원/직원 검색, 카드번호 중복 검증, 감사 로그 조회를 함께 반영했습니다.
- D06 운동룸 관리: `/rooms`의 `branchStorage` 저장을 제거하고 `facility_rooms` 테이블로 룸 등록/수정/상태 전환/삭제를 저장하도록 전환했습니다.
- D06 골프 타석 관리: `/golf-bays`는 기존 `golf_bays`, `golf_waitlist`, `golf_bay_sessions` 기반 흐름을 유지하고 V1 SCR-054 범위의 시작/종료/이동/대기열 저장을 DB 연결 항목으로 닫았습니다.
- D04/D05/D06 V2 후속 화면: `/class-recording`, `/products/catalog`, `/products/compare`, `/products/inventory`, `/facility/inventory`, `/equipment-check`, `/consumables`, `/cleaning-schedule`, `/rooms` 라우트가 열리는 것을 확인했습니다. V2/후속 항목은 빨간 안내 배너와 후속 범위 문구를 유지하고, 실제 운영 원장 연결은 후속 확정 대상으로 분리했습니다.
- D08 마케팅: `auto_alarm_settings`, `coupon_issuance_logs`, `marketing_campaigns`, `referral_events`, `referral_records`, `sms_templates`, `bulk_send_histories`, `ab_tests`, `electronic_contracts`, `mileage_policy_settings` 원장을 추가했습니다. 자동 알림, 쿠폰 발급 이력, 마일리지 수동 처리/정책, 전자계약, 캠페인, 리퍼럴, SMS/카카오 대량발송, A/B 테스트를 DB 기준으로 저장하도록 전환했습니다.
- D09 설정관리: `branch_settings`, `notice_read_receipts`를 추가하고 키오스크, IoT, 출석, 자동화, 권한/커스텀 역할, 다국어, 백업·복원, 구독 설정을 새로고침 후 유지되도록 DB 저장으로 전환했습니다. 공지사항은 게시 대상/게시 기간/읽음 이력을 DB에 저장합니다.
- D10 본사관리: 지점 관리/성과 리포트/KPI/히스토리/리포트는 기존 Supabase 원장 조회를 유지하고, KPI 목표·Today Tasks 직접 등록/상태 오버라이드·자동화 정책 세트·커스텀 대시보드 구성·NPS 발송 이력을 `branch_settings` 저장으로 전환했습니다. 벤치마크 비교는 현재 지점의 실제 매출/회원/출석 데이터를 기준으로 산출합니다.
- D11 통합운영: 옷 락커 운영은 당일 `attendance` 원장에서 미배정 회원을 산출하고 배정/회수 상태를 날짜별 `branch_settings`로 저장하도록 전환했습니다. 키오스크 운영 현황은 기기 목록/상태 메모/원격 재시작 요청 이력을 `branch_settings.kiosk_ops_devices`에 저장합니다. 회원 건강 연동 요약은 인라인 목업을 제거하고 `members`, `attendance`, `lockers`, `body_compositions`, `lesson_bookings/classes` 기준으로 회원별 출석·락커·체성분·운동 이력을 조회합니다.
- 정책 판단: 전자계약 외부 자동 발송은 docs4 정책상 확정 전 항목으로 보아 이번 구현에서는 실제 외부 발송 API를 붙이지 않고, CRM 내부의 현장 서명/원격 서명 대기/재발송 이력 저장으로 제한했습니다.

## Summary

| Scope | Total | Route file exists | No app route file | Dialog/partial check | No route in docs |
|---|---:|---:|---:|---:|---:|
| V1/D01-공통 | 3 | 3 | 0 | 0 | 0 |
| V1/D02-회원관리 | 38 | 38 | 0 | 0 | 0 |
| V1/D03-매출관리 | 27 | 27 | 0 | 0 | 0 |
| V1/D04-수업관리 | 30 | 30 | 0 | 0 | 0 |
| V1/D05-상품관리 | 21 | 21 | 0 | 0 | 0 |
| V1/D06-시설관리 | 17 | 17 | 0 | 0 | 0 |
| V1/D07-직원관리 | 12 | 12 | 0 | 0 | 0 |
| V1/D08-마케팅 | 29 | 29 | 0 | 0 | 0 |
| V1/D09-설정관리 | 26 | 26 | 0 | 0 | 0 |
| V1/D10-본사관리 | 15 | 15 | 0 | 0 | 0 |
| V1/D11-통합운영 | 10 | 10 | 0 | 0 | 0 |
| V2/D01-공통 | 13 | 13 | 0 | 0 | 0 |
| V2/D02-회원관리 | 37 | 37 | 0 | 0 | 0 |
| V2/D03-매출관리 | 28 | 28 | 0 | 0 | 0 |
| V2/D04-수업관리 | 21 | 21 | 0 | 0 | 0 |
| V2/D05-상품관리 | 28 | 28 | 0 | 0 | 0 |
| V2/D06-시설관리 | 29 | 29 | 0 | 0 | 0 |
| V2/D07-직원관리 | 9 | 9 | 0 | 0 | 0 |
| V2/D08-마케팅 | 26 | 26 | 0 | 0 | 0 |
| V2/D09-설정관리 | 18 | 18 | 0 | 0 | 0 |
| V2/D10-본사관리 | 18 | 18 | 0 | 0 | 0 |
| V2/D11-통합운영 | 6 | 6 | 0 | 0 | 0 |

## All Items

| Status | Version | Domain | ID | Title | Docs location | Route candidates | Work note |
|---|---|---|---|---|---|---|---|
| CLOSED_DB_CONNECTED | V1 | D01-공통 | DLG-000 | 세션 만료 | docs4/V1/D01-공통/공통.md:165 | 공통 인증 가드 | 세션 만료 플래그를 감지해 현재 경로를 보존하고 재로그인 후 `returnTo`로 복귀합니다. |
| CLOSED_DB_CONNECTED | V1 | D01-공통 | SCR-100 | 로그인 | docs4/V1/D01-공통/공통.md:21 | /login | 로그인 실패 잠금, 아이디 저장, 지점 선택, 세션 만료 복귀 흐름을 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D01-공통 | SCR-104 | 알림 센터 | docs4/V1/D01-공통/공통.md:101 | 사이드바 알림 센터 | `audit_log` 원장 기반 알림, 문맥 바로가기, 읽음/숨김, 재시도 상태를 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M001 | 회원 상태 변경 확인 | docs4/V1/D02-회원관리/회원관리.md:1086 | /members | 선택 회원 상태 변경 모달이 members 원장 status를 갱신합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M002 | 회원 삭제 확인 | docs4/V1/D02-회원관리/회원관리.md:1166 | /members/detail | 회원 상세 삭제 확인 후 members.deletedAt/status를 갱신합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M003 | 홀딩 등록 | docs4/V1/D02-회원관리/회원관리.md:1235 | /members/detail?tab=detail_history | 홀딩 등록은 member_holdings 원장과 회원 상태/만료일 정책 흐름으로 처리합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M004 | 홀딩 해제 | docs4/V1/D02-회원관리/회원관리.md:1312 | /members/detail?tab=detail_history | 홀딩 해제/취소는 member_holdings 및 회원 상태 복구 흐름으로 처리합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M005 | 탈퇴 처리 | docs4/V1/D02-회원관리/회원관리.md:1383 | /members/detail | 탈퇴 처리는 members.status/WITHDRAWN, withdrawnAt, withdrawReason을 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M006 | 전화번호 중복 안내 | docs4/V1/D02-회원관리/회원관리.md:1478 | /members/new | 회원 등록/수정에서 지점 내 전화번호 중복을 Supabase members 조회로 차단합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M007 | 작업 취소 확인 | docs4/V1/D02-회원관리/회원관리.md:1547 | /members/new | 회원 등록/수정 이탈 시 작업 취소 확인 다이얼로그를 표시합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M008 | 입력 폼 초기화 확인 | docs4/V1/D02-회원관리/회원관리.md:1616 | /members/new | 회원 등록 폼 초기화 확인 후 입력 상태를 리셋합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M009 | 메모 추가 | docs4/V1/D02-회원관리/회원관리.md:1685 | /members/detail?tab=memo | 회원 상세 메모 추가가 member_memos 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M010 | 메모 삭제 확인 | docs4/V1/D02-회원관리/회원관리.md:1754 | /members/detail?tab=memo | 회원 상세 메모 삭제 확인 후 member_memos에서 삭제합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M011 | 상담 등록/수정 | docs4/V1/D02-회원관리/회원관리.md:1823 | /members/detail?tab=consultation | 상담 등록/수정은 consultations 원장과 연결 매출을 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M012 | 상담 기록 삭제 확인 | docs4/V1/D02-회원관리/회원관리.md:1910 | /members/detail?tab=consultation | 상담 삭제 확인 후 consultations 원장을 갱신합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M013 | 환불 처리 | docs4/V1/D02-회원관리/회원관리.md:1979 | /members/detail?tab=payment | 회원 결제 이력의 환불 액션은 결제 취소/부분 환불 화면과 sales/refund 원장으로 연결됩니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M014 | 결제 상세 조회 | docs4/V1/D02-회원관리/회원관리.md:2031 | /members/detail?tab=payment_detail | 결제 상세는 sales와 sale_payment_lines를 조회해 결제수단별 수납 정보를 표시합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M015 | 체성분 등록 | docs4/V1/D02-회원관리/회원관리.md:2110 | /body-composition | 체성분 등록은 body_compositions 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M016 | 체성분 덮어쓰기 | docs4/V1/D02-회원관리/회원관리.md:2192 | /body-composition | 동일일자 체성분 덮어쓰기/수정은 body_compositions update 흐름으로 처리합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M017 | 목표 설정 | docs4/V1/D02-회원관리/회원관리.md:2261 | /body-composition | 체성분 목표 설정은 body_compositions/목표 상태 저장 흐름으로 처리합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M018 | 연장 등록 | docs4/V1/D02-회원관리/회원관리.md:2332 | /members/detail?tab=detail_history | 연장 등록은 member_extensions 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M019 | 양도 처리 | docs4/V1/D02-회원관리/회원관리.md:2413 | /members/detail?tab=detail_history | 양도 이력은 member_transfer_logs 원장 조회 흐름으로 표시합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M020 | 쿠폰 적용 | docs4/V1/D02-회원관리/회원관리.md:2492 | /members/detail?tab=detail_history | 쿠폰 적용/조회는 member_coupons 및 쿠폰 이력 화면에서 처리합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M022 | 수동 출석 | docs4/V1/D02-회원관리/회원관리.md:2571 | /members/detail | 회원 상세 수동 출석은 attendance 원장에 저장하고 lastVisitAt을 갱신합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M023 | 이관 확인 | docs4/V1/D02-회원관리/회원관리.md:2659 | /members/transfer | 회원 지점 이관 확인 후 members.branchId와 member_transfer_log를 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M024 | 종합 평가 등록 | docs4/V1/D02-회원관리/회원관리.md:2748 | /members/detail?tab=evaluation | 종합 평가는 member_evaluations 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M026 | 운동 이력 등록 | docs4/V1/D02-회원관리/회원관리.md:2823 | /members/detail?tab=exerciseLog | 운동 이력은 exercise_logs 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M027 | 주소 검색 | docs4/V1/D02-회원관리/회원관리.md:2896 | /members/new | 주소 검색 모달은 회원 등록/수정 폼에 주소 값을 반영합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M028 | 회원 병합 확인 | docs4/V1/D02-회원관리/회원관리.md:2977 | /members/merge | 회원 병합 확인 후 관련 memberId 이력을 이전하고 member_merge_logs에 기록합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M029 | 가족 연결 | docs4/V1/D02-회원관리/회원관리.md:3059 | /members/family | 가족 연결은 member_family_groups/member_family_members 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | DLG-M030 | 등급 변경 | docs4/V1/D02-회원관리/회원관리.md:3137 | /members/grade | 등급 변경/기준 설정은 member_grade_settings/member_grade_rules에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | SCR-M001 | 회원 목록 | docs4/V1/D02-회원관리/회원관리.md:21 | /members | members 원장 기반 목록, 필터, 상태 탭, 선택 액션을 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | SCR-M002 | 회원 등록 | docs4/V1/D02-회원관리/회원관리.md:135 | /members/new | 회원 등록은 members 원장 생성과 중복 연락처 검증을 연결합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | SCR-M003 | 회원 수정 | docs4/V1/D02-회원관리/회원관리.md:267 | /members/edit | 회원 수정은 members 원장 갱신과 취소/초기화 확인을 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | SCR-M004 | 회원 상세 | docs4/V1/D02-회원관리/회원관리.md:375 | /members/detail | 회원 상세는 members, sales, attendance, body_compositions, lockers, contracts 및 서브 원장을 통합 조회합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | SCR-M005 | 회원 이관 | docs4/V1/D02-회원관리/회원관리.md:441 | /members/transfer | 회원 지점 이관은 사전 체크 후 members.branchId와 member_transfer_log를 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | SCR-M006 | 체성분 관리 | docs4/V1/D02-회원관리/회원관리.md:553 | /body-composition | 체성분 관리는 회원 검색과 body_compositions 등록/수정/목표 흐름을 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | SCR-M007 | 회원 병합 | docs4/V1/D02-회원관리/회원관리.md:667 | /members/merge | 회원 병합은 중복 회원 검색, 이력 이전, member_merge_logs 기록을 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | SCR-M008 | 가족 회원 | docs4/V1/D02-회원관리/회원관리.md:751 | /members/family | 가족 회원은 member_family_groups/member_family_members CRUD를 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | SCR-M009 | 등급 관리 | docs4/V1/D02-회원관리/회원관리.md:837 | /members/grade | 등급 관리는 결제금액/이용기간/방문횟수 조건과 혜택을 DB에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D02-회원관리 | SCR-M010 | 세그먼트 관리 | docs4/V1/D02-회원관리/회원관리.md:967 | /members/segment | 세그먼트 관리는 members/attendance/sales/consultations/evaluations 기반 자동 산출과 커스텀 저장을 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S001 | 매출 상세 | docs4/V1/D03-매출관리/매출관리.md:1244 | /sales | `sales` 원장 기준 매출 상세 모달에서 결제/할인/수납/서비스/메모를 조회합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S002 | 구매자 검색 | docs4/V1/D03-매출관리/매출관리.md:1327 | /pos | POS 구매자 검색이 `members` 원장 조회로 회원 선택을 연결합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S003 | 결제 확인 | docs4/V1/D03-매출관리/매출관리.md:1413 | /pos/payment | CRM 내부 승인번호 1개와 상품별 `sale_payment_lines` 수납 행을 저장하는 결제 확인 모달로 구현했습니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S004 | 중복 결제 경고 | docs4/V1/D03-매출관리/매출관리.md:1514 | /pos/payment | 최근 동일 회원/동일 금액 중복 감지 후 계속 진행 확인 다이얼로그를 표시합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S005 | 메모 편집 | docs4/V1/D03-매출관리/매출관리.md:1599 | /sales | 매출 상세에서 `sales.memo` 편집/저장과 1000자 검증을 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S006 | 환불 상세 | docs4/V1/D03-매출관리/매출관리.md:1678 | /refunds | 환불 관리 목록 클릭 시 `sales` 환불 행 기준 환불 상세 다이얼로그를 표시합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S007 | 할부 상세 | docs4/V1/D03-매출관리/매출관리.md:1761 | /sales/installment | `installment_contracts`와 `installment_rounds` 기반 회차 펼침/납입 현황 조회를 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S008 | 납입 처리 | docs4/V1/D03-매출관리/매출관리.md:1867 | /sales/installment | `process_installment_round_payment` RPC로 회차 납입, 결제수단 증빙, 원 매출 미수 동기화를 처리합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S009 | 할부 등록 | docs4/V1/D03-매출관리/매출관리.md:1954 | /sales/installment | 회원/상품 선택, 선납금, 총 할부금액, 회차, 첫 납입월 입력 후 DB 계약/회차를 생성합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S010 | 세금계산서 상세 | docs4/V1/D03-매출관리/매출관리.md:2067 | /sales/invoice | `tax_invoices`와 `tax_invoice_items` 기반 상세 조회, 품목/공급가액/부가세/전송 이력을 표시합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S011 | 세금계산서 발행 | docs4/V1/D03-매출관리/매출관리.md:2169 | /sales/invoice | 법인/사업자 완료 매출을 발행 대상으로 구성하고 발행 폼 입력값을 DB에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S012 | 목표 매출 설정 | docs4/V1/D03-매출관리/매출관리.md:2287 | /sales/forecast | `sales_forecast_targets`에 기간별 목표를 저장하고 1억원 이상은 승인 대기 상태로 남깁니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S013 | 환불 처리 | docs4/V1/D03-매출관리/매출관리.md:2378 | /sales/cancel-refund | 환불 대상 검색, 수기 산식, 처리 상태, 상품별 환불 배분을 `sales`와 `sale_payment_lines`에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S014 | 환불 상세 결과 | docs4/V1/D03-매출관리/매출관리.md:2467 | /sales/cancel-refund | 환불 처리 결과 상태와 환불 관리 이동 액션을 제공하고 처리 후 목록을 재조회합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | DLG-S015 | 환불 요청 | docs4/V1/D03-매출관리/매출관리.md:2549 | /sales/cancel-refund | 요청/승인대기/완료 상태를 선택해 `sales.status`의 REFUND 계열 상태로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S001 | 매출 현황 | docs4/V1/D03-매출관리/매출관리.md:21 | /sales | `sales` 원장 기반 매출 현황, 탭, 필터, 상세, 엑셀 다운로드를 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S002 | POS 판매 | docs4/V1/D03-매출관리/매출관리.md:128 | /pos | `products`와 `members` 기준 POS 상품 선택, 장바구니, 구매자 연결을 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S003 | 결제 처리 | docs4/V1/D03-매출관리/매출관리.md:163 | /pos/payment | `sales`, `sale_payment_lines`, `contracts` 저장과 영수증 파일 업로드, 분할 수납 검증을 연결합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S004 | 매출 통계 | docs4/V1/D03-매출관리/매출관리.md:230 | /sales/stats | `sales` 완료 매출 기준 기간/상품/결제수단/담당자 통계를 산출합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S005 | 통계 관리 | docs4/V1/D03-매출관리/매출관리.md:341 | /sales/statistics-management | `sales`와 `members` 기준 통계 관리 화면, 필터, 월별 비교, 다운로드를 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S006 | 선수익금 조회 | docs4/V1/D03-매출관리/매출관리.md:473 | /deferred-revenue | `deferred_revenue` 원장을 우선 조회하고 데이터가 없으면 완료 매출 기준 선수익금을 산출합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S007 | 환불 관리 | docs4/V1/D03-매출관리/매출관리.md:567 | /refunds<br>/sales/cancel-refund | `sales` 환불 상태 목록과 결제 취소/부분 환불 처리 화면을 연결합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S008 | 미수금 관리 | docs4/V1/D03-매출관리/매출관리.md:656 | /unpaid | `sales.unpaid` 조회와 `process_unpaid_collection` RPC, `unpaid_collections` 납부 이력을 연결합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S009 | 할부결제 관리 | docs4/V1/D03-매출관리/매출관리.md:744 | /sales/installment | `installment_contracts`, `installment_rounds` 기반 할부 계약/회차/납입/엑셀 다운로드를 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S010 | 세금계산서 발행 | docs4/V1/D03-매출관리/매출관리.md:906 | /sales/invoice | `tax_invoices`, `tax_invoice_items`로 발행 대상 산출/발행 이력/상세/전송 상태를 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S011 | 매출 예측 | docs4/V1/D03-매출관리/매출관리.md:1040 | /sales/forecast | `sales` 완료 매출 기반 예측, 상품 기여도, 목표 설정 DB 저장을 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D03-매출관리 | SCR-S012 | 결제 취소 / 부분 환불 | docs4/V1/D03-매출관리/매출관리.md:1140 | /sales/cancel-refund | CRM 내부 승인번호와 상품별 수납 행 기준 전체 취소/부분 환불/수납행 취소 미수 전환을 처리합니다. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C001 | 수업 등록/수정 (캘린더) | docs4/V1/D04-수업관리/수업관리.md:1407 | - | `/calendar` 수업 등록/수정이 `classes`에 저장되고 참여자는 `lesson_bookings`에 생성. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C002 | 일정 상세 | docs4/V1/D04-수업관리/수업관리.md:1508 | - | `/calendar` 일정 상세에서 `classes` 상세, 수정, 삭제, 승인/거절 저장 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C003 | 수업 등록/수정 (관리) | docs4/V1/D04-수업관리/수업관리.md:1605 | - | `/lessons` 수업 등록/수정 모달이 `lessons` 원장에 저장. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C004 | 일괄 변경 | docs4/V1/D04-수업관리/수업관리.md:1712 | - | `/lessons` 선택 수업 일괄 변경/취소가 `classes` 원장에 반영. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C005 | 수업 기록 상세 | docs4/V1/D04-수업관리/수업관리.md:1797 | - | `/lessons` 상세에서 `classes` 상태, 서명, 완료/노쇼/취소 기록 조회. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C006 | 서명 | docs4/V1/D04-수업관리/수업관리.md:1888 | - | `classes.signature_url/signature_at` 저장 흐름과 출석/완료 화면의 서명 누락 식별을 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C007 | 노쇼 정책 | docs4/V1/D04-수업관리/수업관리.md:1995 | - | `/lessons` 정책 모달이 `lesson_policy_settings`에 저장되고 출석/노쇼 처리 화면이 이 값을 참조. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C008 | 일괄 생성 확인 | docs4/V1/D04-수업관리/수업관리.md:2074 | - | `/class-schedule` 미리보기 후 `bulkCreateClasses`로 `classes` 일괄 생성. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C009 | 템플릿 등록/수정 | docs4/V1/D04-수업관리/수업관리.md:2160 | - | `/class-templates` 등록/수정/삭제가 `class_templates`에 저장. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C010 | 강사 상세 | docs4/V1/D04-수업관리/수업관리.md:2259 | - | `/instructor-status` 강사 상세 모달이 기간 내 `classes`를 조회. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C011 | 세션 상세 | docs4/V1/D04-수업관리/수업관리.md:2374 | - | `/lesson-counts`에서 `lesson_counts` 기준 총/사용/잔여/기간/진행률 조회. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C012 | 횟수 조정 | docs4/V1/D04-수업관리/수업관리.md:2470 | - | 수동 추가/차감 시 `lesson_counts.usedCount` 갱신 및 `lesson_count_logs` 변동 이력 저장. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C013 | 차감 이력 | docs4/V1/D04-수업관리/수업관리.md:2548 | - | `lesson_count_logs` 기준 차감/복구 변동량, 사유, 일시 조회. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C014 | 페널티 등록 | docs4/V1/D04-수업관리/수업관리.md:2629 | - | `/penalties` 페널티 등록/해제가 `penalties` 원장에 저장. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C015 | 자동 페널티 정책 | docs4/V1/D04-수업관리/수업관리.md:2713 | - | `/penalties` 자동 페널티 정책이 `lesson_policy_settings`에 저장. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | DLG-C016 | 대안 일정 제시 | docs4/V1/D04-수업관리/수업관리.md:2792 | - | `/schedule-requests` 대안 일정 제시가 `schedule_requests`에 저장. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C001 | 수업 캘린더 | docs4/V1/D04-수업관리/수업관리.md:28 | /calendar | docs4 V2의 `/calendar` 구현을 V1 항목에도 매핑. `classes`/`lesson_bookings` 저장 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C002 | 수업 관리 | docs4/V1/D04-수업관리/수업관리.md:124 | /lessons | `lessons`/`classes` 기반 수업 정의, 수업 기록, 상태 변경, 서명, 정책 저장 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C003 | 시간표 일괄 등록 | docs4/V1/D04-수업관리/수업관리.md:226 | /class-schedule | `class_templates`/`users` 조회, 미리보기, `classes` 일괄 생성 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C004 | 그룹 수업 템플릿 | docs4/V1/D04-수업관리/수업관리.md:314 | /class-templates | `class_templates` 조회/등록/수정/삭제 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C005 | 그룹 수업 현황 | docs4/V1/D04-수업관리/수업관리.md:409 | /class-stats | docs4 V2의 `/class-stats` 구현을 V1 항목에도 매핑. 실제 예약자 명단, 정원 변경, 수업 취소 DB 저장 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C006 | 강사 근무 현황 | docs4/V1/D04-수업관리/수업관리.md:491 | /instructor-status | `users`/`classes`/`lesson_bookings`/`sales`/`consultations` 기반 강사별 현황 조회. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C007 | 횟수 관리 | docs4/V1/D04-수업관리/수업관리.md:600 | /lesson-counts | `lesson_counts` 조회/필터/권한별 조정과 `lesson_count_logs` 이력 저장 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C008 | 페널티 관리 | docs4/V1/D04-수업관리/수업관리.md:678 | /penalties | `penalties` 등록/해제와 `lesson_policy_settings` 자동 정책 저장 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C009 | 일정 요청 처리 | docs4/V1/D04-수업관리/수업관리.md:761 | /schedule-requests<br>/schedule-requests?status=pending<br>/today-tasks | `schedule_requests` 조회/수락/거절/대안 일정 저장 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C011 | 유효 수업 목록 | docs4/V1/D04-수업관리/수업관리.md:875 | /valid-lessons | `lesson_bookings`/`classes`/`members` 조회, 출석/결석/노쇼/서명 상태 저장 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C012 | 대기열 관리 | docs4/V1/D04-수업관리/수업관리.md:985 | /class-waitlist | `lesson_bookings` WAITLIST 조회, `promote_waitlist_booking` RPC 배정, 취소 저장 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C013 | 수업 평가 피드백 | docs4/V1/D04-수업관리/수업관리.md:1066 | /class-feedback | `class_feedbacks` 조회/상세/숨김·노출 검토 저장 연결. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C014 | 수업 출석/완료 확인 | docs4/V1/D04-수업관리/수업관리.md:1172 | /attendance/lesson-completion | 목업 제거. `classes`/`lesson_bookings`/`members`/`lesson_counts`/`attendance` 조회, RPC 기반 출석/완료/노쇼/Push 처리. |
| CLOSED_DB_CONNECTED | V1 | D04-수업관리 | SCR-C016 | 예약 목록 | docs4/V1/D04-수업관리/수업관리.md:1276 | /class-reservations | `lesson_bookings`/`classes`/`members` 조회, 출석/취소/노쇼 처리와 엑셀 다운로드 연결. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P001-상품등록모달 | 상품 등록 모달 | docs4/V1/D05-상품관리/상품관리.md:566 | - | `/products` 우측 상품 패널 신규 상태와 `/products/new`가 `products` 원장에 저장. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P002-전지점배포 | 전 지점 배포 확인 | docs4/V1/D05-상품관리/상품관리.md:658 | - | `/products` 전 지점 배포 모달에서 선택 상품을 대상 지점 `products`로 복제하고 중복 상품은 건너뜀. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P003-작업취소확인 | 작업 취소 확인 | docs4/V1/D05-상품관리/상품관리.md:762 | - | 상품 패널 입력 변경 후 닫기/X 클릭 시 저장되지 않은 변경 취소 확인 표시. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P004-가격이력 | 가격 변경 이력 | docs4/V1/D05-상품관리/상품관리.md:808 | - | 상품 가격 변경 시 `audit_log` 기록, 패널/상세 라우트에서 이력 조회. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P005-상품삭제확인 | 상품 삭제 확인 | docs4/V1/D05-상품관리/상품관리.md:857 | - | 판매 이력 없는 상품은 삭제 최종 확인 후 `products` 삭제. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P006-비활성화안내 | 상품 비활성화 안내 | docs4/V1/D05-상품관리/상품관리.md:903 | - | 완료 매출이 있는 상품은 삭제 대신 `isActive=false` 미사용 전환 안내. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P007-할인규칙등록 | 할인 규칙 등록 | docs4/V1/D05-상품관리/상품관리.md:980 | - | `/discount-settings` 등록 모달이 `discount_policies` 저장 및 `audit_log` 이력 기록. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P008-상품가져오기 | 상품 정보 가져오기 | docs4/V1/D05-상품관리/상품관리.md:1074 | - | 상품 패널에서 기존 `products`를 검색해 신규 등록 폼으로 복사. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P009-할인규칙수정 | 할인 규칙 수정 | docs4/V1/D05-상품관리/상품관리.md:1165 | - | `/discount-settings` 수정 모달이 `discount_policies` 업데이트 및 `audit_log` 이력 기록. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P010-상품삭제최종확인 | 상품 삭제 최종 확인 | docs4/V1/D05-상품관리/상품관리.md:1257 | - | 상품 패널 삭제 확인 후 `products` 삭제, 실패 시 미사용 전환 fallback. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P011-할인규칙삭제확인 | 할인 규칙 삭제 확인 | docs4/V1/D05-상품관리/상품관리.md:1336 | - | 할인 정책 삭제 확인 후 `discount_policies` 삭제 및 `audit_log` 이력 기록. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P012-상품이미지업로드 | 상품 대표 이미지 업로드 | docs4/V1/D05-상품관리/상품관리.md:1407 | - | 상품 패널 이미지 업로드/미리보기/적용을 `products.imageUrl/imageMimeType/imageUpdatedAt`에 저장. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P013-할인정책추가수정 | 복합 할인 정책 추가/수정 | docs4/V1/D05-상품관리/상품관리.md:1494 | - | `discount_policies.conditions`에 적용 기간, 전체/특정 상품 조건을 저장하고 기간/상품 선택 검증 구현. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P014-가격이력조회 | 가격 이력 상세 조회 | docs4/V1/D05-상품관리/상품관리.md:1588 | - | `audit_log` 기반 가격 변경 이력 상세 조회. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P015-할인정책삭제확인 | 할인 정책 삭제 확인 | docs4/V1/D05-상품관리/상품관리.md:1674 | - | 할인 정책 삭제 확인 후 `discount_policies` 삭제 및 이력 기록. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | DLG-P023-시즌가격등록수정 | 시즌 특가 등록/수정 | docs4/V1/D05-상품관리/상품관리.md:1745 | - | `product_seasonal_prices` DB 테이블로 등록/수정/진행중 즉시 종료, 중복 기간 검증 구현. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | SCR-P001 | 상품 관리 | docs4/V1/D05-상품관리/상품관리.md:28 | /products | `products`, `product_groups`, `sales`, `audit_log` 연동 목록/분류/패널/배포 구현. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | SCR-P002 | 상품 등록 | docs4/V1/D05-상품관리/상품관리.md:182 | /products/new | `products` 신규 등록, 요일/시간/옵션 JSON, 분류/가격/상태 저장. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | SCR-P003 | 상품 상세/수정 패널 | docs4/V1/D05-상품관리/상품관리.md:302 | /products/detail | `/products` 우측 패널과 직접 라우트 모두 실제 `products` 원장/판매/가격이력 조회. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | SCR-P004 | 할인 설정 | docs4/V1/D05-상품관리/상품관리.md:408 | /discount-settings | `discount_policies` CRUD와 `audit_log` 변경 이력 조회로 DB 연결. |
| CLOSED_DB_CONNECTED | V1 | D05-상품관리 | SCR-P008 | 시즌 가격 관리 | docs4/V1/D05-상품관리/상품관리.md:450 | /products/seasonal-price | `product_seasonal_prices` + 실제 `products` 선택으로 시즌 특가 CRUD 구현. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-050-001 | 락커 기록 조회 | docs4/V1/D06-시설관리/시설관리.md:447 | /locker | `audit_log` targetType=locker 기준으로 이동/회수/배정/고장/비밀번호·메모 변경 이력 조회. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-050-002 | 락커 이동 | docs4/V1/D06-시설관리/시설관리.md:497 | /locker | `lockers.number` 변경 저장 및 `audit_log` MOVE 이력 기록. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-050-003 | 락커 회수 확인 | docs4/V1/D06-시설관리/시설관리.md:545 | /locker | 회수 확인 후 `lockers` 회원/만료/상태 초기화와 RECLAIM 이력 기록. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-050-004 | 개별 배정 | docs4/V1/D06-시설관리/시설관리.md:593 | /locker | 활성 회원 검색 후 `lockers.memberId/memberName/assignedAt/expiresAt` 저장 및 ASSIGN 이력 기록. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-050-005 | 고장 토글 확인 | docs4/V1/D06-시설관리/시설관리.md:641 | /locker | 고장/해제 확인 후 DB enum `MAINTENANCE/AVAILABLE` 저장 및 이력 기록. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-050-006 | 일괄 배정 | docs4/V1/D06-시설관리/시설관리.md:687 | /locker | 선택 락커 일괄 배정 저장, 각 락커별 `audit_log` BULK_ASSIGN 기록. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-050-007 | 일괄 해제 확인 | docs4/V1/D06-시설관리/시설관리.md:733 | /locker | 만료 임박 락커 일괄 해제 저장, 각 락커별 `audit_log` BULK_RELEASE 기록. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-052-001 | RFID 등록/수정 | docs4/V1/D06-시설관리/시설관리.md:781 | /rfid | `rfid_cards` 등록/수정, 카드번호 형식/중복 검증, 회원/직원 매핑 저장. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-052-002 | RFID 이력 조회 | docs4/V1/D06-시설관리/시설관리.md:863 | /rfid | `audit_log` targetType=rfid_card 기준 등록/수정/분실/해제 이력 조회. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-052-003 | RFID 삭제 확인 | docs4/V1/D06-시설관리/시설관리.md:941 | /rfid | 물리 삭제 대신 `status=해제`, 매핑 제거, DELETE 감사 이력 유지. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-053-001 | 룸 등록/수정 | docs4/V1/D06-시설관리/시설관리.md:1018 | /rooms | `facility_rooms`로 룸명/유형/수용인원/설명 등록 및 수정 저장. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | DLG-053-002 | 룸 삭제 확인 | docs4/V1/D06-시설관리/시설관리.md:1097 | /rooms | 삭제 확인 후 `facility_rooms` 삭제, 실패 시 오류 노출. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | SCR-050 | 락커 관리 | docs4/V1/D06-시설관리/시설관리.md:13 | /locker | `lockers` 원장 조회/상태변경/배정/회수/일괄처리/이력 조회 DB 연결. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | SCR-051 | 사물함 배정 관리 | docs4/V1/D06-시설관리/시설관리.md:79 | /locker/management | 회원 검색+빈 사물함 선택+배정+만료 일괄 해제가 `lockers`에 저장. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | SCR-052 | 밴드/카드 관리 | docs4/V1/D06-시설관리/시설관리.md:170 | /rfid | `rfid_cards` 목록/검색/상태/엑셀/등록/수정/분실/해제 DB 연결. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | SCR-053 | 운동룸 관리 | docs4/V1/D06-시설관리/시설관리.md:255 | /rooms | `facility_rooms` 목록/카드/필터/상태전환/등록/수정/삭제 DB 연결. |
| CLOSED_DB_CONNECTED | V1 | D06-시설관리 | SCR-054 | 골프 타석 관리 | docs4/V1/D06-시설관리/시설관리.md:341 | /golf-bays | `golf_bays`, `golf_waitlist`, `golf_bay_sessions`로 타석 시작/종료/이동/대기열 저장. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | DLG-060-001 | 직원 등록/수정 취소 확인 | docs4/V1/D07-직원관리/직원관리.md:862 | - | `/staff/new`, `/staff/edit`에서 입력 취소 확인 후 목록 복귀. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | DLG-060-002 | 직원 삭제(퇴사 처리) 확인 | docs4/V1/D07-직원관리/직원관리.md:959 | - | `/staff` 선택 퇴사 처리 시 `staff.isActive=false`, `staffStatus=RESIGNED`, 계정 비활성화 동기화. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | DLG-061-001 | 직원 등록 폼 취소 확인 | docs4/V1/D07-직원관리/직원관리.md:1063 | - | 신규 직원 등록 폼 취소 확인 구현. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | DLG-064-001 | 급여 상세 편집 | docs4/V1/D07-직원관리/직원관리.md:1152 | - | 수동 수당/공제와 변경 사유를 `payroll.details`, `bonus`, `deduction`, `netSalary`에 저장. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | DLG-064-002 | 급여 확정 확인 | docs4/V1/D07-직원관리/직원관리.md:1291 | - | 확정/취소 확인 후 `payroll.status`를 DB enum `PAID/PENDING`, `paidAt`과 함께 저장. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | DLG-064-003 | 급여 정책 추가 | docs4/V1/D07-직원관리/직원관리.md:1399 | - | 급여 정책 추가/수정/삭제를 `salary_policies` 원장에 저장. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | SCR-060 | 직원 목록 | docs4/V1/D07-직원관리/직원관리.md:22 | /staff | `staff`, `branches`, `staff_documents` 기반 목록/필터/계약서 첨부 수/퇴사 처리 DB 연결. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | SCR-061 | 직원 등록/수정 | docs4/V1/D07-직원관리/직원관리.md:200 | /staff/new<br>/staff/edit | `staff` 저장, 로그인 계정 동기화, 근로계약서 `staff_documents` 업로드/삭제 연결. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | SCR-062 | 직원 퇴사 처리 | docs4/V1/D07-직원관리/직원관리.md:260 | /staff/resignation | 퇴사 대상 선택, 담당회원 재배정, 예정/즉시 퇴사 처리를 `staff`/회원 담당자 기준으로 저장. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | SCR-063 | 직원 근태 관리 | docs4/V1/D07-직원관리/직원관리.md:360 | /staff/attendance | `staff_attendance` 근태 목록/누락 추가/수동 보정 DB 연결. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | SCR-064 | 급여 관리 | docs4/V1/D07-직원관리/직원관리.md:500 | /payroll | `payroll`, `salary_policies` 기반 급여 조회/편집/확정/확정취소/정책 템플릿 DB 연결. |
| CLOSED_DB_CONNECTED | V1 | D07-직원관리 | SCR-065 | 급여 명세서 | docs4/V1/D07-직원관리/직원관리.md:692 | /payroll/statements | 확정 급여 상세와 발송/재발송/무효/이력을 `payroll_statement_deliveries`에 저장. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-070-001 | 리드 등록/수정 | docs4/V1/D08-마케팅/마케팅.md:1028 | - | `/leads` 리드 등록/수정 모달이 `leads` 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-070-002 | 리드 삭제 확인 | docs4/V1/D08-마케팅/마케팅.md:1144 | - | `/leads` 삭제 확인 후 `leads` 원장에서 삭제됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-071-001 | 수신자 검색 | docs4/V1/D08-마케팅/마케팅.md:1242 | - | `/message` 수신자 검색은 실제 `members` 목록을 조회합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-071-002 | 발송 미리보기 | docs4/V1/D08-마케팅/마케팅.md:1347 | - | `/message` 발송 미리보기 후 `messages`에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-072-001 | 알림 규칙 편집 | docs4/V1/D08-마케팅/마케팅.md:1448 | - | `/message/auto-alarm` 알림 규칙 편집이 `auto_alarm_settings.steps/events`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-072-002 | 알림 트리거 추가 | docs4/V1/D08-마케팅/마케팅.md:1546 | - | `/message/auto-alarm` 지점 step 추가가 `auto_alarm_settings.steps`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-073-001 | 쿠폰 생성/수정 | docs4/V1/D08-마케팅/마케팅.md:1654 | - | `/message/coupon` 쿠폰 생성/수정이 `coupons`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-073-002 | 쿠폰 발급 | docs4/V1/D08-마케팅/마케팅.md:1760 | - | `/message/coupon` 쿠폰 발급이 회원별 `coupon_issuance_logs`로 남습니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-073-003 | 쿠폰 삭제 확인 | docs4/V1/D08-마케팅/마케팅.md:1864 | - | `/message/coupon` 발급 이력 없는 쿠폰만 삭제 확인 후 비활성화합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-074-001 | 적립 규칙 편집 | docs4/V1/D08-마케팅/마케팅.md:1968 | - | `/mileage` 적립 정책 편집이 `mileage_policy_settings`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-074-002 | 수동 적립·차감 | docs4/V1/D08-마케팅/마케팅.md:2078 | - | `/mileage` 수동 적립·차감이 `members.mileage`와 `mileage_logs`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-076-001 | 캠페인 등록 | docs4/V1/D08-마케팅/마케팅.md:2190 | - | `/marketing/campaign` 캠페인 등록이 `marketing_campaigns`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-076-002 | 캠페인 삭제 확인 | docs4/V1/D08-마케팅/마케팅.md:2284 | - | `/marketing/campaign` 캠페인 삭제 확인 후 `marketing_campaigns`에서 삭제됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-077-001 | 리퍼럴 이벤트 등록 | docs4/V1/D08-마케팅/마케팅.md:2378 | - | `/marketing/referral` 리퍼럴 이벤트 등록/편집이 `referral_events`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-077-002 | 리퍼럴 이벤트 삭제 확인 | docs4/V1/D08-마케팅/마케팅.md:2477 | - | `/marketing/referral` 리퍼럴 이벤트 삭제 확인 후 `referral_events`에서 삭제됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-078-001 | 발송 대상 선택 | docs4/V1/D08-마케팅/마케팅.md:2566 | - | `/marketing/sms` 발송 대상 선택과 예상 수신자 계산을 발송 이력 저장 흐름에 연결했습니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-078-002 | 발송 확인 | docs4/V1/D08-마케팅/마케팅.md:2657 | - | `/marketing/sms` 발송 확인 후 `bulk_send_histories`와 `messages`에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-079-001 | A/B 테스트 등록 | docs4/V1/D08-마케팅/마케팅.md:2750 | - | `/marketing/ab-test` A/B 테스트 등록이 `ab_tests`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | DLG-079-002 | A/B 테스트 삭제 확인 | docs4/V1/D08-마케팅/마케팅.md:2763 | - | `/marketing/ab-test` A/B 테스트 삭제 확인 후 `ab_tests`에서 삭제됩니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | SCR-070 | 리드 관리 | docs4/V1/D08-마케팅/마케팅.md:21 | /leads | `leads` 원장에 문의유형 컬럼을 보강하고 등록/수정/삭제를 DB 기준으로 유지합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | SCR-071 | 메시지 발송 | docs4/V1/D08-마케팅/마케팅.md:139 | /message | `messages` + 실제 `members` 수신자 검색으로 즉시/예약 발송 이력을 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | SCR-072 | 자동 알림 설정 | docs4/V1/D08-마케팅/마케팅.md:248 | /message/auto-alarm | `auto_alarm_settings`로 지점 자동 알림 step/event/전체 ON-OFF/발신번호를 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | SCR-072A | 자동알림 운영현황 | docs4/V1/D08-마케팅/마케팅.md:373 | /message/auto-alarm | 동일 `/message/auto-alarm` 내 운영현황 탭을 유지하고 설정은 `auto_alarm_settings` 기준으로 연동합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | SCR-073 | 쿠폰 관리 | docs4/V1/D08-마케팅/마케팅.md:475 | /message/coupon | `coupons`, `coupon_issuance_logs`로 쿠폰 생성/수정/발급/이력/삭제 확인을 DB 연결했습니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | SCR-074 | 마일리지 관리 | docs4/V1/D08-마케팅/마케팅.md:579 | /mileage | `members.mileage`, `mileage_logs`, `mileage_policy_settings`로 현황/이력/정책/수동 적립·차감을 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | SCR-075 | 전자 계약 | docs4/V1/D08-마케팅/마케팅.md:685 | /contracts/new | `electronic_contracts`로 회원 계약과 직원 근로계약 대상 검색, 임시저장, 현장서명, 원격 서명 대기, 재발송 이력을 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | SCR-076 | 캠페인 관리 | docs4/V1/D08-마케팅/마케팅.md:807 | /marketing/campaign | `marketing_campaigns`로 캠페인 등록/삭제/실적 지표를 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | SCR-078 | SMS/카카오 대량 발송 | docs4/V1/D08-마케팅/마케팅.md:898 | /marketing/sms | `bulk_send_histories`, `sms_templates`, `messages`로 대량 발송, 예약, 비용, 템플릿 편집, 이력을 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D08-마케팅 | SCR-079 | A/B 테스트 | docs4/V1/D08-마케팅/마케팅.md:1016 | /marketing/ab-test | `ab_tests`로 A/B 테스트 생성/삭제/실적 표시를 저장하고 V2/후속 빨간 표시를 유지합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-080-001 | 미저장 경고 | docs4/V1/D09-설정관리/설정관리.md:1270 | /settings | 센터 설정 탭 이동 시 미저장 경고, 저장 후 이동, 폐기 후 이동을 처리합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-080A-001 | 정책 적용 확인 | docs4/V1/D09-설정관리/설정관리.md:1340 | /settings/automation | 자동화 정책의 본사 기본값 복원/저장이 `branch_settings`에 유지됩니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-081-001 | 권한 초기화 확인 | docs4/V1/D09-설정관리/설정관리.md:1438 | /settings/permissions | 권한 초기화 확인 후 역할별 권한 설정을 `branch_settings`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-081-002 | 권한 충돌 경고 | docs4/V1/D09-설정관리/설정관리.md:1509 | /settings/permissions | 권한 변경 영향/충돌 안내와 민감 권한 저장을 역할별 DB 설정으로 유지합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-081-003 | 역할 생성 | docs4/V1/D09-설정관리/설정관리.md:1583 | /settings/permissions | 권한 설정 화면에서 역할 생성/복사/삭제 목록을 `permission_roles` 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-081-004 | 역할 삭제 확인 | docs4/V1/D09-설정관리/설정관리.md:1660 | /settings/permissions | 역할 삭제 확인 후 역할 목록과 권한 상태를 DB 설정으로 갱신합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-081-005 | 역할 복사 | docs4/V1/D09-설정관리/설정관리.md:1735 | /settings/permissions | 역할 복사로 생성된 권한 역할이 새로고침 후에도 유지됩니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-081-006 | 역할 변경 영향 분석 | docs4/V1/D09-설정관리/설정관리.md:1811 | /settings/permissions | 권한 변경 영향 배너와 차이 감지가 저장본 대비로 동작합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-084-001 | 플랜 변경 확인 | docs4/V1/D09-설정관리/설정관리.md:1906 | /subscription | 플랜 변경 확인 후 구독 설정과 청구 이력을 `branch_settings.subscription_settings`에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-084-002 | 구독 해지 확인 | docs4/V1/D09-설정관리/설정관리.md:2004 | /subscription | 구독 해지 신청 상태가 `cancel_pending`으로 저장되어 새로고침 후 유지됩니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-085-001 | 공지 등록·수정 | docs4/V1/D09-설정관리/설정관리.md:2105 | /notices | 공지 제목/내용/게시 대상/게시 기간을 `notices`에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-085-002 | 공지 삭제 확인 | docs4/V1/D09-설정관리/설정관리.md:2193 | /notices | 공지 삭제 확인 후 `notices`에서 삭제하고 읽음 이력과 함께 조회됩니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-087-001 | 역할 삭제 재배정 | docs4/V1/D09-설정관리/설정관리.md:2272 | /settings/custom-role | 커스텀 역할 삭제/재배정 결과가 `custom_roles` 설정으로 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-089-001 | 데이터 복원 확인 | docs4/V1/D09-설정관리/설정관리.md:2348 | /settings/backup | 복원 사유 입력과 복원 이력을 `backup_restore_settings`에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | DLG-089-002 | 백업 설정 | docs4/V1/D09-설정관리/설정관리.md:2435 | /settings/backup | 자동 백업 주기/시각/보관기간과 수동 백업 이력을 DB 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-080 | 센터 설정 | docs4/V1/D09-설정관리/설정관리.md:30 | /settings | 센터 기본정보, 알림, 테마, 물품 설정 저장/미저장 경고/영향도 표시를 유지합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-080A | 지점 자동화 적용 | docs4/V1/D09-설정관리/설정관리.md:142 | /settings/automation | 자동화 step/자산 회수 정책을 `branch_settings.automation_apply_settings`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-081 | 권한 설정 | docs4/V1/D09-설정관리/설정관리.md:282 | /settings/permissions | 역할 목록, 메뉴 권한, 민감 권한을 역할별 `branch_settings`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-082 | 키오스크 설정 | docs4/V1/D09-설정관리/설정관리.md:447 | /settings/kiosk | 키오스크 기본/화면/TTS/출입/락커 후처리 설정을 `kiosk_settings`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-082A | 키오스크 IoT 설정 | docs4/V1/D09-설정관리/설정관리.md:542 | /settings/iot | 키오스크 IoT 기기/출입 규칙/전원 스케줄을 `iot_settings`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-083 | IoT 출입 관리 | docs4/V1/D09-설정관리/설정관리.md:636 | /settings/iot | IoT 출입 정책과 기기 상태/스케줄 저장 흐름을 동일 DB 설정으로 유지합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-084 | 구독 결제 관리 | docs4/V1/D09-설정관리/설정관리.md:762 | /subscription | 현재 플랜, 결제 수단, 청구 이력, 플랜 변경/해지 상태를 DB 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-085 | 공지사항 관리 | docs4/V1/D09-설정관리/설정관리.md:882 | /notices | 공지 목록/검색/게시 대상/게시 기간/읽음 이력을 `notices`, `notice_read_receipts`로 연결했습니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-086 | 출석 관리 설정 | docs4/V1/D09-설정관리/설정관리.md:972 | /settings/attendance | 출석 정책 설정을 `attendance_settings`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-087 | 커스텀 역할 생성 | docs4/V1/D09-설정관리/설정관리.md:1084 | /settings/custom-role | 커스텀 역할 생성/수정/삭제/재배정 설정을 DB에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D09-설정관리 | SCR-089 | 데이터 백업·복원 | docs4/V1/D09-설정관리/설정관리.md:1171 | /settings/backup | 백업 설정, 수동 백업, 복원 이력을 `backup_restore_settings`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | DLG-092-001 | 신규 지점 등록 | docs4/V1/D10-본사관리/본사관리.md:719 | /branches | 신규 지점 등록은 `branches` 원장에 저장되고 지점별 회원/매출 요약과 함께 조회됩니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | DLG-092-002 | 지점 비활성화 확인 | docs4/V1/D10-본사관리/본사관리.md:837 | /branches | 지점 비활성화는 활성 회원/직원 존재 여부를 확인한 뒤 `branches` 상태를 갱신합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | DLG-094-001 | 매출 목표 설정 | docs4/V1/D10-본사관리/본사관리.md:953 | /kpi | KPI 월 매출 목표를 `branch_settings.kpi_monthly_target_*`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | DLG-098-001 | 태스크 추가 | docs4/V1/D10-본사관리/본사관리.md:1017 | /today-tasks | 본사 직접 등록 태스크를 `today_tasks_custom` DB 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | DLG-098-002 | 태스크 상세 수정 | docs4/V1/D10-본사관리/본사관리.md:1067 | /today-tasks | 태스크 수정/삭제/상태 오버라이드가 DB 설정에 유지됩니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | DLG-H1001-001 | 정책 세트 편집 | docs4/V1/D10-본사관리/본사관리.md:1118 | /hq/automation-policies | 자동화 정책 세트 생성/범위/지점 수정 허용 수준을 `hq_automation_policy_sets`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | SCR-092 | 지점 관리 | docs4/V1/D10-본사관리/본사관리.md:21 | /branches | `branches`, `members`, `sales` 기반 지점 목록/상세/생성/비활성화 흐름을 유지합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | SCR-093 | 지점 성과 리포트 | docs4/V1/D10-본사관리/본사관리.md:151 | /branch-report | 지점별 회원/신규/활성/만료/매출/출석 지표를 Supabase 원장으로 집계합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | SCR-094 | KPI 대시보드 | docs4/V1/D10-본사관리/본사관리.md:1221 | /kpi | 회원/매출/출석/상담/수업 KPI를 실제 원장으로 집계하고 목표를 DB 설정에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | SCR-095 | KPI 센터 | docs4/V1/D10-본사관리/본사관리.md:269 | /kpi-preview | `/api/kpi-center` Supabase snapshot 기반 보드를 표시하고 갱신합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | SCR-097 | 히스토리 로그 | docs4/V1/D10-본사관리/본사관리.md:389 | /audit-log | `audit_log` 조회, 필터, 페이지네이션, CSV 내보내기를 연결했습니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | SCR-098 | 오늘의 할 일 | docs4/V1/D10-본사관리/본사관리.md:450 | /today-tasks<br>/schedule-requests?status=pending | 날짜/지점/역할 기반 업무와 본사 직접 등록 업무를 표시하고 직접 입력분은 DB 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | SCR-099 | 리포트 생성 | docs4/V1/D10-본사관리/본사관리.md:544 | /reports | 매출/회원/출석 원장 기반 리포트 생성, 미리보기, 다운로드 흐름을 유지합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | SCR-H1001 | 자동화 정책 라이브러리 | docs4/V1/D10-본사관리/본사관리.md:1402 | /hq/automation-policies | 정책 세트 목록/생성/편집을 DB 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D10-본사관리 | SCR-H1004 | 예측 분석 | docs4/V1/D10-본사관리/본사관리.md:606 | /analytics/forecast | Supabase snapshot 기반 예측 지표와 이탈 위험 회원을 표시하며 스냅샷 갱신 버튼을 제공합니다. |
| CLOSED_DB_CONNECTED | V1 | D11-통합운영 | DLG-I001 | 수동 출석 등록 | docs4/V1/D11-통합운영/통합운영.md:833 | /attendance | 회원 검색 후 수동 출석 등록이 `attendance` 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D11-통합운영 | DLG-I002 | 옷 락커 배정 | docs4/V1/D11-통합운영/통합운영.md:935 | /clothing-locker | 당일 출석 미배정 회원을 조회하고 배정/회수 상태를 날짜별 `branch_settings`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D11-통합운영 | DLG-I003 | 체성분 수기 등록 | docs4/V1/D11-통합운영/통합운영.md:763 | /body-composition | 회원 검색, 체성분 등록/수정이 `body_compositions` 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V1 | D11-통합운영 | SCR-I001 | 통합 출석 관리 | docs4/V1/D11-통합운영/통합운영.md:32 | /attendance | `attendance` 조회/수동 등록/실시간 갱신 흐름을 유지합니다. |
| CLOSED_DB_CONNECTED | V1 | D11-통합운영 | SCR-I003 | IoT 연동 관리 | docs4/V1/D11-통합운영/통합운영.md:196 | /settings/iot | IoT 기기/알림/이력 보관 설정을 `branch_settings.iot_settings`로 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D11-통합운영 | SCR-I004 | 옷 락커 운영 관리 | docs4/V1/D11-통합운영/통합운영.md:243 | /clothing-locker | 당일 옷 락커 현황, 미배정 회원, 배정/회수 상태를 DB 설정으로 유지합니다. |
| CLOSED_DB_CONNECTED | V1 | D11-통합운영 | SCR-I005 | 고정 물품 락커 관리 | docs4/V1/D11-통합운영/통합운영.md:356 | /locker/management | 고정 락커 배정/만료/일괄 해제를 `lockers` 원장과 감사 로그에 저장합니다. |
| CLOSED_DB_CONNECTED | V1 | D11-통합운영 | SCR-I006 | 체성분 통합 관리 | docs4/V1/D11-통합운영/통합운영.md:476 | /body-composition | `members`와 `body_compositions` 기준으로 회원 검색, 측정 이력, 목표를 표시합니다. |
| CLOSED_DB_CONNECTED | V1 | D11-통합운영 | SCR-I007 | 회원 건강 연동 요약 | docs4/V1/D11-통합운영/통합운영.md:591 | /members/health | `members`, `attendance`, `lockers`, `body_compositions`, `lesson_bookings/classes` 기준으로 건강 요약을 표시합니다. |
| CLOSED_DB_CONNECTED | V1 | D11-통합운영 | SCR-I008 | 키오스크 운영 현황 | docs4/V1/D11-통합운영/통합운영.md:718 | /kiosk-ops | 기기 목록/상태 메모/원격 재시작 요청 이력을 `branch_settings.kiosk_ops_devices`로 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | DLG-000 | 세션 만료 | docs4/V2/D01-공통/공통.md:561 | 공통 인증 가드 | 세션 만료 안내와 재로그인 복귀 흐름을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | DLG-001 | 로그아웃 확인 | docs4/V2/D01-공통/공통.md:617 | AppHeader<br>/logout | 헤더 로그아웃과 `/logout` route 모두 확인 후 세션 종료하도록 보강했습니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | DLG-002 | 이탈 경고 | docs4/V2/D01-공통/공통.md:665 | 공통 적용 화면 | 회원 등록, 상품 등록/상세, 설정 화면의 미저장 변경 경고 패턴을 적용 상태로 확인했습니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | DLG-003 | 삭제 확인 | docs4/V2/D01-공통/공통.md:712 | 공통 적용 화면 | 회원 상세, 상품, 수업, 마케팅, 설정 등 삭제 액션에 확인 다이얼로그 패턴을 적용 상태로 확인했습니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | DLG-004 | 저장 확인 | docs4/V2/D01-공통/공통.md:760 | /profile 외 | 프로필 저장 확인과 POS/설정 저장 확인 패턴을 적용 상태로 확인했습니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | SCR-101 | 대시보드 통합 | docs4/V2/D01-공통/공통.md:38 | / | `members`, `attendance`, `sales`, `audit_log` 기반 대시보드 통합 화면을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | SCR-102 | 사이드바 네비게이션 | docs4/V2/D01-공통/공통.md:138 | 공통 레이아웃 | 역할/슈퍼관리자/지점 범위에 따른 사이드바와 본사/지점 구분 UI를 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | SCR-103 | 글로벌 검색 | docs4/V2/D01-공통/공통.md:199 | 공통 레이아웃 | Cmd/Ctrl+K 검색에서 메뉴, 회원, 직원, 수업, 상품, 공지를 실제 DB 기준으로 조회합니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | SCR-105 | 프로필 / 계정 설정 | docs4/V2/D01-공통/공통.md:257 | /profile | 프로필 이름/연락처를 `branch_settings.profile_settings_*`에 저장하고 사용자명은 `users.name` 갱신을 시도합니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | SCR-106 | 비밀번호 재설정 | docs4/V2/D01-공통/공통.md:333 | /reset-password | Supabase 비밀번호 재설정 메일 발송과 recovery 세션 비밀번호 변경 흐름을 연결했습니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | SCR-107 | 화면설계서 오버레이 (Cmd+/) | docs4/V2/D01-공통/공통.md:396 | 공통 레이아웃 | Cmd/Ctrl+/로 `DesignDocPanel`을 열고 현재 route의 기획 문서를 표시합니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | SCR-108 | 에러 페이지 | docs4/V2/D01-공통/공통.md:451 | /error | 403/404/500/503 안내와 기본 업무 화면 복귀 액션을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D01-공통 | SCR-109 | 로그아웃 | docs4/V2/D01-공통/공통.md:506 | /logout | `/logout` route를 추가하고 확인 후 auth store/localStorage 세션을 초기화합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M001 | 회원 상태 변경 확인 | docs4/V2/D02-회원관리/회원관리.md:291 | /members | 선택 회원 상태 변경 모달이 members 원장 status를 갱신합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M002 | 회원 삭제 확인 | docs4/V2/D02-회원관리/회원관리.md:312 | /members/detail | 회원 상세 삭제 확인 후 members.deletedAt/status를 갱신합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M003 | 홀딩 등록 | docs4/V2/D02-회원관리/회원관리.md:363 | /members/detail?tab=detail_history | 홀딩 등록은 member_holdings 원장과 회원 상태/만료일 정책 흐름으로 처리합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M004 | 홀딩 해제 | docs4/V2/D02-회원관리/회원관리.md:410 | /members/detail?tab=detail_history | 홀딩 해제/취소는 member_holdings 및 회원 상태 복구 흐름으로 처리합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M005 | 탈퇴 처리 | docs4/V2/D02-회원관리/회원관리.md:457 | /members/detail | 탈퇴 처리는 members.status/WITHDRAWN, withdrawnAt, withdrawReason을 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M006 | 전화번호 중복 안내 | docs4/V2/D02-회원관리/회원관리.md:478 | /members/new | 회원 등록/수정에서 지점 내 전화번호 중복을 Supabase members 조회로 차단합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M007 | 작업 취소 확인 | docs4/V2/D02-회원관리/회원관리.md:525 | /members/new | 회원 등록/수정 이탈 시 작업 취소 확인 다이얼로그를 표시합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M008 | 입력 폼 초기화 확인 | docs4/V2/D02-회원관리/회원관리.md:572 | /members/new | 회원 등록 폼 초기화 확인 후 입력 상태를 리셋합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M009 | 메모 추가 | docs4/V2/D02-회원관리/회원관리.md:619 | /members/detail?tab=memo | 회원 상세 메모 추가가 member_memos 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M010 | 메모 삭제 확인 | docs4/V2/D02-회원관리/회원관리.md:670 | /members/detail?tab=memo | 회원 상세 메모 삭제 확인 후 member_memos에서 삭제합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M011 | 상담 등록/수정 | docs4/V2/D02-회원관리/회원관리.md:721 | /members/detail?tab=consultation | 상담 등록/수정은 consultations 원장과 연결 매출을 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M012 | 상담 기록 삭제 확인 | docs4/V2/D02-회원관리/회원관리.md:772 | /members/detail?tab=consultation | 상담 삭제 확인 후 consultations 원장을 갱신합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M013 | 환불 처리 | docs4/V2/D02-회원관리/회원관리.md:823 | /members/detail?tab=payment | 회원 결제 이력의 환불 액션은 결제 취소/부분 환불 화면과 sales/refund 원장으로 연결됩니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M014 | 결제 상세 조회 | docs4/V2/D02-회원관리/회원관리.md:908 | /members/detail?tab=payment_detail | 결제 상세는 sales와 sale_payment_lines를 조회해 결제수단별 수납 정보를 표시합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M015 | 체성분 등록 | docs4/V2/D02-회원관리/회원관리.md:987 | /body-composition | 체성분 등록은 body_compositions 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M016 | 체성분 덮어쓰기 | docs4/V2/D02-회원관리/회원관리.md:1034 | /body-composition | 동일일자 체성분 덮어쓰기/수정은 body_compositions update 흐름으로 처리합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M017 | 목표 설정 | docs4/V2/D02-회원관리/회원관리.md:1085 | /body-composition | 체성분 목표 설정은 body_compositions/목표 상태 저장 흐름으로 처리합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M018 | 연장 등록 | docs4/V2/D02-회원관리/회원관리.md:1140 | /members/detail?tab=detail_history | 연장 등록은 member_extensions 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M019 | 양도 처리 | docs4/V2/D02-회원관리/회원관리.md:1187 | /members/detail?tab=detail_history | 양도 이력은 member_transfer_logs 원장 조회 흐름으로 표시합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M020 | 쿠폰 적용 | docs4/V2/D02-회원관리/회원관리.md:1234 | /members/detail?tab=detail_history | 쿠폰 적용/조회는 member_coupons 및 쿠폰 이력 화면에서 처리합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M021 | 마일리지 조정 | docs4/V2/D02-회원관리/회원관리.md:1281 | /members/detail | 마일리지 조정은 members.mileage 갱신과 audit_log 기록으로 처리합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M022 | 수동 출석 | docs4/V2/D02-회원관리/회원관리.md:1386 | /members/detail | 회원 상세 수동 출석은 attendance 원장에 저장하고 lastVisitAt을 갱신합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M023 | 이관 확인 | docs4/V2/D02-회원관리/회원관리.md:1407 | /members/transfer | 회원 지점 이관 확인 후 members.branchId와 member_transfer_log를 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M024 | 종합 평가 등록 | docs4/V2/D02-회원관리/회원관리.md:1428 | /members/detail?tab=evaluation | 종합 평가는 member_evaluations 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M025 | 운동 프로그램 배정 | docs4/V2/D02-회원관리/회원관리.md:1483 | /members/detail?tab=exerciseProgram | 운동 프로그램 배정은 member_exercise_programs 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M026 | 운동 이력 등록 | docs4/V2/D02-회원관리/회원관리.md:1592 | /members/detail?tab=exerciseLog | 운동 이력은 exercise_logs 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M027 | 주소 검색 | docs4/V2/D02-회원관리/회원관리.md:1647 | /members/new | 주소 검색 모달은 회원 등록/수정 폼에 주소 값을 반영합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M028 | 회원 병합 확인 | docs4/V2/D02-회원관리/회원관리.md:1694 | /members/merge | 회원 병합 확인 후 관련 memberId 이력을 이전하고 member_merge_logs에 기록합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M029 | 가족 연결 | docs4/V2/D02-회원관리/회원관리.md:1747 | /members/family | 가족 연결은 member_family_groups/member_family_members 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | DLG-M030 | 등급 변경 | docs4/V2/D02-회원관리/회원관리.md:1798 | /members/grade | 등급 변경/기준 설정은 member_grade_settings/member_grade_rules에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | SCR-M001 | 회원 목록 | docs4/V2/D02-회원관리/회원관리.md:38 | /members | members 원장 기반 목록, 필터, 상태 탭, 선택 액션을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | SCR-M002 | 회원 등록 | docs4/V2/D02-회원관리/회원관리.md:81 | /members/new | 회원 등록은 members 원장 생성과 중복 연락처 검증을 연결합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | SCR-M003 | 회원 수정 | docs4/V2/D02-회원관리/회원관리.md:93 | /members/edit | 회원 수정은 members 원장 갱신과 취소/초기화 확인을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | SCR-M004 | 회원 상세 | docs4/V2/D02-회원관리/회원관리.md:111 | /members/detail | 회원 상세는 members, sales, attendance, body_compositions, lockers, contracts 및 서브 원장을 통합 조회합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | SCR-M005 | 회원 이관 | docs4/V2/D02-회원관리/회원관리.md:241 | /members/transfer | 회원 지점 이관은 사전 체크 후 members.branchId와 member_transfer_log를 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | SCR-M006 | 체성분 관리 | docs4/V2/D02-회원관리/회원관리.md:253 | /body-composition | 체성분 관리는 회원 검색과 body_compositions 등록/수정/목표 흐름을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D02-회원관리 | SCR-M009 | 등급 관리 | docs4/V2/D02-회원관리/회원관리.md:274 | /members/grade | 등급 관리는 결제금액/이용기간/방문횟수 조건과 혜택을 DB에 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S001 | 매출 상세 | docs4/V2/D03-매출관리/매출관리.md:794 | /sales | `sales` 원장 기준 매출 상세 모달에서 결제/할인/수납/서비스/메모를 조회합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S002 | 구매자 검색 | docs4/V2/D03-매출관리/매출관리.md:831 | /pos | POS 구매자 검색이 `members` 원장 조회로 회원 선택을 연결합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S003 | 결제 확인 | docs4/V2/D03-매출관리/매출관리.md:873 | /pos/payment | CRM 내부 승인번호 1개와 상품별 `sale_payment_lines` 수납 행을 저장하는 결제 확인 모달로 구현했습니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S004 | 중복 결제 경고 | docs4/V2/D03-매출관리/매출관리.md:917 | /pos/payment | 최근 동일 회원/동일 금액 중복 감지 후 계속 진행 확인 다이얼로그를 표시합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S005 | 메모 편집 | docs4/V2/D03-매출관리/매출관리.md:954 | /sales | 매출 상세에서 `sales.memo` 편집/저장과 1000자 검증을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S006 | 환불 상세 | docs4/V2/D03-매출관리/매출관리.md:1000 | /refunds | 환불 관리 목록 클릭 시 `sales` 환불 행 기준 환불 상세 다이얼로그를 표시합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S007 | 할부 상세 | docs4/V2/D03-매출관리/매출관리.md:1046 | /sales/installment | `installment_contracts`와 `installment_rounds` 기반 회차 펼침/납입 현황 조회를 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S008 | 납입 처리 | docs4/V2/D03-매출관리/매출관리.md:1064 | /sales/installment | `process_installment_round_payment` RPC로 회차 납입, 결제수단 증빙, 원 매출 미수 동기화를 처리합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S009 | 할부 등록 | docs4/V2/D03-매출관리/매출관리.md:1122 | /sales/installment | 회원/상품 선택, 선납금, 총 할부금액, 회차, 첫 납입월 입력 후 DB 계약/회차를 생성합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S010 | 세금계산서 상세 | docs4/V2/D03-매출관리/매출관리.md:1140 | /sales/invoice | `tax_invoices`와 `tax_invoice_items` 기반 상세 조회, 품목/공급가액/부가세/전송 이력을 표시합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S011 | 세금계산서 발행 | docs4/V2/D03-매출관리/매출관리.md:1158 | /sales/invoice | 법인/사업자 완료 매출을 발행 대상으로 구성하고 발행 폼 입력값을 DB에 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S012 | 목표 매출 설정 | docs4/V2/D03-매출관리/매출관리.md:1176 | /sales/forecast | `sales_forecast_targets`에 기간별 목표를 저장하고 1억원 이상은 승인 대기 상태로 남깁니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S013 | 환불 처리 | docs4/V2/D03-매출관리/매출관리.md:1219 | /sales/cancel-refund | 환불 대상 검색, 수기 산식, 처리 상태, 상품별 환불 배분을 `sales`와 `sale_payment_lines`에 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S014 | 환불 상세 결과 | docs4/V2/D03-매출관리/매출관리.md:1269 | /sales/cancel-refund | 환불 처리 결과 상태와 환불 관리 이동 액션을 제공하고 처리 후 목록을 재조회합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | DLG-S015 | 환불 요청 | docs4/V2/D03-매출관리/매출관리.md:1319 | /sales/cancel-refund | 요청/승인대기/완료 상태를 선택해 `sales.status`의 REFUND 계열 상태로 저장합니다. |
| CLOSED_V2_FOLLOWUP_VISIBLE | V2 | D03-매출관리 | DLG-S016 | 결제링크 발송 | docs4/V2/D03-매출관리/매출관리.md:1359 | /sales<br>/unpaid<br>/pos/payment | PG 결제링크는 V2/후속으로 빨간 표시와 발송 준비 모달만 제공합니다. 실제 자동 발송/Webhook은 붙이지 않았습니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S001 | 매출 현황 | docs4/V2/D03-매출관리/매출관리.md:38 | /sales | `sales` 원장 기반 매출 현황, 탭, 필터, 상세, 엑셀 다운로드를 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S002 | POS 판매 | docs4/V2/D03-매출관리/매출관리.md:105 | /pos | `products`와 `members` 기준 POS 상품 선택, 장바구니, 구매자 연결을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S003 | 결제 처리 | docs4/V2/D03-매출관리/매출관리.md:218 | /pos/payment | `sales`, `sale_payment_lines`, `contracts` 저장과 영수증 파일 업로드, 분할 수납 검증을 연결합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S004 | 매출 통계 | docs4/V2/D03-매출관리/매출관리.md:359 | /sales/stats | `sales` 완료 매출 기준 기간/상품/결제수단/담당자 통계를 산출합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S005 | 통계 관리 | docs4/V2/D03-매출관리/매출관리.md:389 | /sales/statistics-management | `sales`와 `members` 기준 통계 관리 화면, 필터, 월별 비교, 다운로드를 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S006 | 선수익금 조회 | docs4/V2/D03-매출관리/매출관리.md:435 | /deferred-revenue | `deferred_revenue` 원장을 우선 조회하고 데이터가 없으면 완료 매출 기준 선수익금을 산출합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S007 | 환불 관리 | docs4/V2/D03-매출관리/매출관리.md:477 | /refunds<br>/sales/cancel-refund | `sales` 환불 상태 목록과 결제 취소/부분 환불 처리 화면을 연결합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S008 | 미수금 관리 | docs4/V2/D03-매출관리/매출관리.md:529 | /unpaid | `sales.unpaid` 조회와 `process_unpaid_collection` RPC, `unpaid_collections` 납부 이력을 연결합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S009 | 할부결제 관리 | docs4/V2/D03-매출관리/매출관리.md:625 | /sales/installment | `installment_contracts`, `installment_rounds` 기반 할부 계약/회차/납입/엑셀 다운로드를 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S010 | 세금계산서 발행 | docs4/V2/D03-매출관리/매출관리.md:658 | /sales/invoice | `tax_invoices`, `tax_invoice_items`로 발행 대상 산출/발행 이력/상세/전송 상태를 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S011 | 매출 예측 | docs4/V2/D03-매출관리/매출관리.md:687 | /sales/forecast | `sales` 완료 매출 기반 예측, 상품 기여도, 목표 설정 DB 저장을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D03-매출관리 | SCR-S012 | 결제 취소 / 부분 환불 | docs4/V2/D03-매출관리/매출관리.md:719 | /sales/cancel-refund | CRM 내부 승인번호와 상품별 수납 행 기준 전체 취소/부분 환불/수납행 취소 미수 전환을 처리합니다. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | DLG-C001 | 수업 등록/수정 (캘린더) | docs4/V2/D04-수업관리/수업관리.md:519 | - | `/calendar` 등록/수정이 `classes`와 `lesson_bookings`에 저장. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | DLG-C002 | 일정 상세 | docs4/V2/D04-수업관리/수업관리.md:544 | - | `/calendar` 상세/수정/삭제/승인/거절 저장 연결. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | DLG-C003 | 수업 등록/수정 (관리) | docs4/V2/D04-수업관리/수업관리.md:577 | - | V1 `/lessons` 구현과 동일 원장(`lessons`)에 저장. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | DLG-C004 | 일괄 변경 | docs4/V2/D04-수업관리/수업관리.md:596 | - | V1 `/lessons` 일괄 변경/취소가 `classes`에 반영. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | DLG-C005 | 수업 기록 상세 | docs4/V2/D04-수업관리/수업관리.md:625 | - | `classes` 상태/서명/완료 이력 조회. 운동 프로그램 기록은 `exercise_programs`/배정 원장으로 분리. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | DLG-C006 | 서명 | docs4/V2/D04-수업관리/수업관리.md:666 | - | `classes.signature_url/signature_at` 저장 및 완료 처리 연동. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | DLG-C009 | 템플릿 등록/수정 | docs4/V2/D04-수업관리/수업관리.md:685 | - | `class_templates` 등록/수정/삭제 연결. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | DLG-C010 | 강사 상세 | docs4/V2/D04-수업관리/수업관리.md:697 | - | `/instructor-status` 상세 모달이 `classes` 조회. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | DLG-C011 | 세션 상세 | docs4/V2/D04-수업관리/수업관리.md:716 | - | `/lesson-counts` 세션 상세와 `/exercise-programs` 회원 배정 원장 연결. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C001 | 수업 캘린더 | docs4/V2/D04-수업관리/수업관리.md:39 | /calendar | `classes`/`lesson_bookings` 저장 기반 캘린더 등록/상세/수정/삭제 연결. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C002 | 수업 관리 | docs4/V2/D04-수업관리/수업관리.md:75 | /lessons | V1 `/lessons` 구현으로 매핑. 수업 정의/기록/정책 저장 연결. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C004 | 그룹 수업 템플릿 | docs4/V2/D04-수업관리/수업관리.md:94 | /class-templates | V1 `/class-templates` 구현으로 매핑. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C005 | 그룹 수업 현황 | docs4/V2/D04-수업관리/수업관리.md:106 | /class-stats | `classes`/`lesson_bookings`/`members` 기반 통계, 실제 예약자 드로어, 정원 조정, 수업 취소 저장 연결. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C006 | 강사 근무 현황 | docs4/V2/D04-수업관리/수업관리.md:151 | /instructor-status | V1 `/instructor-status` 구현으로 매핑. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C010 | 운동 프로그램 관리 | docs4/V2/D04-수업관리/수업관리.md:170 | /exercise-programs | 프로그램 CRUD는 `exercise_programs`, 회원 배정/해제는 `member_exercise_programs`로 저장. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C011 | 유효 수업 목록 | docs4/V2/D04-수업관리/수업관리.md:291 | /valid-lessons | V1 `/valid-lessons` 구현으로 매핑. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C012 | 대기열 관리 | docs4/V2/D04-수업관리/수업관리.md:303 | /class-waitlist | `lesson_bookings` WAITLIST 조회와 배정 RPC 연결. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C013 | 수업 평가 피드백 | docs4/V2/D04-수업관리/수업관리.md:382 | /class-feedback | V1 `/class-feedback` 구현으로 매핑. `class_feedbacks` 검토 상태 저장. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C014 | 수업 출석/완료 확인 | docs4/V2/D04-수업관리/수업관리.md:394 | /attendance/lesson-completion | V1 `/attendance/lesson-completion` 구현으로 매핑. |
| V2_FOLLOWUP_VISIBLE | V2 | D04-수업관리 | SCR-C015 | 수업 녹화 관리 | docs4/V2/D04-수업관리/수업관리.md:406 | /class-recording | V2/후속 범위로 빨간 안내와 비활성 액션을 노출. 실제 업로드/공유/삭제 DB 원장은 후속. |
| CLOSED_DB_CONNECTED | V2 | D04-수업관리 | SCR-C016 | 예약 목록 | docs4/V2/D04-수업관리/수업관리.md:492 | /class-reservations | V1 `/class-reservations` 구현으로 매핑. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P001-상품등록모달 | 상품 등록 모달 | docs4/V2/D05-상품관리/상품관리.md:705 | - | V1 동일 상품 패널/등록 라우트가 `products` 원장 저장. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P002-전지점배포 | 전 지점 배포 확인 | docs4/V2/D05-상품관리/상품관리.md:715 | - | `/products` 전 지점 배포 모달에서 선택 상품을 대상 지점 `products`로 복제. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P006-비활성화안내 | 상품 비활성화 안내 | docs4/V2/D05-상품관리/상품관리.md:744 | - | 완료 매출이 있는 상품 삭제 시 `isActive=false` 미사용 전환 안내. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P007-할인규칙등록 | 할인 규칙 등록 | docs4/V2/D05-상품관리/상품관리.md:791 | - | `discount_policies` 등록 및 `audit_log` 이력 기록. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P008-상품가져오기 | 상품 정보 가져오기 | docs4/V2/D05-상품관리/상품관리.md:828 | - | 기존 `products` 검색 후 신규 상품 패널로 복사. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P009-할인규칙수정 | 할인 규칙 수정 | docs4/V2/D05-상품관리/상품관리.md:865 | - | `discount_policies` 수정 및 `audit_log` 이력 기록. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P010-상품삭제최종확인 | 상품 삭제 최종 확인 | docs4/V2/D05-상품관리/상품관리.md:902 | - | 상품 삭제 확인 후 `products` 삭제, 실패 시 미사용 전환 fallback. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P011-할인규칙삭제확인 | 할인 규칙 삭제 확인 | docs4/V2/D05-상품관리/상품관리.md:949 | - | `discount_policies` 삭제 및 `audit_log` 이력 기록. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P012-상품이미지업로드 | 상품 대표 이미지 업로드 | docs4/V2/D05-상품관리/상품관리.md:996 | - | 상품 패널 이미지 업로드/미리보기/적용을 `products.imageUrl` 계열 컬럼에 저장. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P013-할인정책추가수정 | 복합 할인 정책 추가/수정 | docs4/V2/D05-상품관리/상품관리.md:1037 | - | `discount_policies.conditions`에 적용 기간, 전체/특정 상품 조건을 저장하고 기간/상품 선택 검증 구현. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P014-가격이력조회 | 가격 이력 상세 조회 | docs4/V2/D05-상품관리/상품관리.md:1074 | - | `audit_log` 기반 가격 변경 이력 상세 조회. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P015-할인정책삭제확인 | 할인 정책 삭제 확인 | docs4/V2/D05-상품관리/상품관리.md:1115 | - | 할인 정책 삭제 확인 후 `discount_policies` 삭제 및 이력 기록. |
| V2_FOLLOWUP_VISIBLE | V2 | D05-상품관리 | DLG-P016-카탈로그미리보기 | 카탈로그 미리보기 | docs4/V2/D05-상품관리/상품관리.md:1162 | - | `/products/catalog`에 빨간 후속 범위 배너로 노출, 실행성 카탈로그 편집/내보내기는 후속 확정 대상. |
| V2_FOLLOWUP_VISIBLE | V2 | D05-상품관리 | DLG-P017-카탈로그설정 | 카탈로그 표시 옵션 설정 | docs4/V2/D05-상품관리/상품관리.md:1245 | - | 카탈로그 설정은 V2/후속 범위로 화면 표시만 유지. |
| V2_FOLLOWUP_VISIBLE | V2 | D05-상품관리 | DLG-P018-카탈로그편집 | 카탈로그 내용 편집 | docs4/V2/D05-상품관리/상품관리.md:1335 | - | 카탈로그 편집은 V2/후속 범위로 화면 표시만 유지. |
| V2_FOLLOWUP_VISIBLE | V2 | D05-상품관리 | DLG-P019-입고등록 | 입고 등록 | docs4/V2/D05-상품관리/상품관리.md:1423 | - | `/products/inventory`는 D06/후속 이관 배너로 유지, 입고 실행 DB는 후속 대상. |
| V2_FOLLOWUP_VISIBLE | V2 | D05-상품관리 | DLG-P020-출고등록 | 출고 등록 | docs4/V2/D05-상품관리/상품관리.md:1515 | - | `/products/inventory`는 D06/후속 이관 배너로 유지, 출고 실행 DB는 후속 대상. |
| V2_FOLLOWUP_VISIBLE | V2 | D05-상품관리 | DLG-P021-재고조정 | 재고 수동 조정 | docs4/V2/D05-상품관리/상품관리.md:1608 | - | `/products/inventory`는 D06/후속 이관 배너로 유지, 재고 조정 DB는 후속 대상. |
| V2_FOLLOWUP_VISIBLE | V2 | D05-상품관리 | DLG-P022-입출고이력 | 입출고 이력 조회 | docs4/V2/D05-상품관리/상품관리.md:1702 | - | `/products/inventory`는 D06/후속 이관 배너로 유지, 입출고 이력 DB는 후속 대상. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | DLG-P023-시즌가격등록수정 | 시즌 특가 등록/수정 | docs4/V2/D05-상품관리/상품관리.md:1797 | - | `product_seasonal_prices` DB 테이블로 등록/수정/진행중 즉시 종료, 중복 기간 검증 구현. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | SCR-P001 | 상품 관리 | docs4/V2/D05-상품관리/상품관리.md:45 | /products | `products`, `product_groups`, `sales`, `audit_log` 연동 목록/분류/패널/배포 구현. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | SCR-P002 | 상품 등록 | docs4/V2/D05-상품관리/상품관리.md:118 | /products/new | `products` 신규 등록, 요일/시간/옵션 JSON, 분류/가격/상태 저장. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | SCR-P003 | 상품 상세/수정 패널 | docs4/V2/D05-상품관리/상품관리.md:206 | /products/detail | `/products` 우측 패널과 직접 라우트 모두 실제 `products` 원장/판매/가격이력 조회. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | SCR-P004 | 할인 설정 | docs4/V2/D05-상품관리/상품관리.md:218 | /discount-settings | `discount_policies` CRUD와 `audit_log` 변경 이력 조회로 DB 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D05-상품관리 | SCR-P005 | 상품 카탈로그 | docs4/V2/D05-상품관리/상품관리.md:258 | /products/catalog | 빨간 V2/후속 범위 배너 유지, 카탈로그 실행 기능은 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D05-상품관리 | SCR-P006 | 상품 비교 | docs4/V2/D05-상품관리/상품관리.md:362 | /products/compare | 빨간 V2/후속 범위 배너 유지, 비교 운영화는 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D05-상품관리 | SCR-P007 | 재고 관리 | docs4/V2/D05-상품관리/상품관리.md:471 | /products/inventory | D06/후속 이관 배너 유지, 재고 실행 DB는 후속 확정 후 연결. |
| CLOSED_DB_CONNECTED | V2 | D05-상품관리 | SCR-P008 | 시즌 가격 관리 | docs4/V2/D05-상품관리/상품관리.md:585 | /products/seasonal-price | `product_seasonal_prices` + 실제 `products` 선택으로 시즌 특가 CRUD 구현. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-050-001 | 락커 기록 조회 | docs4/V2/D06-시설관리/시설관리.md:866 | /locker | V1 동일 `audit_log` 기반 락커 이력 조회. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-050-002 | 락커 이동 | docs4/V2/D06-시설관리/시설관리.md:915 | /locker | V1 동일 `lockers.number` 변경 저장 및 이력 기록. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-050-003 | 락커 회수 확인 | docs4/V2/D06-시설관리/시설관리.md:962 | /locker | V1 동일 회수 저장 및 이력 기록. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-050-004 | 개별 배정 | docs4/V2/D06-시설관리/시설관리.md:1009 | /locker | V1 동일 개별 배정 저장 및 이력 기록. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-050-005 | 고장 토글 확인 | docs4/V2/D06-시설관리/시설관리.md:1056 | /locker | V1 동일 `MAINTENANCE/AVAILABLE` 상태 저장 및 이력 기록. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-050-006 | 일괄 배정 | docs4/V2/D06-시설관리/시설관리.md:1101 | /locker | V1 동일 일괄 배정 저장 및 이력 기록. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-050-007 | 일괄 해제 확인 | docs4/V2/D06-시설관리/시설관리.md:1146 | /locker | V1 동일 일괄 해제 저장 및 이력 기록. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-052-001 | RFID 등록/수정 | docs4/V2/D06-시설관리/시설관리.md:1193 | /rfid | `rfid_cards` 등록/수정, 카드번호 검증, 회원/직원 매핑 저장. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-052-002 | RFID 이력 조회 | docs4/V2/D06-시설관리/시설관리.md:1274 | /rfid | `audit_log` targetType=rfid_card 기준 이력 조회. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-052-003 | RFID 삭제 확인 | docs4/V2/D06-시설관리/시설관리.md:1351 | /rfid | 물리 삭제 대신 해제 처리 및 이력 유지. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-053-001 | 룸 등록/수정 | docs4/V2/D06-시설관리/시설관리.md:1427 | /rooms | `facility_rooms` 등록/수정 저장. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | DLG-053-002 | 룸 삭제 확인 | docs4/V2/D06-시설관리/시설관리.md:1505 | /rooms | `facility_rooms` 삭제 확인 저장. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | DLG-056-001 | 장비 등록 | docs4/V2/D06-시설관리/시설관리.md:1577 | /equipment-check | V2/후속 범위. 장비 점검 DB 원장과 등록 플로우는 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | DLG-056-002 | 점검 등록 | docs4/V2/D06-시설관리/시설관리.md:1657 | /equipment-check | V2/후속 범위. 점검 이력 원장과 알림 정책은 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | DLG-056-003 | 수리 등록 | docs4/V2/D06-시설관리/시설관리.md:1738 | /equipment-check | V2/후속 범위. 수리 접수/완료 이력은 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | DLG-057-001 | 소모품 등록 | docs4/V2/D06-시설관리/시설관리.md:1819 | /consumables | V2/후속 범위. 소모품 재고 원장은 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | DLG-057-002 | 입출고 처리 | docs4/V2/D06-시설관리/시설관리.md:1900 | /consumables | V2/후속 범위. 입출고 원장과 재고 증감은 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | DLG-057-003 | 발주 생성 | docs4/V2/D06-시설관리/시설관리.md:1983 | /consumables | V2/후속 범위. 발주 승인/입고 흐름은 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | DLG-058-001 | 청소 스케줄 등록 | docs4/V2/D06-시설관리/시설관리.md:2064 | /cleaning-schedule | V2/후속 범위. 반복 청소 스케줄 원장과 완료 체크는 후속 확정 후 연결. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | SCR-050 | 락커 관리 | docs4/V2/D06-시설관리/시설관리.md:41 | /locker | V1 동일 `lockers` 원장 조회/상태변경/배정/회수/일괄처리/이력 조회 DB 연결. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | SCR-051 | 사물함 배정 관리 | docs4/V2/D06-시설관리/시설관리.md:92 | /locker/management | V1 동일 회원 검색+빈 사물함 선택+배정+만료 일괄 해제 DB 연결. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | SCR-052 | 밴드/카드 관리 | docs4/V2/D06-시설관리/시설관리.md:181 | /rfid | `rfid_cards` 목록/검색/상태/엑셀/등록/수정/분실/해제 DB 연결. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | SCR-053 | 운동룸 관리 | docs4/V2/D06-시설관리/시설관리.md:264 | /rooms | `facility_rooms` 목록/카드/필터/상태전환/등록/수정/삭제 DB 연결. |
| CLOSED_DB_CONNECTED | V2 | D06-시설관리 | SCR-054 | 골프 타석 관리 | docs4/V2/D06-시설관리/시설관리.md:348 | /golf-bays | `golf_bays`, `golf_waitlist`, `golf_bay_sessions`로 타석 시작/종료/이동/대기열 저장. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | SCR-055 | 상품 재고 관리 | docs4/V2/D06-시설관리/시설관리.md:453 | /facility/inventory | V2/후속 범위. 상품 재고 실행 원장과 D05 재고 범위 정리는 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | SCR-056 | 장비 점검 일정 | docs4/V2/D06-시설관리/시설관리.md:534 | /equipment-check | V2/후속 범위. 장비/점검/수리 DB 원장은 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | SCR-057 | 소모품 재고 관리 | docs4/V2/D06-시설관리/시설관리.md:619 | /consumables | V2/후속 범위. 소모품/입출고/발주 DB 원장은 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | SCR-058 | 청소 스케줄 | docs4/V2/D06-시설관리/시설관리.md:705 | /cleaning-schedule | V2/후속 범위. 청소 반복 일정/완료 이력 DB는 후속 확정 후 연결. |
| V2_FOLLOWUP_VISIBLE | V2 | D06-시설관리 | SCR-059 | 공간 자산 관리 | docs4/V2/D06-시설관리/시설관리.md:789 | /rooms | 현재 `/rooms`는 V1 운동룸 관리까지 DB 연결. 공간 자산 통합관리는 V2 후속 범위로 분리. |
| CLOSED_DB_CONNECTED | V2 | D07-직원관리 | DLG-060-001 | 직원 등록/수정 취소 확인 | docs4/V2/D07-직원관리/직원관리.md:141 | - | V1 동일 직원 등록/수정 취소 확인 구현. |
| CLOSED_DB_CONNECTED | V2 | D07-직원관리 | DLG-060-002 | 직원 삭제(퇴사 처리) 확인 | docs4/V2/D07-직원관리/직원관리.md:160 | - | V1 동일 `staffStatus=RESIGNED` 및 계정 비활성화 동기화. |
| CLOSED_DB_CONNECTED | V2 | D07-직원관리 | DLG-064-001 | 급여 상세 편집 | docs4/V2/D07-직원관리/직원관리.md:179 | - | V1 동일 `payroll.details` 수동 수당/공제 저장. |
| CLOSED_DB_CONNECTED | V2 | D07-직원관리 | DLG-064-002 | 급여 확정 확인 | docs4/V2/D07-직원관리/직원관리.md:191 | - | V1 동일 `payroll.status=PAID/PENDING`, `paidAt` 저장. |
| CLOSED_DB_CONNECTED | V2 | D07-직원관리 | DLG-064-003 | 급여 정책 추가 | docs4/V2/D07-직원관리/직원관리.md:203 | - | V1 동일 `salary_policies` 원장 저장. |
| CLOSED_DB_CONNECTED | V2 | D07-직원관리 | SCR-060 | 직원 목록 | docs4/V2/D07-직원관리/직원관리.md:39 | /staff | V1 동일 직원 목록/계약서/퇴사 처리 DB 연결. |
| CLOSED_DB_CONNECTED | V2 | D07-직원관리 | SCR-063 | 직원 근태 관리 | docs4/V2/D07-직원관리/직원관리.md:70 | /staff/attendance | V1 동일 `staff_attendance` 근태 DB 연결. |
| CLOSED_DB_CONNECTED | V2 | D07-직원관리 | SCR-064 | 급여 관리 | docs4/V2/D07-직원관리/직원관리.md:98 | /payroll | V1 동일 `payroll`, `salary_policies` DB 연결. |
| CLOSED_DB_CONNECTED | V2 | D07-직원관리 | SCR-065 | 급여 명세서 | docs4/V2/D07-직원관리/직원관리.md:126 | /payroll/statements | V1 동일 `payroll_statement_deliveries` 발송 이력 DB 연결. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-070-001 | 리드 등록/수정 | docs4/V2/D08-마케팅/마케팅.md:320 | - | `/leads` 리드 등록/수정 모달이 `leads` 원장에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-070-002 | 리드 삭제 확인 | docs4/V2/D08-마케팅/마케팅.md:332 | - | `/leads` 삭제 확인 후 `leads` 원장에서 삭제됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-071-001 | 수신자 검색 | docs4/V2/D08-마케팅/마케팅.md:344 | - | `/message` 수신자 검색은 실제 `members` 목록을 조회합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-071-002 | 발송 미리보기 | docs4/V2/D08-마케팅/마케팅.md:360 | - | `/message` 발송 미리보기 후 `messages`에 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-072-002 | 알림 트리거 추가 | docs4/V2/D08-마케팅/마케팅.md:376 | - | `/message/auto-alarm` 지점 step 추가가 `auto_alarm_settings.steps`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-073-001 | 쿠폰 생성/수정 | docs4/V2/D08-마케팅/마케팅.md:386 | - | `/message/coupon` 쿠폰 생성/수정이 `coupons`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-073-002 | 쿠폰 발급 | docs4/V2/D08-마케팅/마케팅.md:404 | - | `/message/coupon` 쿠폰 발급이 회원별 `coupon_issuance_logs`로 남습니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-073-003 | 쿠폰 삭제 확인 | docs4/V2/D08-마케팅/마케팅.md:434 | - | `/message/coupon` 발급 이력 없는 쿠폰만 삭제 확인 후 비활성화합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-074-001 | 적립 규칙 편집 | docs4/V2/D08-마케팅/마케팅.md:452 | - | `/mileage` 적립 정책 편집이 `mileage_policy_settings`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-074-002 | 수동 적립·차감 | docs4/V2/D08-마케팅/마케팅.md:470 | - | `/mileage` 수동 적립·차감이 `members.mileage`와 `mileage_logs`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-076-001 | 캠페인 등록 | docs4/V2/D08-마케팅/마케팅.md:488 | - | `/marketing/campaign` 캠페인 등록이 `marketing_campaigns`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-076-002 | 캠페인 삭제 확인 | docs4/V2/D08-마케팅/마케팅.md:523 | - | `/marketing/campaign` 캠페인 삭제 확인 후 `marketing_campaigns`에서 삭제됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-077-001 | 리퍼럴 이벤트 등록 | docs4/V2/D08-마케팅/마케팅.md:550 | - | `/marketing/referral` 리퍼럴 이벤트 등록/편집이 `referral_events`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-077-002 | 리퍼럴 이벤트 삭제 확인 | docs4/V2/D08-마케팅/마케팅.md:583 | - | `/marketing/referral` 리퍼럴 이벤트 삭제 확인 후 `referral_events`에서 삭제됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-079-001 | A/B 테스트 등록 | docs4/V2/D08-마케팅/마케팅.md:618 | - | `/marketing/ab-test` A/B 테스트 등록이 `ab_tests`에 저장됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | DLG-079-002 | A/B 테스트 삭제 확인 | docs4/V2/D08-마케팅/마케팅.md:651 | - | `/marketing/ab-test` A/B 테스트 삭제 확인 후 `ab_tests`에서 삭제됩니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | SCR-070 | 리드 관리 | docs4/V2/D08-마케팅/마케팅.md:38 | /leads | `leads` 원장에 문의유형 컬럼을 보강하고 등록/수정/삭제를 DB 기준으로 유지합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | SCR-071 | 메시지 발송 | docs4/V2/D08-마케팅/마케팅.md:50 | /message | `messages` + 실제 `members` 수신자 검색으로 즉시/예약 발송 이력을 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | SCR-072 | 자동 알림 설정 | docs4/V2/D08-마케팅/마케팅.md:66 | /message/auto-alarm | `auto_alarm_settings`로 지점 자동 알림 step/event/전체 ON-OFF/발신번호를 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | SCR-072A | 자동알림 운영현황 | docs4/V2/D08-마케팅/마케팅.md:78 | /message/auto-alarm | 동일 `/message/auto-alarm` 내 운영현황 탭을 유지하고 설정은 `auto_alarm_settings` 기준으로 연동합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | SCR-073 | 쿠폰 관리 | docs4/V2/D08-마케팅/마케팅.md:90 | /message/coupon | `coupons`, `coupon_issuance_logs`로 쿠폰 생성/수정/발급/이력/삭제 확인을 DB 연결했습니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | SCR-074 | 마일리지 관리 | docs4/V2/D08-마케팅/마케팅.md:114 | /mileage | `members.mileage`, `mileage_logs`, `mileage_policy_settings`로 현황/이력/정책/수동 적립·차감을 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | SCR-075 | 전자 계약 | docs4/V2/D08-마케팅/마케팅.md:142 | /contracts/new | `electronic_contracts`로 회원 계약과 직원 근로계약 대상 검색, 임시저장, 현장서명, 원격 서명 대기, 재발송 이력을 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | SCR-076 | 캠페인 관리 | docs4/V2/D08-마케팅/마케팅.md:161 | /marketing/campaign | `marketing_campaigns`로 캠페인 등록/삭제/실적 지표를 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | SCR-077 | 리퍼럴 프로그램 | docs4/V2/D08-마케팅/마케팅.md:196 | /marketing/referral | `referral_events`, `referral_records`로 리퍼럴 이벤트/추천 이력을 DB 연결하고 V2/후속 화면 배너를 유지합니다. |
| CLOSED_DB_CONNECTED | V2 | D08-마케팅 | SCR-079 | A/B 테스트 | docs4/V2/D08-마케팅/마케팅.md:305 | /marketing/ab-test | `ab_tests`로 A/B 테스트 생성/삭제/실적 표시를 저장하고 V2/후속 빨간 표시를 유지합니다. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | DLG-080-001 | 미저장 경고 | docs4/V2/D09-설정관리/설정관리.md:442 | /settings | V1 동일 센터 설정 미저장 경고/저장 후 이동/폐기 흐름 구현. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | DLG-080A-001 | 정책 적용 확인 | docs4/V2/D09-설정관리/설정관리.md:498 | /settings/automation | V1 동일 자동화 정책 복원/저장 흐름을 DB 설정으로 유지. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | DLG-081-006 | 역할 변경 영향 분석 | docs4/V2/D09-설정관리/설정관리.md:510 | /settings/permissions | V1 동일 권한 변경 영향 분석과 저장본 대비 차이 감지 구현. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | DLG-084-001 | 플랜 변경 확인 | docs4/V2/D09-설정관리/설정관리.md:527 | /subscription | 플랜 변경 확인 후 구독 설정과 청구 이력을 DB 설정으로 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | DLG-084-002 | 구독 해지 확인 | docs4/V2/D09-설정관리/설정관리.md:539 | /subscription | 구독 해지 확인 후 해지 예정 상태를 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | DLG-085-001 | 공지 등록·수정 | docs4/V2/D09-설정관리/설정관리.md:551 | /notices | 공지 등록/수정 시 게시 대상과 게시 기간을 `notices`에 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | DLG-085-002 | 공지 삭제 확인 | docs4/V2/D09-설정관리/설정관리.md:638 | /notices | 공지 삭제 확인 후 `notices` 원장에서 삭제. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | DLG-089-001 | 데이터 복원 확인 | docs4/V2/D09-설정관리/설정관리.md:716 | /settings/backup | 복원 사유와 복원 이력을 DB 설정으로 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | DLG-089-002 | 백업 설정 | docs4/V2/D09-설정관리/설정관리.md:745 | /settings/backup | 백업 주기/시각/보관기간과 수동 백업 이력을 DB 설정으로 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | SCR-080A | 지점 자동화 적용 | docs4/V2/D09-설정관리/설정관리.md:37 | /settings/automation | `branch_settings.automation_apply_settings`로 자동화 적용 설정 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | SCR-081 | 권한 설정 | docs4/V2/D09-설정관리/설정관리.md:55 | /settings/permissions | 역할/권한/민감 권한을 DB 설정으로 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | SCR-082 | 키오스크 설정 | docs4/V2/D09-설정관리/설정관리.md:69 | /settings/kiosk | 키오스크 설정을 `kiosk_settings`로 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | SCR-082A | 키오스크 IoT 설정 | docs4/V2/D09-설정관리/설정관리.md:116 | /settings/iot | 키오스크 IoT 설정을 `iot_settings`로 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | SCR-083 | IoT 출입 관리 | docs4/V2/D09-설정관리/설정관리.md:174 | /settings/iot | IoT 출입 정책/기기/스케줄을 DB 설정으로 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | SCR-084 | 구독 결제 관리 | docs4/V2/D09-설정관리/설정관리.md:196 | /subscription | 구독 플랜/결제수단/청구 이력과 PDF 다운로드 진입을 화면에서 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | SCR-085 | 공지사항 관리 | docs4/V2/D09-설정관리/설정관리.md:216 | /notices | 공지 대상/기간/상태/읽음 이력 DB 연결. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | SCR-088 | 다국어 설정 | docs4/V2/D09-설정관리/설정관리.md:304 | /settings/language | 다국어/지역 설정을 `language_region_settings`로 저장. |
| CLOSED_DB_CONNECTED | V2 | D09-설정관리 | SCR-089 | 데이터 백업·복원 | docs4/V2/D09-설정관리/설정관리.md:388 | /settings/backup | 백업/복원 설정과 이력을 DB 설정으로 저장. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | DLG-092-001 | 신규 지점 등록 | docs4/V2/D10-본사관리/본사관리.md:1186 | /branches | V1 동일 신규 지점 등록을 `branches` 원장에 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | DLG-092-002 | 지점 비활성화 확인 | docs4/V2/D10-본사관리/본사관리.md:1203 | /branches | V1 동일 지점 비활성화 전 활성 회원/직원 여부를 확인합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | DLG-094-001 | 매출 목표 설정 | docs4/V2/D10-본사관리/본사관리.md:1216 | /kpi | KPI 월 매출 목표를 DB 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | DLG-H1001-001 | 정책 세트 편집 | docs4/V2/D10-본사관리/본사관리.md:1239 | /hq/automation-policies | 정책 세트 생성/편집을 DB 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-090 | 지점 대시보드 | docs4/V2/D10-본사관리/본사관리.md:38 | /super-dashboard | 슈퍼관리자 대시보드가 전 지점 매출/회원/출석/리드/알림 지표를 Supabase 원장으로 집계합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-091 | 구버전 슈퍼 대시보드 리다이렉트 | docs4/V2/D10-본사관리/본사관리.md:194 | /super-dashboard<br>/login | 기존 슈퍼 대시보드 경로를 유지하고 로그인 후 본사 화면 진입을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-092 | 지점 관리 | docs4/V2/D10-본사관리/본사관리.md:270 | /branches | 지점 관리는 V1 동일 `/branches`에서 DB 연결 상태로 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-093 | 지점 성과 리포트 | docs4/V2/D10-본사관리/본사관리.md:287 | /branch-report | 지점 성과 리포트는 V1 동일 `/branch-report`에서 DB 집계합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-094 | KPI 대시보드 | docs4/V2/D10-본사관리/본사관리.md:330 | /kpi | KPI 대시보드는 실제 원장 집계와 목표 저장을 제공합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-095 | KPI 센터 | docs4/V2/D10-본사관리/본사관리.md:503 | /kpi-preview | KPI 센터는 `/api/kpi-center` Supabase snapshot으로 표시합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-096 | 온보딩 대시보드 | docs4/V2/D10-본사관리/본사관리.md:526 | /onboarding | 온보딩 대시보드는 리드/신규회원/상담/출석 원장을 조회합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-097 | 히스토리 로그 | docs4/V2/D10-본사관리/본사관리.md:642 | /audit-log | 히스토리 로그는 `audit_log` 원장 조회로 연결됩니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-099 | 리포트 생성 | docs4/V2/D10-본사관리/본사관리.md:669 | /reports | 리포트 생성은 매출/회원/출석 원장 기반으로 유지합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-H1001 | 자동화 정책 라이브러리 | docs4/V2/D10-본사관리/본사관리.md:710 | /hq/automation-policies | 정책 라이브러리는 `hq_automation_policy_sets` DB 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-H1002 | 커스텀 대시보드 빌더 | docs4/V2/D10-본사관리/본사관리.md:856 | /dashboard/builder | 위젯 추가/삭제/저장을 `dashboard_builder_widgets` DB 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-H1003 | 벤치마크 비교 | docs4/V2/D10-본사관리/본사관리.md:947 | /benchmark | 현재 지점의 실제 매출/회원/출석 데이터를 기준으로 벤치마크 지표를 산출합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-H1004 | 예측 분석 | docs4/V2/D10-본사관리/본사관리.md:1028 | /analytics/forecast | 예측 분석은 Supabase snapshot 기반 데이터를 표시합니다. |
| CLOSED_DB_CONNECTED | V2 | D10-본사관리 | SCR-H1005 | NPS 설문 | docs4/V2/D10-본사관리/본사관리.md:1086 | /nps | NPS 발송 대상 수를 실제 회원/수업 원장에서 계산하고 발송 이력을 `nps_campaigns` DB 설정으로 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D11-통합운영 | DLG-I001 | 수동 출석 등록 | docs4/V2/D11-통합운영/통합운영.md:214 | /attendance | V2 문서의 수동 출석 등록은 현재 `attendance` 저장 흐름으로 닫았습니다. |
| CLOSED_DB_CONNECTED | V2 | D11-통합운영 | DLG-I002 | 옷 락커 배정 | docs4/V2/D11-통합운영/통합운영.md:316 | /clothing-locker | 옷 락커 배정/회수 상태를 날짜별 `branch_settings`로 저장합니다. |
| CLOSED_DB_CONNECTED | V2 | D11-통합운영 | SCR-I001 | 통합 출석 관리 | docs4/V2/D11-통합운영/통합운영.md:37 | /attendance | 문서상 route 미기재 항목을 `/attendance`로 매핑하고 출석 원장 연결 상태로 닫았습니다. |
| CLOSED_DB_CONNECTED | V2 | D11-통합운영 | SCR-I004 | 옷 락커 운영 관리 | docs4/V2/D11-통합운영/통합운영.md:89 | /clothing-locker | 당일 출석 미배정 회원과 옷 락커 배정 상태를 DB 기준으로 표시합니다. |
| CLOSED_DB_CONNECTED | V2 | D11-통합운영 | SCR-I005 | 고정 물품 락커 관리 | docs4/V2/D11-통합운영/통합운영.md:130 | /locker/management | `lockers` 원장 기반 고정 락커 관리 화면으로 닫았습니다. |
| CLOSED_DB_CONNECTED | V2 | D11-통합운영 | SCR-I007 | 회원 건강 연동 요약 | docs4/V2/D11-통합운영/통합운영.md:174 | /members/health | route 후보를 `/members/health`로 정정하고 실제 회원/출석/락커/체성분/수업 이력 기반 요약으로 닫았습니다. |
