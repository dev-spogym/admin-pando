# FitGenie 회원앱 데이터 모델

> **작성일**: 2026-04-17 | **버전**: 2.0
> **DB**: Supabase (PostgreSQL)
> **전략**: CRM DB 공유 + RLS 역할별 접근 제어

---

## 1. 테이블 총괄

| 테이블명 | 구분 | 앱에서 사용 | 역할 접근 | 설명 |
|----------|------|:-----------:|-----------|------|
| members | 기존 CRM | O | 전 역할 | 회원 정보 |
| branches | 기존 CRM | O | 전 역할 | 지점 정보 |
| staff | 기존 CRM | O | trainer, golf_trainer, fc, staff | 직원(강사/FC/스태프) |
| users | 기존 CRM | O | 전 역할 (내부) | CRM 인증 계정 |
| products | 기존 CRM | O | member(R), trainer(R), fc(R/W) | 상품 |
| product_groups | 기존 CRM | O | fc(R) | 상품 분류 |
| sales | 기존 CRM | O | member(R), fc(R/W) | 매출/결제 |
| attendance | 기존 CRM | O | member(R/W), trainer(R), staff(R/W) | 출석 기록 |
| classes | 기존 CRM | O | member(R), trainer(R/W), staff(R) | 수업 일정 (캘린더) |
| class_templates | 기존 CRM | O | trainer(R/W) | 그룹수업 템플릿 |
| lessons | 기존 CRM | O | member(R), trainer(R/W) | 수업 정의 |
| lesson_schedules | 기존 CRM | O | member(R), trainer(R/W) | 수업 일정 (lessons 기반) |
| lesson_bookings | 기존 CRM | O | member(R/W), trainer(R/W) | 수업 예약 |
| lesson_counts | 기존 CRM | O | member(R), trainer(R/W) | 수강권 횟수 |
| lesson_count_histories | 기존 CRM | O | member(R), trainer(R) | 횟수 차감 이력 |
| penalties | 기존 CRM | O | member(R), trainer(R/W) | 페널티 |
| consultations | 기존 CRM | O | fc(R/W) | 상담 이력 |
| member_memos | 기존 CRM | O | trainer(R/W), fc(R/W) | 회원 메모 |
| member_body_info | 기존 CRM | O | member(R), trainer(R/W) | 신체정보 |
| member_evaluations | 기존 CRM | O | member(R), trainer(R/W) | 종합평가 |
| exercise_programs | 기존 CRM | O | member(R), trainer(R/W) | 운동 프로그램 |
| member_exercise_programs | 기존 CRM | O | member(R), trainer(R/W) | 회원-프로그램 배정 |
| exercise_logs | 기존 CRM | O | member(R), trainer(R/W) | 운동 이력 |
| bodyComposition | 기존 CRM | O | member(R), trainer(R/W) | 체성분 |
| lockers | 기존 CRM | O | member(R), staff(R/W) | 락커 |
| clothing | 기존 CRM | - | staff(R/W) | 운동복 |
| notices | 기존 CRM | O | 전 역할(R) | 공지사항 |
| settings | 기존 CRM | O | 전 역할(R) | 센터 설정 |
| leads | 기존 CRM | O | fc(R/W) | 리드(잠재고객) |
| unpaid | 기존 CRM | O | fc(R) | 미수금 |
| staff_attendance | 기존 CRM | O | trainer(R/W), staff(R/W) | 직원 근태 |
| discount_policies | 기존 CRM | - | - | 할인 정책 |
| audit_log | 기존 CRM | - | - | 감사 로그 |
| contract | 기존 CRM | O | member(R), fc(R) | 계약 |
| member_holdings | 기존 CRM | O | member(R) | 홀딩 이력 |
| member_extensions | 기존 CRM | O | member(R) | 연장 이력 |
| **app_users** | **앱 전용** | O | 전 역할 | 앱 인증 계정 |
| **push_tokens** | **앱 전용** | O | 전 역할 | 푸시 토큰 |
| **sms_verifications** | **앱 전용** | O | 전 역할 | SMS 인증 |
| **class_signatures** | **앱 전용** | O | member, trainer | 수업 서명 |
| **lesson_certificates** | **앱 전용** | O | member, trainer | 레슨 확인서 |
| **app_inquiries** | **앱 전용** | O | member | 1:1 문의 |
| **app_settings** | **앱 전용** | O | 전 역할 | 앱 개인 설정 |
| **app_versions** | **앱 전용** | O | 전 역할(R) | 앱 버전 관리 |
| **subscriptions** | **앱 전용** | O | member | 구독/자동결제 |

---

## 2. 기존 CRM 테이블 (앱에서 참조)

> **앱 사용 컬럼 범례**: R = 읽기, W = 쓰기, R/W = 읽기+쓰기, `-` = 미사용

### 2.1 members (회원 정보)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto_increment | - | R | 회원 고유 ID |
| name | text | NOT NULL | - | - | R/W | 회원명 |
| phone | text | NOT NULL | - | - | R | 연락처 (010-xxxx-xxxx) |
| email | text | NULL | null | - | R/W | 이메일 |
| gender | text | NOT NULL | - | - | R | 성별 ('M' / 'F') |
| birthDate | text | NULL | null | - | R/W | 생년월일 (YYYY-MM-DD) |
| profileImage | text | NULL | null | - | R/W | 프로필 이미지 URL (Supabase Storage) |
| registeredAt | timestamptz | NOT NULL | now() | - | R | 등록일시 |
| membershipType | text | NOT NULL | '' | - | R | 이용권 종류 (MEMBERSHIP, PT, GX, ETC) |
| membershipStart | timestamptz | NULL | null | - | R | 이용권 시작일 |
| membershipExpiry | timestamptz | NULL | null | - | R | 이용권 만료일 |
| status | text | NOT NULL | 'INACTIVE' | - | R | 회원 상태 (ACTIVE, INACTIVE, EXPIRED, HOLDING, SUSPENDED) |
| mileage | integer | NULL | 0 | - | R | 보유 마일리지 |
| memo | text | NULL | null | - | - | 메모 (CRM 전용) |
| height | numeric | NULL | null | - | R | 키 (cm) |
| staffId | integer | NULL | null | staff.id | R | 담당 FC ID |
| deletedAt | timestamptz | NULL | null | - | - | soft delete 시각 |
| branchId | integer | NOT NULL | 1 | branches.id | R | 소속 지점 ID |
| createdAt | timestamptz | NOT NULL | now() | - | R | 레코드 생성일시 |
| updatedAt | timestamptz | NULL | null | - | R | 최종 수정일시 |
| isFavorite | boolean | NULL | false | - | - | 관심회원 여부 (CRM 전용) |
| lastVisitAt | timestamptz | NULL | null | - | R | 마지막 방문일 |
| memberType | text | NULL | null | - | R | 회원구분 ('일반', '기명법인', '무기명법인') |
| referralSource | text | NULL | null | - | R | 유입경로 |
| companyName | text | NULL | null | - | R | 법인 회사명 |
| counselorName | text | NULL | null | - | - | 상담 담당자명 (CRM 전용) |
| specialNote | text | NULL | null | - | R | 특이사항 |
| visitSource | text | NULL | null | - | - | 방문경로 (CRM 전용) |
| exercisePurpose | text | NULL | null | - | R | 운동목적 |
| adConsent | boolean | NULL | null | - | R | 광고성 수신 동의 |

### 2.2 branches (지점 정보)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 지점 고유 ID |
| name | text | NOT NULL | - | - | R | 지점명 |
| address | text | NULL | null | - | R | 주소 |
| phone | text | NULL | null | - | R | 대표 전화번호 |
| status | text | NULL | null | - | R | 지점 상태 |
| managerId | integer | NULL | null | staff.id | - | 센터장 ID |
| managerName | text | NULL | null | - | R | 센터장명 |
| isActive | boolean | NOT NULL | true | - | R | 활성 여부 |
| createdAt | timestamptz | NOT NULL | now() | - | R | 생성일시 |

### 2.3 staff (직원/강사/FC/스태프)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 직원 고유 ID |
| name | text | NOT NULL | - | - | R | 직원명 |
| phone | text | NULL | null | - | R | 전화번호 |
| email | text | NULL | null | - | R/W | 이메일 |
| role | text | NOT NULL | - | - | R | 역할: 센터장, 매니저, FC, 트레이너, 스태프, 프론트 |
| position | text | NULL | null | - | R | 직급 |
| hireDate | text (ISO) | NULL | null | - | R | 입사일 |
| salary | integer | NULL | null | - | - | 기본급 (CRM 전용) |
| color | text | NULL | null | - | R | 캘린더 표시 색상 (hex) |
| isActive | boolean | NOT NULL | true | - | R | 활성 여부 |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| staffStatus | text | NULL | 'ACTIVE' | - | R | 라이프사이클: ACTIVE, RESIGNED, TRANSFERRED, ON_LEAVE, LOCKED |
| resignedAt | text (ISO) | NULL | null | - | - | 퇴사 확정일 |
| resignReason | text | NULL | null | - | - | 퇴사 사유 |
| resignScheduledAt | text (ISO) | NULL | null | - | - | 퇴사 예정일 |
| previousEmployeeId | integer | NULL | null | staff.id | - | 전보 전 직원 ID |
| leaveStartAt | text (ISO) | NULL | null | - | R | 휴직 시작일 |
| leaveEndAt | text (ISO) | NULL | null | - | R | 휴직 종료일 |
| leaveReason | text | NULL | null | - | - | 휴직 사유 |
| transferredFromBranchId | integer | NULL | null | branches.id | - | 전보 출발 지점 ID |
| transferredAt | text (ISO) | NULL | null | - | - | 전보일 |

### 2.4 users (CRM 인증 계정)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 계정 고유 ID |
| username | text | NOT NULL | - | - | R | 로그인 ID |
| password | text | NOT NULL | - | - | - | 비밀번호 (마이그레이션 기간 평문, 이후 Supabase Auth) |
| name | text | NOT NULL | - | - | R | 사용자명 |
| role | text | NOT NULL | - | - | R | 역할 |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 소속 지점 ID |
| isActive | boolean | NOT NULL | true | - | R | 활성 여부 |
| tenantId | integer | NULL | 1 | - | R | 테넌트 ID (멀티테넌트) |
| isSuperAdmin | boolean | NULL | false | - | R | 슈퍼관리자 여부 |
| currentBranchId | integer | NULL | null | branches.id | R | 현재 선택 지점 ID |

### 2.5 products (상품)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 상품 고유 ID |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| name | text | NOT NULL | - | - | R | 상품명 |
| category | text | NOT NULL | - | - | R | 카테고리: MEMBERSHIP, PT, GX, PRODUCT, SERVICE, ETC |
| productType | text | NULL | null | - | R | 상품 타입: MEMBERSHIP, LESSON, RENTAL, GENERAL |
| price | numeric | NOT NULL | - | - | R | 기본 가격 (원) |
| cashPrice | numeric | NULL | null | - | R | 현금가 |
| cardPrice | numeric | NULL | null | - | R | 카드가 |
| duration | integer | NULL | null | - | R | 이용 기간 (일) |
| sessions | integer | NULL | null | - | R | 이용 횟수 |
| totalCount | integer | NULL | null | - | R | 총 횟수 |
| description | text | NULL | null | - | R | 설명 (패키지 시 JSON) |
| tag | text | NULL | null | - | R | 태그 |
| sportType | text | NULL | null | - | R | 종목: 헬스, 필라테스, 요가, 골프 등 |
| isActive | boolean | NOT NULL | true | - | R | 활성 여부 |
| kioskVisible | boolean | NULL | null | - | - | 키오스크 노출 여부 (CRM 전용) |
| classType | text | NULL | null | - | R | 수업구분: 개인, 정규클래스 |
| deductionType | text | NULL | null | - | R | 이용구분: 기간, 횟수, 포인트 |
| suspendLimit | integer | NULL | null | - | R | 일시정지 한도 |
| dailyUseLimit | integer | NULL | null | - | R | 일일 이용 제한 횟수 |
| productGroupId | integer (FK) | NULL | null | product_groups.id | R | 상품 분류 그룹 ID |
| holdingEnabled | boolean | NULL | null | - | R | 홀딩 가능 여부 |
| transferEnabled | boolean | NULL | null | - | R | 양도 가능 여부 |
| pointAccrual | boolean | NULL | null | - | R | 포인트 적립 여부 |
| salesChannel | text | NULL | null | - | R | 판매유형: ALL, COUNTER, KIOSK, ONLINE |
| usage_restrictions | jsonb | NULL | null | - | R | 이용 제한 정보 (JSON) |
| createdAt | timestamptz | NOT NULL | now() | - | R | 생성일시 |

### 2.6 sales (매출/결제)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 매출 고유 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| memberName | text | NULL | null | - | R | 회원명 |
| productId | integer (FK) | NOT NULL | - | products.id | R | 상품 ID |
| productName | text | NULL | null | - | R | 상품명 |
| saleDate | timestamptz | NOT NULL | now() | - | R | 결제일시 |
| type | text | NULL | null | - | R | 유형 (이용권, PT, 상품, 기타) |
| round | text | NULL | null | - | R | 매출유형 (신규, 재등록, 휴면복귀 등) |
| quantity | integer | NULL | 1 | - | R | 수량 |
| originalPrice | numeric | NULL | null | - | R | 정가 |
| salePrice | numeric | NULL | null | - | R | 판매가 |
| discountPrice | numeric | NULL | null | - | R | 할인금액 |
| amount | numeric | NOT NULL | - | - | R | 실결제금액 |
| paymentMethod | text | NOT NULL | - | - | R | 결제수단: CARD, CASH, TRANSFER, MILEAGE |
| paymentType | text | NULL | null | - | R | 결제유형 (일시불, 할부 등) |
| cash | numeric | NULL | 0 | - | R | 현금 결제액 |
| card | numeric | NULL | 0 | - | R | 카드 결제액 |
| mileageUsed | numeric | NULL | 0 | - | R | 마일리지 사용액 |
| cardCompany | text | NULL | null | - | R | 카드사 |
| cardNumber | text | NULL | null | - | R | 카드번호 |
| approvalNo | text | NULL | null | - | R | 승인번호 |
| status | text | NOT NULL | 'COMPLETED' | - | R | 상태: COMPLETED, UNPAID, REFUNDED, PENDING |
| unpaid | numeric | NULL | 0 | - | R | 미수금 |
| staffId | integer (FK) | NULL | null | staff.id | R | 담당 직원 ID |
| staffName | text | NULL | null | - | R | 담당자명 |
| memo | text | NULL | null | - | R | 메모 |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |

### 2.7 attendance (출석 기록)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 출석 고유 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| memberName | text | NOT NULL | - | - | R | 회원명 |
| checkInAt | timestamptz | NOT NULL | now() | - | R | 입장 시각 |
| checkOutAt | timestamptz | NULL | null | - | R/W | 퇴장 시각 |
| type | text | NOT NULL | 'REGULAR' | - | R | 유형: REGULAR, PT, GX, MANUAL |
| checkInMethod | text | NULL | 'KIOSK' | - | R/W | 입장 방법: KIOSK, APP, MANUAL |
| isOtherBranch | boolean | NULL | false | - | R | 타 지점 여부 |
| phone | text | NULL | null | - | R | 연락처 |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |

### 2.8 classes (수업 일정 - 캘린더 이벤트)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 수업 고유 ID |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| templateId | integer (FK) | NULL | null | class_templates.id | R | 템플릿 ID |
| instructorId | integer (FK) | NULL | null | staff.id | R | 강사 ID |
| title | text | NOT NULL | - | - | R | 수업명 |
| startAt | timestamptz | NOT NULL | - | - | R | 시작 시각 |
| endAt | timestamptz | NOT NULL | - | - | R | 종료 시각 |
| capacity | integer | NULL | null | - | R | 정원 |
| room | text | NULL | null | - | R | 강의실 |
| status | text | NULL | 'OPEN' | - | R | 상태: OPEN, CANCELLED |
| lesson_status | text | NULL | 'scheduled' | - | R/W | 수업 상태: scheduled, in_progress, completed, no_show, cancelled |
| signature_url | text | NULL | null | - | R/W | 서명 URL (Supabase Storage) |
| signature_at | timestamptz | NULL | null | - | R/W | 서명 시각 |
| completed_at | timestamptz | NULL | null | - | R/W | 수업 완료 시각 |
| cancel_deadline_hours | integer | NULL | 3 | - | R | 취소 마감 시간 |
| member_id | integer (FK) | NULL | null | members.id | R | 1:1 수업 회원 ID |
| member_name | text | NULL | null | - | R | 1:1 수업 회원명 |
| staffId | integer (FK) | NULL | null | staff.id | R | 강사 ID (레거시) |

### 2.9 lessons (수업 정의)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 수업 고유 ID |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| name | text | NOT NULL | - | - | R | 수업명 |
| type | text | NOT NULL | - | - | R | 수업 유형 (GROUP, PERSONAL, SEMI) |
| instructorId | integer (FK) | NULL | null | staff.id | R | 담당 강사 ID |
| instructorName | text | NULL | null | - | R | 강사명 |
| capacity | integer | NULL | null | - | R | 정원 |
| duration | integer | NULL | null | - | R | 수업 시간 (분) |
| color | text | NULL | null | - | R | 캘린더 색상 (hex) |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |
| updatedAt | timestamptz | NULL | null | - | R | 수정일시 |

### 2.10 lesson_schedules (수업 일정 - lessons 기반)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 일정 고유 ID |
| lessonId | integer (FK) | NOT NULL | - | lessons.id | R | 수업 ID |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| instructorId | integer (FK) | NULL | null | staff.id | R | 강사 ID |
| startAt | timestamptz | NOT NULL | - | - | R | 시작 시각 |
| endAt | timestamptz | NOT NULL | - | - | R | 종료 시각 |
| capacity | integer | NULL | null | - | R | 정원 |
| currentCount | integer | NULL | 0 | - | R | 현재 예약 수 |
| status | text | NULL | 'OPEN' | - | R | 상태: OPEN, PENDING, CLOSED |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |

### 2.11 lesson_bookings (수업 예약)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 예약 고유 ID |
| scheduleId | integer (FK) | NOT NULL | - | lesson_schedules.id | R | 일정 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| memberName | text | NOT NULL | - | - | R | 회원명 |
| status | text | NOT NULL | 'BOOKED' | - | R/W | 상태: BOOKED, ATTENDED, CANCELLED, NOSHOW, WAITLIST |
| cancelReason | text | NULL | null | - | R/W | 취소 사유 |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |
| updatedAt | timestamptz | NULL | null | - | R | 수정일시 |

### 2.12 lesson_counts (수강권 횟수)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| productId | integer (FK) | NULL | null | products.id | R | 상품 ID |
| productName | text | NOT NULL | - | - | R | 상품명 |
| totalCount | numeric | NOT NULL | - | - | R | 총 횟수 |
| usedCount | numeric | NOT NULL | 0 | - | R | 사용 횟수 |
| startDate | text | NULL | null | - | R | 시작일 |
| endDate | text | NULL | null | - | R | 종료일 |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |
| updatedAt | timestamptz | NULL | null | - | R | 수정일시 |

### 2.13 lesson_count_histories (횟수 차감 이력)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| lessonCountId | integer (FK) | NOT NULL | - | lesson_counts.id | R | 횟수 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| scheduleId | integer (FK) | NULL | null | lesson_schedules.id | R | 수업 일정 ID |
| deductedAt | timestamptz | NOT NULL | - | - | R | 차감 일시 |
| memo | text | NULL | null | - | R | 메모 |

### 2.14 penalties (페널티)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| memberName | text | NOT NULL | - | - | R | 회원명 |
| scheduleId | integer (FK) | NULL | null | lesson_schedules.id | R | 수업 일정 ID |
| type | text | NOT NULL | - | - | R | 유형: NOSHOW, LATE_CANCEL, EARLY_LEAVE, OTHER |
| deductCount | integer | NULL | null | - | R | 차감 횟수 |
| reason | text | NULL | null | - | R | 사유 |
| appliedBy | text | NULL | null | - | R | 적용자 |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |

### 2.15 consultations (상담 이력)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| consultedAt | timestamptz | NOT NULL | - | - | R | 상담 일시 |
| type | text | NOT NULL | - | - | R | 유형: 상담, OT, 체험, 재등록상담 |
| channel | text | NULL | null | - | R | 채널: 방문, 전화, 카카오톡, DM, SNS, 기타 |
| staffName | text | NULL | null | - | R | 담당 직원명 |
| content | text | NULL | null | - | R/W | 상담 내용 |
| status | text | NOT NULL | - | - | R | 상태: 예정, 완료, 취소, 노쇼 |
| result | text | NULL | null | - | R/W | 결과: 등록, 미등록, 보류 |
| nextAction | text | NULL | null | - | R/W | 다음 액션 |
| linkedSaleId | integer (FK) | NULL | null | sales.id | R | 연결 매출 ID |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |

### 2.16 member_body_info (신체정보)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| measuredAt | timestamptz | NOT NULL | - | - | R | 측정일 |
| height | numeric | NULL | null | - | R/W | 키 (cm) |
| weight | numeric | NULL | null | - | R/W | 체중 (kg) |
| bloodPressureSystolic | numeric | NULL | null | - | R/W | 수축기 혈압 |
| bloodPressureDiastolic | numeric | NULL | null | - | R/W | 이완기 혈압 |
| heartRate | numeric | NULL | null | - | R/W | 심박수 |
| memo | text | NULL | null | - | R/W | 메모 |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |

### 2.17 member_evaluations (종합평가)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| evaluatedAt | timestamptz | NOT NULL | - | - | R | 평가일 |
| category | text | NOT NULL | - | - | R | 카테고리: 체력, 자세, 유연성, 근력, 목표달성 |
| score | integer | NOT NULL | - | - | R | 점수 (1~10) |
| content | text | NULL | null | - | R/W | 평가 내용 |
| evaluatorName | text | NULL | null | - | R | 평가자명 |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |

### 2.18 exercise_programs (운동 프로그램)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| branch_id | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| name | text | NOT NULL | - | - | R | 프로그램명 |
| category | text | NULL | null | - | R | 카테고리 |
| difficulty | text | NULL | null | - | R | 난이도: 입문, 초급, 중급, 고급 |
| description | text | NULL | null | - | R | 설명 |
| exercises | jsonb | NULL | null | - | R | 운동 구성 (JSON) |
| is_active | boolean | NULL | true | - | R | 활성 여부 |
| created_at | timestamptz | NULL | now() | - | R | 생성일시 |

### 2.19 member_exercise_programs (회원-프로그램 배정)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| programId | integer (FK) | NOT NULL | - | exercise_programs.id | R | 프로그램 ID |
| assignedBy | integer (FK) | NULL | null | staff.id | R | 배정한 강사 ID |
| assignedAt | timestamptz | NULL | now() | - | R | 배정일시 |
| status | text | NULL | 'ACTIVE' | - | R | 상태: ACTIVE, COMPLETED, CANCELLED |

### 2.20 exercise_logs (운동 이력)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| logDate | text | NOT NULL | - | - | R/W | 운동일 (YYYY-MM-DD) |
| exerciseName | text | NOT NULL | - | - | R/W | 운동명 |
| sets | integer | NULL | null | - | R/W | 세트 수 |
| reps | integer | NULL | null | - | R/W | 반복 수 |
| weightKg | numeric | NULL | null | - | R/W | 중량 (kg) |
| durationMin | integer | NULL | null | - | R/W | 시간 (분) |
| distanceKm | numeric | NULL | null | - | R/W | 거리 (km) |
| memo | text | NULL | null | - | R/W | 메모 |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |

### 2.21 lockers (락커)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| number | integer | NOT NULL | - | - | R | 락커 번호 |
| zone | text | NULL | null | - | R | 구역 (A/B/C) |
| status | text | NOT NULL | 'AVAILABLE' | - | R | 상태: AVAILABLE, IN_USE, MAINTENANCE |
| memberId | integer (FK) | NULL | null | members.id | R | 배정 회원 ID |
| memberName | text | NULL | null | - | R | 배정 회원명 |
| assignedAt | text (ISO) | NULL | null | - | R | 배정일 |
| expiresAt | text (ISO) | NULL | null | - | R | 만료일 |
| password | text | NULL | null | - | R | 락커 비밀번호 |
| memo | text | NULL | null | - | - | 메모 |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |

### 2.22 notices (공지사항)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| title | text | NOT NULL | - | - | R | 제목 |
| content | text | NOT NULL | - | - | R | 내용 |
| author_name | text | NULL | null | - | R | 작성자명 |
| is_pinned | boolean | NULL | false | - | R | 고정글 여부 |
| is_published | boolean | NULL | true | - | R | 공개 여부 |
| branch_id | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| created_at | timestamptz | NULL | now() | - | R | 생성일시 |
| updated_at | timestamptz | NULL | null | - | R | 수정일시 |

### 2.23 settings (센터 설정)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | - | 고유 ID |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| centerName | text | NULL | null | - | R | 센터명 |
| businessHoursOpen | text | NULL | '06:00' | - | R | 영업 시작 시간 |
| businessHoursClose | text | NULL | '22:00' | - | R | 영업 종료 시간 |
| holidays | jsonb | NULL | [] | - | R | 휴무일 배열 |
| smsEnabled | boolean | NULL | false | - | R | SMS 알림 활성 |
| kakaoEnabled | boolean | NULL | false | - | R | 카카오 알림 활성 |
| pushEnabled | boolean | NULL | false | - | R | 푸시 알림 활성 |
| autoExpireNotify | boolean | NULL | false | - | R | 만료 자동 알림 |
| expireNoticeDays | integer | NULL | 7 | - | R | 만료 알림 사전 일수 |

### 2.24 leads (리드/잠재고객)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| name | text | NOT NULL | - | - | R | 이름 |
| phone | text | NULL | null | - | R | 연락처 |
| source | text | NOT NULL | '기타' | - | R | 유입경로: 간판, 인터넷, 전단지, 추천, SNS 등 |
| status | text | NULL | '신규' | - | R/W | 상태: 신규, 연락완료, 상담예정, 방문완료, 등록완료, 미전환, 보류 |
| assignedFc | text | NULL | null | - | R/W | 담당 FC |
| memo | text | NULL | null | - | R/W | 메모 |
| inquiryDate | text | NULL | null | - | R | 문의일 |
| followUpDate | text | NULL | null | - | R/W | 후속 연락일 |
| convertedMemberId | integer (FK) | NULL | null | members.id | R | 전환된 회원 ID |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |

### 2.25 class_templates (그룹수업 템플릿)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| branch_id | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| name | text | NOT NULL | - | - | R | 템플릿명 |
| category | text | NULL | null | - | R | 카테고리 |
| capacity | integer | NULL | null | - | R | 기본 정원 |
| duration | integer | NULL | null | - | R | 기본 수업 시간 (분) |
| color | text | NULL | null | - | R | 캘린더 색상 |
| is_active | boolean | NULL | true | - | R | 활성 여부 |
| created_at | timestamptz | NULL | now() | - | R | 생성일시 |

### 2.26 unpaid (미수금)

| 컬럼명 | 타입 | NULL | 기본값 | FK | 앱 사용 | 설명 |
|--------|------|:----:|--------|-----|:-------:|------|
| id | integer (PK) | NOT NULL | auto | - | R | 고유 ID |
| saleId | integer (FK) | NOT NULL | - | sales.id | R | 매출 ID |
| branchId | integer (FK) | NOT NULL | - | branches.id | R | 지점 ID |
| memberId | integer (FK) | NOT NULL | - | members.id | R | 회원 ID |
| memberName | text | NOT NULL | - | - | R | 회원명 |
| productName | text | NOT NULL | - | - | R | 상품명 |
| unpaidAmount | numeric | NOT NULL | - | - | R | 미수금액 |
| dueDate | text | NULL | null | - | R | 납부 기한 |
| status | text | NOT NULL | 'PENDING' | - | R | 상태: PENDING, PARTIAL, PAID, CANCELLED |
| createdAt | timestamptz | NULL | now() | - | R | 생성일시 |
| updatedAt | timestamptz | NULL | null | - | R | 수정일시 |

---

## 3. 앱 전용 테이블 (신규 생성)

### 3.1 app_users (앱 인증 계정)

앱 전용 인증 테이블. CRM `users` 테이블과 별개로 운영하며, `member_id` 또는 `staff_id`로 기존 CRM 데이터를 참조한다.

| 컬럼명 | 타입 | NULL | 기본값 | FK | 설명 |
|--------|------|:----:|--------|-----|------|
| id | uuid (PK) | NOT NULL | gen_random_uuid() | - | 앱 계정 고유 ID |
| member_id | integer | NULL | null | members.id | 회원인 경우 |
| staff_id | integer | NULL | null | staff.id | 강사/FC/스태프인 경우 |
| phone | varchar(20) | NOT NULL | - | - | 로그인 전화번호 (UNIQUE) |
| password_hash | text | NOT NULL | - | - | bcrypt 해시 비밀번호 |
| role | varchar(20) | NOT NULL | 'member' | - | 역할: member, trainer, golf_trainer, fc, staff |
| app_linked_at | timestamptz | NULL | null | - | CRM 연동 완료 시각 |
| last_login_at | timestamptz | NULL | null | - | 마지막 로그인 시각 |
| auto_login_token | text | NULL | null | - | 자동 로그인 토큰 (refresh token) |
| token_expires_at | timestamptz | NULL | null | - | 토큰 만료 시각 |
| device_info | jsonb | NULL | null | - | 디바이스 정보 (OS, version, model) |
| is_active | boolean | NOT NULL | true | - | 계정 활성 여부 |
| created_at | timestamptz | NOT NULL | now() | - | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | - | 수정일시 |

```sql
CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id integer REFERENCES members(id) ON DELETE SET NULL,
  staff_id integer REFERENCES staff(id) ON DELETE SET NULL,
  phone varchar(20) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'trainer', 'golf_trainer', 'fc', 'staff')),
  app_linked_at timestamptz,
  last_login_at timestamptz,
  auto_login_token text,
  token_expires_at timestamptz,
  device_info jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- member_id 또는 staff_id 중 하나는 반드시 존재
  CONSTRAINT chk_app_users_link CHECK (member_id IS NOT NULL OR staff_id IS NOT NULL)
);

-- 인덱스
CREATE INDEX idx_app_users_member_id ON app_users(member_id);
CREATE INDEX idx_app_users_staff_id ON app_users(staff_id);
CREATE INDEX idx_app_users_role ON app_users(role);
CREATE INDEX idx_app_users_phone ON app_users(phone);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.2 push_tokens (푸시 토큰)

FCM/APNS 푸시 토큰을 관리한다. 한 사용자가 여러 디바이스를 가질 수 있으므로 1:N 관계.

| 컬럼명 | 타입 | NULL | 기본값 | FK | 설명 |
|--------|------|:----:|--------|-----|------|
| id | uuid (PK) | NOT NULL | gen_random_uuid() | - | 고유 ID |
| app_user_id | uuid (FK) | NOT NULL | - | app_users.id | 앱 사용자 ID |
| token | text | NOT NULL | - | - | FCM/APNS 토큰 |
| platform | varchar(10) | NOT NULL | - | - | 플랫폼: ios, android |
| device_id | text | NULL | null | - | 디바이스 고유 식별자 |
| is_active | boolean | NOT NULL | true | - | 활성 여부 |
| created_at | timestamptz | NOT NULL | now() | - | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | - | 수정일시 |

```sql
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform varchar(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_tokens_app_user_id ON push_tokens(app_user_id);
CREATE UNIQUE INDEX idx_push_tokens_token ON push_tokens(token);

CREATE TRIGGER trg_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.3 sms_verifications (SMS 인증)

앱 연동/가입 시 SMS 인증 코드를 관리한다.

| 컬럼명 | 타입 | NULL | 기본값 | FK | 설명 |
|--------|------|:----:|--------|-----|------|
| id | uuid (PK) | NOT NULL | gen_random_uuid() | - | 고유 ID |
| phone | varchar(20) | NOT NULL | - | - | 인증 대상 전화번호 |
| code | varchar(6) | NOT NULL | - | - | 6자리 인증 코드 |
| purpose | varchar(20) | NOT NULL | 'signup' | - | 목적: signup, login, password_reset |
| is_verified | boolean | NOT NULL | false | - | 인증 완료 여부 |
| attempts | integer | NOT NULL | 0 | - | 시도 횟수 (max 5) |
| expires_at | timestamptz | NOT NULL | - | - | 만료 시각 (발급 후 3분) |
| verified_at | timestamptz | NULL | null | - | 인증 완료 시각 |
| created_at | timestamptz | NOT NULL | now() | - | 생성일시 |

```sql
CREATE TABLE sms_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone varchar(20) NOT NULL,
  code varchar(6) NOT NULL,
  purpose varchar(20) NOT NULL DEFAULT 'signup'
    CHECK (purpose IN ('signup', 'login', 'password_reset')),
  is_verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_verifications_phone ON sms_verifications(phone, created_at DESC);
CREATE INDEX idx_sms_verifications_expires ON sms_verifications(expires_at)
  WHERE is_verified = false;
```

### 3.4 class_signatures (수업 서명)

핵심 테이블. 1:1 수업에서 강사-회원 양방향 서명을 관리한다.

| 컬럼명 | 타입 | NULL | 기본값 | FK | 설명 |
|--------|------|:----:|--------|-----|------|
| id | uuid (PK) | NOT NULL | gen_random_uuid() | - | 고유 ID |
| class_id | integer (FK) | NOT NULL | - | classes.id | 수업 ID |
| instructor_id | integer (FK) | NOT NULL | - | staff.id | 강사 ID |
| member_id | integer (FK) | NULL | null | members.id | 회원 ID (그룹수업 시 null) |
| instructor_signature_url | text | NULL | null | - | 강사 서명 이미지 URL (Supabase Storage) |
| instructor_signed_at | timestamptz | NULL | null | - | 강사 서명 시각 |
| instructor_device_info | jsonb | NULL | null | - | 강사 서명 디바이스 정보 |
| member_signature_url | text | NULL | null | - | 회원 서명 이미지 URL |
| member_signed_at | timestamptz | NULL | null | - | 회원 서명 시각 |
| member_device_info | jsonb | NULL | null | - | 회원 서명 디바이스 정보 |
| signature_mode | varchar(20) | NULL | null | - | 서명 방식: face_to_face, remote |
| status | varchar(30) | NOT NULL | 'pending_instructor' | - | 상태 (아래 상태 전이도 참조) |
| signature_hash | text | NULL | null | - | SHA-256 서명 해시 (위변조 방지) |
| expires_at | timestamptz | NULL | null | - | 회원 서명 대기 만료 (24h) |
| created_at | timestamptz | NOT NULL | now() | - | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | - | 수정일시 |

**상태 전이도:**
```
pending_instructor -> pending_member -> completed
                                     -> expired (24h 초과)
                                     -> declined (회원 거절)
```

```sql
CREATE TABLE class_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  instructor_id integer NOT NULL REFERENCES staff(id),
  member_id integer REFERENCES members(id),
  instructor_signature_url text,
  instructor_signed_at timestamptz,
  instructor_device_info jsonb,
  member_signature_url text,
  member_signed_at timestamptz,
  member_device_info jsonb,
  signature_mode varchar(20) CHECK (signature_mode IN ('face_to_face', 'remote')),
  status varchar(30) NOT NULL DEFAULT 'pending_instructor'
    CHECK (status IN ('pending_instructor', 'pending_member', 'completed', 'expired', 'declined')),
  signature_hash text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_class_signatures_class_id ON class_signatures(class_id);
CREATE INDEX idx_class_signatures_status ON class_signatures(status);
CREATE INDEX idx_class_signatures_instructor ON class_signatures(instructor_id, created_at DESC);
CREATE INDEX idx_class_signatures_member ON class_signatures(member_id, created_at DESC);
CREATE INDEX idx_class_signatures_expires ON class_signatures(expires_at)
  WHERE status = 'pending_member';

CREATE TRIGGER trg_class_signatures_updated_at
  BEFORE UPDATE ON class_signatures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.5 lesson_certificates (레슨 확인서)

수업 완료 후 발급되는 확인서. 서명 완료된 수업에 대해 PDF/이미지를 생성.

| 컬럼명 | 타입 | NULL | 기본값 | FK | 설명 |
|--------|------|:----:|--------|-----|------|
| id | uuid (PK) | NOT NULL | gen_random_uuid() | - | 고유 ID |
| signature_id | uuid (FK) | NOT NULL | - | class_signatures.id | 서명 ID |
| class_id | integer (FK) | NOT NULL | - | classes.id | 수업 ID |
| member_id | integer (FK) | NOT NULL | - | members.id | 회원 ID |
| instructor_id | integer (FK) | NOT NULL | - | staff.id | 강사 ID |
| certificate_url | text | NOT NULL | - | - | 확인서 파일 URL (Supabase Storage) |
| certificate_number | text | NOT NULL | - | - | 확인서 번호 (YYYYMMDD-XXXX) |
| class_date | date | NOT NULL | - | - | 수업일 |
| class_title | text | NOT NULL | - | - | 수업명 |
| instructor_name | text | NOT NULL | - | - | 강사명 |
| member_name | text | NOT NULL | - | - | 회원명 |
| issued_at | timestamptz | NOT NULL | now() | - | 발급 시각 |
| created_at | timestamptz | NOT NULL | now() | - | 생성일시 |

```sql
CREATE TABLE lesson_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id uuid NOT NULL REFERENCES class_signatures(id) ON DELETE CASCADE,
  class_id integer NOT NULL REFERENCES classes(id),
  member_id integer NOT NULL REFERENCES members(id),
  instructor_id integer NOT NULL REFERENCES staff(id),
  certificate_url text NOT NULL,
  certificate_number text NOT NULL UNIQUE,
  class_date date NOT NULL,
  class_title text NOT NULL,
  instructor_name text NOT NULL,
  member_name text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_certificates_member ON lesson_certificates(member_id, issued_at DESC);
CREATE INDEX idx_lesson_certificates_instructor ON lesson_certificates(instructor_id, issued_at DESC);
CREATE INDEX idx_lesson_certificates_class ON lesson_certificates(class_id);
CREATE UNIQUE INDEX idx_lesson_certificates_signature ON lesson_certificates(signature_id);
```

### 3.6 app_inquiries (1:1 문의)

회원이 앱에서 작성하는 1:1 문의.

| 컬럼명 | 타입 | NULL | 기본값 | FK | 설명 |
|--------|------|:----:|--------|-----|------|
| id | uuid (PK) | NOT NULL | gen_random_uuid() | - | 고유 ID |
| app_user_id | uuid (FK) | NOT NULL | - | app_users.id | 앱 사용자 ID |
| member_id | integer (FK) | NOT NULL | - | members.id | 회원 ID |
| branch_id | integer (FK) | NOT NULL | - | branches.id | 지점 ID |
| category | varchar(30) | NOT NULL | 'general' | - | 카테고리: general, payment, reservation, facility, complaint, other |
| title | text | NOT NULL | - | - | 제목 |
| content | text | NOT NULL | - | - | 내용 |
| attachment_urls | jsonb | NULL | '[]' | - | 첨부파일 URL 배열 |
| status | varchar(20) | NOT NULL | 'open' | - | 상태: open, in_progress, resolved, closed |
| reply | text | NULL | null | - | 답변 내용 |
| replied_by | integer (FK) | NULL | null | staff.id | 답변자 (직원 ID) |
| replied_at | timestamptz | NULL | null | - | 답변 시각 |
| created_at | timestamptz | NOT NULL | now() | - | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | - | 수정일시 |

```sql
CREATE TABLE app_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  member_id integer NOT NULL REFERENCES members(id),
  branch_id integer NOT NULL REFERENCES branches(id),
  category varchar(30) NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'payment', 'reservation', 'facility', 'complaint', 'other')),
  title text NOT NULL,
  content text NOT NULL,
  attachment_urls jsonb DEFAULT '[]'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  reply text,
  replied_by integer REFERENCES staff(id),
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_inquiries_member ON app_inquiries(member_id, created_at DESC);
CREATE INDEX idx_app_inquiries_branch ON app_inquiries(branch_id, status);
CREATE INDEX idx_app_inquiries_status ON app_inquiries(status);

CREATE TRIGGER trg_app_inquiries_updated_at
  BEFORE UPDATE ON app_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.7 app_settings (앱 개인 설정)

사용자별 앱 설정값을 저장한다.

| 컬럼명 | 타입 | NULL | 기본값 | FK | 설명 |
|--------|------|:----:|--------|-----|------|
| id | uuid (PK) | NOT NULL | gen_random_uuid() | - | 고유 ID |
| app_user_id | uuid (FK) | NOT NULL | - | app_users.id | 앱 사용자 ID (UNIQUE) |
| push_enabled | boolean | NOT NULL | true | - | 푸시 알림 활성 |
| push_reservation | boolean | NOT NULL | true | - | 예약 알림 |
| push_class_reminder | boolean | NOT NULL | true | - | 수업 리마인더 (30분 전) |
| push_expiry_notice | boolean | NOT NULL | true | - | 이용권 만료 알림 |
| push_notice | boolean | NOT NULL | true | - | 공지사항 알림 |
| push_marketing | boolean | NOT NULL | false | - | 마케팅 알림 |
| language | varchar(5) | NOT NULL | 'ko' | - | 언어: ko, en |
| theme | varchar(10) | NOT NULL | 'system' | - | 테마: light, dark, system |
| created_at | timestamptz | NOT NULL | now() | - | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | - | 수정일시 |

```sql
CREATE TABLE app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  push_reservation boolean NOT NULL DEFAULT true,
  push_class_reminder boolean NOT NULL DEFAULT true,
  push_expiry_notice boolean NOT NULL DEFAULT true,
  push_notice boolean NOT NULL DEFAULT true,
  push_marketing boolean NOT NULL DEFAULT false,
  language varchar(5) NOT NULL DEFAULT 'ko',
  theme varchar(10) NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.8 app_versions (앱 버전 관리)

앱 버전 관리 및 강제 업데이트 제어용.

| 컬럼명 | 타입 | NULL | 기본값 | FK | 설명 |
|--------|------|:----:|--------|-----|------|
| id | uuid (PK) | NOT NULL | gen_random_uuid() | - | 고유 ID |
| platform | varchar(10) | NOT NULL | - | - | 플랫폼: ios, android |
| version | varchar(20) | NOT NULL | - | - | 버전 (semver: 1.0.0) |
| min_version | varchar(20) | NOT NULL | - | - | 최소 지원 버전 |
| force_update | boolean | NOT NULL | false | - | 강제 업데이트 여부 |
| release_notes | text | NULL | null | - | 릴리즈 노트 |
| store_url | text | NULL | null | - | 스토어 링크 |
| is_active | boolean | NOT NULL | true | - | 활성 여부 |
| released_at | timestamptz | NOT NULL | now() | - | 출시 시각 |
| created_at | timestamptz | NOT NULL | now() | - | 생성일시 |

```sql
CREATE TABLE app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform varchar(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  version varchar(20) NOT NULL,
  min_version varchar(20) NOT NULL,
  force_update boolean NOT NULL DEFAULT false,
  release_notes text,
  store_url text,
  is_active boolean NOT NULL DEFAULT true,
  released_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (platform, version)
);

CREATE INDEX idx_app_versions_platform ON app_versions(platform, is_active, released_at DESC);
```

### 3.9 subscriptions (구독/자동결제)

회원의 정기결제(구독)를 관리한다.

| 컬럼명 | 타입 | NULL | 기본값 | FK | 설명 |
|--------|------|:----:|--------|-----|------|
| id | uuid (PK) | NOT NULL | gen_random_uuid() | - | 고유 ID |
| app_user_id | uuid (FK) | NOT NULL | - | app_users.id | 앱 사용자 ID |
| member_id | integer (FK) | NOT NULL | - | members.id | 회원 ID |
| branch_id | integer (FK) | NOT NULL | - | branches.id | 지점 ID |
| product_id | integer (FK) | NOT NULL | - | products.id | 상품 ID |
| product_name | text | NOT NULL | - | - | 상품명 |
| amount | numeric | NOT NULL | - | - | 결제 금액 |
| billing_cycle | varchar(20) | NOT NULL | 'monthly' | - | 결제 주기: weekly, monthly, yearly |
| billing_day | integer | NOT NULL | 1 | - | 결제일 (1~28) |
| payment_method | varchar(20) | NOT NULL | - | - | 결제수단: card, bank_transfer |
| card_last4 | varchar(4) | NULL | null | - | 카드 마지막 4자리 |
| card_company | text | NULL | null | - | 카드사 |
| billing_key | text | NULL | null | - | PG 빌링키 (암호화 저장) |
| status | varchar(20) | NOT NULL | 'active' | - | 상태: active, paused, cancelled, expired |
| next_billing_at | timestamptz | NOT NULL | - | - | 다음 결제 예정일 |
| last_billed_at | timestamptz | NULL | null | - | 마지막 결제일 |
| started_at | timestamptz | NOT NULL | now() | - | 구독 시작일 |
| cancelled_at | timestamptz | NULL | null | - | 구독 취소일 |
| cancel_reason | text | NULL | null | - | 취소 사유 |
| created_at | timestamptz | NOT NULL | now() | - | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | - | 수정일시 |

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  member_id integer NOT NULL REFERENCES members(id),
  branch_id integer NOT NULL REFERENCES branches(id),
  product_id integer NOT NULL REFERENCES products(id),
  product_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  billing_cycle varchar(20) NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('weekly', 'monthly', 'yearly')),
  billing_day integer NOT NULL DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
  payment_method varchar(20) NOT NULL CHECK (payment_method IN ('card', 'bank_transfer')),
  card_last4 varchar(4),
  card_company text,
  billing_key text,
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  next_billing_at timestamptz NOT NULL,
  last_billed_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_at)
  WHERE status = 'active';
CREATE INDEX idx_subscriptions_branch ON subscriptions(branch_id);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 4. RLS 정책

### 4.1 공통 헬퍼 함수

```sql
-- 현재 앱 사용자의 app_users.id를 반환
CREATE OR REPLACE FUNCTION app_user_id()
RETURNS uuid AS $$
  SELECT id FROM app_users
  WHERE id = auth.uid()::uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 현재 앱 사용자의 role을 반환
CREATE OR REPLACE FUNCTION app_user_role()
RETURNS text AS $$
  SELECT role FROM app_users
  WHERE id = auth.uid()::uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 현재 앱 사용자의 member_id를 반환
CREATE OR REPLACE FUNCTION app_member_id()
RETURNS integer AS $$
  SELECT member_id FROM app_users
  WHERE id = auth.uid()::uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 현재 앱 사용자의 staff_id를 반환
CREATE OR REPLACE FUNCTION app_staff_id()
RETURNS integer AS $$
  SELECT staff_id FROM app_users
  WHERE id = auth.uid()::uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 4.2 members 테이블

```sql
-- RLS 활성화
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 회원: 본인 데이터만 조회
CREATE POLICY "app_members_select_own" ON members
  FOR SELECT USING (
    app_user_role() = 'member' AND id = app_member_id()
  );

-- 회원: 본인 프로필 수정 (제한된 컬럼만 - 앱 레이어에서 제어)
CREATE POLICY "app_members_update_own" ON members
  FOR UPDATE USING (
    app_user_role() = 'member' AND id = app_member_id()
  );

-- 트레이너: 담당 회원 조회 (같은 지점 + 수업 배정 기반)
CREATE POLICY "app_members_select_trainer" ON members
  FOR SELECT USING (
    app_user_role() IN ('trainer', 'golf_trainer')
    AND (
      id IN (
        SELECT lb.memberId FROM lesson_bookings lb
        JOIN lesson_schedules ls ON lb.scheduleId = ls.id
        WHERE ls.instructorId = app_staff_id()
      )
      OR
      id IN (
        SELECT member_id FROM classes
        WHERE instructorId = app_staff_id() OR staffId = app_staff_id()
      )
    )
  );

-- FC: 소속 지점 전체 회원 조회
CREATE POLICY "app_members_select_fc" ON members
  FOR SELECT USING (
    app_user_role() = 'fc'
    AND branchId IN (
      SELECT branchId FROM staff WHERE id = app_staff_id()
    )
  );

-- 스태프: 소속 지점 전체 회원 조회
CREATE POLICY "app_members_select_staff" ON members
  FOR SELECT USING (
    app_user_role() = 'staff'
    AND branchId IN (
      SELECT branchId FROM staff WHERE id = app_staff_id()
    )
  );
```

### 4.3 attendance 테이블

```sql
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 회원: 본인 출석 조회
CREATE POLICY "app_attendance_select_own" ON attendance
  FOR SELECT USING (
    app_user_role() = 'member' AND memberId = app_member_id()
  );

-- 회원: 본인 출석 등록 (앱 QR 체크인)
CREATE POLICY "app_attendance_insert_own" ON attendance
  FOR INSERT WITH CHECK (
    app_user_role() = 'member' AND memberId = app_member_id()
  );

-- 트레이너/FC/스태프: 소속 지점 출석 조회
CREATE POLICY "app_attendance_select_branch" ON attendance
  FOR SELECT USING (
    app_user_role() IN ('trainer', 'golf_trainer', 'fc', 'staff')
    AND branchId IN (
      SELECT branchId FROM staff WHERE id = app_staff_id()
    )
  );

-- 스태프: 출석 등록/수정 (수동 출석 처리)
CREATE POLICY "app_attendance_manage_staff" ON attendance
  FOR ALL USING (
    app_user_role() = 'staff'
    AND branchId IN (
      SELECT branchId FROM staff WHERE id = app_staff_id()
    )
  );
```

### 4.4 lesson_bookings 테이블

```sql
ALTER TABLE lesson_bookings ENABLE ROW LEVEL SECURITY;

-- 회원: 본인 예약 조회/생성/취소
CREATE POLICY "app_bookings_member" ON lesson_bookings
  FOR ALL USING (
    app_user_role() = 'member' AND memberId = app_member_id()
  );

-- 트레이너: 담당 수업 예약 관리
CREATE POLICY "app_bookings_trainer" ON lesson_bookings
  FOR ALL USING (
    app_user_role() IN ('trainer', 'golf_trainer')
    AND scheduleId IN (
      SELECT id FROM lesson_schedules
      WHERE instructorId = app_staff_id()
    )
  );
```

### 4.5 classes 테이블

```sql
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- 회원: 소속 지점 수업 조회
CREATE POLICY "app_classes_select_member" ON classes
  FOR SELECT USING (
    app_user_role() = 'member'
    AND branchId IN (
      SELECT branchId FROM members WHERE id = app_member_id()
    )
  );

-- 트레이너: 본인 수업 조회/수정
CREATE POLICY "app_classes_trainer" ON classes
  FOR ALL USING (
    app_user_role() IN ('trainer', 'golf_trainer')
    AND (instructorId = app_staff_id() OR staffId = app_staff_id())
  );
```

### 4.6 class_signatures 테이블

```sql
ALTER TABLE class_signatures ENABLE ROW LEVEL SECURITY;

-- 강사: 본인이 서명해야 하는 건 조회/수정
CREATE POLICY "app_signatures_trainer" ON class_signatures
  FOR ALL USING (
    app_user_role() IN ('trainer', 'golf_trainer')
    AND instructor_id = app_staff_id()
  );

-- 회원: 본인이 서명해야 하는 건 조회/수정
CREATE POLICY "app_signatures_member" ON class_signatures
  FOR ALL USING (
    app_user_role() = 'member'
    AND member_id = app_member_id()
  );
```

### 4.7 sales 테이블

```sql
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 회원: 본인 결제 이력 조회
CREATE POLICY "app_sales_select_own" ON sales
  FOR SELECT USING (
    app_user_role() = 'member' AND memberId = app_member_id()
  );

-- FC: 소속 지점 매출 관리
CREATE POLICY "app_sales_fc" ON sales
  FOR ALL USING (
    app_user_role() = 'fc'
    AND branchId IN (
      SELECT branchId FROM staff WHERE id = app_staff_id()
    )
  );
```

### 4.8 app_users 테이블

```sql
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- 본인 계정만 조회/수정
CREATE POLICY "app_users_own" ON app_users
  FOR ALL USING (id = auth.uid()::uuid);
```

### 4.9 app_settings 테이블

```sql
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 본인 설정만 조회/수정
CREATE POLICY "app_settings_own" ON app_settings
  FOR ALL USING (app_user_id = auth.uid()::uuid);
```

### 4.10 app_inquiries 테이블

```sql
ALTER TABLE app_inquiries ENABLE ROW LEVEL SECURITY;

-- 회원: 본인 문의만 조회/생성
CREATE POLICY "app_inquiries_member" ON app_inquiries
  FOR ALL USING (
    app_user_role() = 'member' AND app_user_id = auth.uid()::uuid
  );

-- 스태프/FC: 소속 지점 문의 조회/답변
CREATE POLICY "app_inquiries_staff" ON app_inquiries
  FOR ALL USING (
    app_user_role() IN ('fc', 'staff')
    AND branch_id IN (
      SELECT branchId FROM staff WHERE id = app_staff_id()
    )
  );
```

### 4.11 notices 테이블

```sql
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- 앱 사용자: 공개 공지만 조회
CREATE POLICY "app_notices_select_published" ON notices
  FOR SELECT USING (
    is_published = true
    AND branch_id IN (
      SELECT COALESCE(
        (SELECT branchId FROM members WHERE id = app_member_id()),
        (SELECT branchId FROM staff WHERE id = app_staff_id())
      )
    )
  );
```

### 4.12 products 테이블

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 앱 사용자: 활성 상품 조회 (ONLINE, ALL 판매 채널)
CREATE POLICY "app_products_select" ON products
  FOR SELECT USING (
    isActive = true
    AND (salesChannel IS NULL OR salesChannel IN ('ALL', 'ONLINE'))
    AND branchId IN (
      SELECT COALESCE(
        (SELECT branchId FROM members WHERE id = app_member_id()),
        (SELECT branchId FROM staff WHERE id = app_staff_id())
      )
    )
  );
```

---

## 5. 인덱스

### 5.1 기존 테이블 추가 인덱스 (앱 성능 최적화)

```sql
-- 출석: 회원별 최근 출석 조회
CREATE INDEX IF NOT EXISTS idx_attendance_member_date
  ON attendance(memberId, checkInAt DESC);

-- 출석: 지점별 날짜 범위 조회
CREATE INDEX IF NOT EXISTS idx_attendance_branch_date
  ON attendance(branchId, checkInAt DESC);

-- 수업 예약: 회원별 예약 조회
CREATE INDEX IF NOT EXISTS idx_lesson_bookings_member
  ON lesson_bookings(memberId, createdAt DESC);

-- 수업 예약: 일정별 예약 조회
CREATE INDEX IF NOT EXISTS idx_lesson_bookings_schedule
  ON lesson_bookings(scheduleId, status);

-- 수업 일정: 강사별 일정 조회
CREATE INDEX IF NOT EXISTS idx_lesson_schedules_instructor
  ON lesson_schedules(instructorId, startAt);

-- 수업 일정: 지점별 날짜 범위 조회
CREATE INDEX IF NOT EXISTS idx_lesson_schedules_branch_date
  ON lesson_schedules(branchId, startAt);

-- classes: 강사별 수업 조회
CREATE INDEX IF NOT EXISTS idx_classes_instructor_date
  ON classes(instructorId, startAt DESC);

-- classes: 수업 상태별 조회
CREATE INDEX IF NOT EXISTS idx_classes_branch_status
  ON classes(branchId, lesson_status);

-- 매출: 회원별 결제 이력
CREATE INDEX IF NOT EXISTS idx_sales_member_date
  ON sales(memberId, saleDate DESC);

-- 체성분/신체정보: 회원별 측정 이력
CREATE INDEX IF NOT EXISTS idx_body_composition_member
  ON bodyComposition(memberId, date DESC);

CREATE INDEX IF NOT EXISTS idx_member_body_info_member
  ON member_body_info(memberId, measuredAt DESC);

-- 수강권 횟수: 회원별 조회
CREATE INDEX IF NOT EXISTS idx_lesson_counts_member
  ON lesson_counts(memberId);

-- 운동 이력: 회원별 날짜순
CREATE INDEX IF NOT EXISTS idx_exercise_logs_member_date
  ON exercise_logs(memberId, logDate DESC);

-- 공지사항: 지점별 최신순
CREATE INDEX IF NOT EXISTS idx_notices_branch_date
  ON notices(branch_id, is_pinned DESC, created_at DESC);
```

### 5.2 앱 전용 테이블 인덱스

> 각 테이블의 CREATE TABLE 문에 이미 포함됨 (섹션 3 참조)

---

## 6. ER 다이어그램 (텍스트)

```
+---------------------------------------------------------------------+
|                        앱 인증 / 설정 계층                           |
+---------------------------------------------------------------------+
|                                                                     |
|  app_users --1:1--> members          (member_id FK)                 |
|  app_users --1:1--> staff            (staff_id FK)                  |
|  app_users --1:N--> push_tokens      (app_user_id FK)              |
|  app_users --1:1--> app_settings     (app_user_id FK, UNIQUE)      |
|  app_users --1:N--> app_inquiries    (app_user_id FK)              |
|  app_users --1:N--> subscriptions    (app_user_id FK)              |
|                                                                     |
|  sms_verifications  (독립, phone 기반)                               |
|  app_versions       (독립, platform 기반)                            |
|                                                                     |
+---------------------------------------------------------------------+
|                        CRM 코어 계층                                 |
+---------------------------------------------------------------------+
|                                                                     |
|  branches --1:N--> members           (branchId FK)                  |
|  branches --1:N--> staff             (branchId FK)                  |
|  branches --1:N--> products          (branchId FK)                  |
|  branches --1:N--> settings          (branchId FK)                  |
|  branches --1:N--> notices           (branch_id FK)                 |
|  branches --1:N--> leads             (branchId FK)                  |
|                                                                     |
|  members --1:N--> sales              (memberId FK)                  |
|  members --1:N--> attendance         (memberId FK)                  |
|  members --1:N--> lesson_bookings    (memberId FK)                  |
|  members --1:N--> consultations      (memberId FK)                  |
|  members --1:N--> member_body_info   (memberId FK)                  |
|  members --1:N--> member_evaluations (memberId FK)                  |
|  members --1:N--> exercise_logs      (memberId FK)                  |
|  members --1:N--> lesson_counts      (memberId FK)                  |
|  members --1:N--> member_exercise_programs (memberId FK)            |
|  members --1:N--> penalties          (memberId FK)                  |
|  members --1:N--> member_memos       (memberId FK)                  |
|  members --1:1--> lockers            (memberId FK)                  |
|                                                                     |
|  staff --1:N--> classes              (instructorId FK)              |
|  staff --1:N--> lessons              (instructorId FK)              |
|  staff --1:N--> lesson_schedules     (instructorId FK)              |
|  staff --1:N--> class_signatures     (instructor_id FK)             |
|                                                                     |
+---------------------------------------------------------------------+
|                        수업 / 서명 계층                              |
+---------------------------------------------------------------------+
|                                                                     |
|  lessons --1:N--> lesson_schedules   (lessonId FK)                  |
|  lesson_schedules --1:N--> lesson_bookings (scheduleId FK)          |
|  lesson_counts --1:N--> lesson_count_histories (lessonCountId FK)   |
|                                                                     |
|  classes --1:1--> class_signatures   (class_id FK, UNIQUE)          |
|  class_signatures --1:1--> lesson_certificates (signature_id FK)    |
|                                                                     |
|  products --1:N--> sales             (productId FK)                 |
|  products --1:N--> subscriptions     (product_id FK)                |
|  products --1:N--> lesson_counts     (productId FK)                 |
|                                                                     |
+---------------------------------------------------------------------+
```

---

## 7. 데이터 마이그레이션

### 7.1 마이그레이션 전략

앱 출시 시 기존 CRM 데이터에서 앱 전용 테이블로의 마이그레이션이 필요하다.

**원칙:**
1. 기존 CRM 테이블은 **변경하지 않는다** (앱 전용 컬럼 추가 불가)
2. 앱 전용 테이블은 **FK로 기존 데이터를 참조**한다
3. 마이그레이션은 **단방향** (CRM -> 앱 전용)으로만 진행

### 7.2 app_users 초기 생성

기존 회원/직원 데이터로 앱 계정을 일괄 생성한다.

```sql
-- 1단계: 기존 활성 회원을 app_users에 등록
-- (비밀번호는 초기값으로 생성, 첫 로그인 시 변경 유도)
INSERT INTO app_users (member_id, phone, password_hash, role)
SELECT
  m.id,
  m.phone,
  crypt('fitgenie0000', gen_salt('bf')),  -- 초기 비밀번호
  'member'
FROM members m
WHERE m.deletedAt IS NULL
  AND m.status IN ('ACTIVE', 'HOLDING')
  AND m.phone IS NOT NULL
  AND m.phone != ''
ON CONFLICT (phone) DO NOTHING;

-- 2단계: 기존 활성 직원을 app_users에 등록
INSERT INTO app_users (staff_id, phone, password_hash, role)
SELECT
  s.id,
  s.phone,
  crypt('fitgenie0000', gen_salt('bf')),
  CASE s.role
    WHEN '트레이너' THEN 'trainer'
    WHEN 'FC' THEN 'fc'
    WHEN '센터장' THEN 'staff'
    WHEN '매니저' THEN 'staff'
    WHEN '스태프' THEN 'staff'
    WHEN '프론트' THEN 'staff'
    ELSE 'staff'
  END
FROM staff s
WHERE s.isActive = true
  AND s.phone IS NOT NULL
  AND s.phone != ''
ON CONFLICT (phone) DO NOTHING;
```

### 7.3 app_settings 기본값 생성

```sql
-- app_users 생성 후 기본 설정 레코드 생성
INSERT INTO app_settings (app_user_id)
SELECT id FROM app_users
ON CONFLICT (app_user_id) DO NOTHING;
```

### 7.4 Supabase Storage 버킷 설정

```sql
-- 서명 이미지 버킷
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false);

-- 레슨 확인서 버킷
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false);

-- 1:1 문의 첨부파일 버킷
INSERT INTO storage.buckets (id, name, public)
VALUES ('inquiry-attachments', 'inquiry-attachments', false);

-- Storage RLS: 서명 이미지는 당사자만 접근
CREATE POLICY "signature_access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'signatures'
    AND (
      -- 강사 본인 서명
      (storage.foldername(name))[1] = 'instructor'
      AND EXISTS (
        SELECT 1 FROM class_signatures cs
        WHERE cs.instructor_signature_url LIKE '%' || name
          AND cs.instructor_id = app_staff_id()
      )
      OR
      -- 회원 본인 서명
      (storage.foldername(name))[1] = 'member'
      AND EXISTS (
        SELECT 1 FROM class_signatures cs
        WHERE cs.member_signature_url LIKE '%' || name
          AND cs.member_id = app_member_id()
      )
    )
  );
```

### 7.5 마이그레이션 실행 순서

| 순서 | 대상 | 설명 |
|:----:|------|------|
| 1 | `update_updated_at()` 함수 | 공통 트리거 함수 생성 |
| 2 | `app_users` 테이블 | 앱 인증 테이블 생성 |
| 3 | `push_tokens` 테이블 | 푸시 토큰 테이블 생성 |
| 4 | `sms_verifications` 테이블 | SMS 인증 테이블 생성 |
| 5 | `class_signatures` 테이블 | 수업 서명 테이블 생성 |
| 6 | `lesson_certificates` 테이블 | 레슨 확인서 테이블 생성 |
| 7 | `app_inquiries` 테이블 | 1:1 문의 테이블 생성 |
| 8 | `app_settings` 테이블 | 앱 설정 테이블 생성 |
| 9 | `app_versions` 테이블 | 앱 버전 테이블 생성 |
| 10 | `subscriptions` 테이블 | 구독 테이블 생성 |
| 11 | RLS 헬퍼 함수 | `app_user_id()` 등 함수 생성 |
| 12 | RLS 정책 | 각 테이블별 RLS 정책 적용 |
| 13 | 기존 테이블 인덱스 추가 | 앱 쿼리 성능 최적화 인덱스 |
| 14 | 초기 데이터 | `app_users` + `app_settings` 일괄 생성 |
| 15 | Storage 버킷 | 서명/확인서/첨부파일 버킷 생성 |
