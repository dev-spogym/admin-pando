# 스포짐 CRM 데이터 정의서

**버전**: v2.0
**작성일**: 2026-03-11
**DBMS**: PostgreSQL
**상태**: 확정

## 목차

1. [ERD 개요](#erd-개요)
2. [테이블 목록](#테이블-목록)
3. [테이블별 상세 정의](#테이블별-상세-정의)
4. [공통 컬럼 규칙](#공통-컬럼-규칙)

## ERD 개요

### 시스템 아키텍처

```
tenants (본사)
  └─ branches (지점)
       ├─ users (사용자/FC)
       ├─ staff (직원)
       ├─ products (상품)
       ├─ members (회원)
       ├─ lockers (락커)
       ├─ sales (매출)
       ├─ messages (메시지)
       ├─ coupons (쿠폰)
       └─ mileage (마일리지)

회원 관련
  ├─ member_tickets (회원 이용권)
  ├─ attendance (회원 출석)
  └─ contracts (계약)

직원 관련
  ├─ payroll (급여)
  └─ staff_attendance (직원 출석)
```

### 주요 FK 관계

| 테이블 | 관계 | 설명 |
|--------|------|------|
| branches | tenants.id | 지점이 소속한 테넌트 |
| users | branches.id | 사용자가 소속한 지점 |
| staff | branches.id | 직원이 소속한 지점 |
| members | branches.id | 회원이 소속한 지점 |
| members | users.id (manager_id) | 회원의 담당 FC |
| products | branches.id | 상품이 등록된 지점 |
| member_tickets | members.id | 회원의 이용권 |
| member_tickets | products.id | 구매한 상품 |
| attendance | members.id | 출석한 회원 |
| contracts | members.id, products.id | 계약 회원 및 상품 |
| sales | members.id (buyer_id) | 구매 회원 |
| sales | users.id (manager_id) | 담당 FC |
| mileage | members.id | 마일리지 회원 |
| lockers | members.id | 배정된 회원 |
| messages | users.id (sender_id) | 메시지 발송자 |
| payroll | staff.id | 직원 급여 |
| staff_attendance | staff.id | 직원 출석 기록 |

### 멀티테넌시 설계

- **테넌트 격리**: `tenant_id`를 통한 상위 격리 (tenants 테이블)
- **지점 격리**: `branch_id`를 통한 하위 격리 (대부분의 비즈니스 테이블)
- **데이터 격리 패턴**:
  - 사용자(`users`), 회원(`members`), 직원(`staff`) 등 모든 엔티티는 `branch_id`를 가짐
  - 조회 시 항상 `branch_id` 조건 필수 (쿼리 필터)
  - 교차 지점 접근은 `is_other_branch` 플래그로 관리 (출석 시스템)

## 테이블 목록

### 인증/사용자

| 테이블 | 설명 | 컬럼수 | 상태 |
|--------|------|--------|------|
| tenants | 본사/테넌트 정보 | 7 | 확정 |
| branches | 지점 정보 | 8 | 확정 |
| users | 사용자 계정 | 10 | 확정 |

### 회원

| 테이블 | 설명 | 컬럼수 | 상태 |
|--------|------|--------|------|
| members | 회원 정보 | 16 | 확정 |
| member_tickets | 회원 이용권 | 10 | 확정 |
| attendance | 회원 출석 기록 | 13 | 확정 |

### 상품

| 테이블 | 설명 | 컬럼수 | 상태 |
|--------|------|--------|------|
| products | 상품/서비스 | 13 | 확정 |
| contracts | 회원 계약 | 10 | 확정 |

### 매출

| 테이블 | 설명 | 컬럼수 | 상태 |
|--------|------|--------|------|
| sales | 판매 거래 | 24 | 확정 |

### 시설

| 테이블 | 설명 | 컬럼수 | 상태 |
|--------|------|--------|------|
| lockers | 락커 정보 | 11 | 확정 |

### 직원

| 테이블 | 설명 | 컬럼수 | 상태 |
|--------|------|--------|------|
| staff | 직원 정보 | 15 | 확정 |
| payroll | 급여 정보 | 10 | 확정 |
| staff_attendance | 직원 출석 | 8 | 확정 |

### 메시지/마케팅

| 테이블 | 설명 | 컬럼수 | 상태 |
|--------|------|--------|------|
| messages | 메시지/알림 | 10 | 확정 |
| coupons | 쿠폰 | 11 | 확정 |
| mileage | 마일리지 | 8 | 확정 |

## 테이블별 상세 정의

### 인증/사용자

#### tenants

**설명**: 본사/테넌트 정보. 멀티테넌시의 최상위 엔티티.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 테넌트 고유 ID (auto increment) |
| name | VARCHAR(100) | X |  |  |  |  | 테넌트(본사) 이름 |
| code | VARCHAR(20) | X |  |  |  | UNIQUE | 테넌트 코드 (고유) |
| plan | ENUM | X | basic |  |  |  | 요금제 (basic/standard/premium) |
| status | ENUM | X | active |  |  | Y | 상태 (active/inactive/suspended) |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |
| updated_at | DATETIME | O |  |  |  |  | 수정일시 |

#### branches

**설명**: 지점 정보. 각 테넌트는 여러 지점을 보유 가능.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 지점 고유 ID |
| tenant_id | BIGINT | X |  |  | tenants.id | Y | 소속 테넌트 FK |
| name | VARCHAR(100) | X |  |  |  |  | 지점명 |
| code | VARCHAR(20) | X |  |  |  | UNIQUE | 지점 코드 (고유) |
| address | VARCHAR(255) | O |  |  |  |  | 지점 주소 |
| phone | VARCHAR(20) | O |  |  |  |  | 지점 연락처 |
| status | ENUM | X | active |  |  | Y | 상태 (active/inactive) |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

#### users

**설명**: 시스템 사용자 계정. FC(피트니스 센터 담당자), 관리자 등.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 사용자 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 소속 지점 FK |
| email | VARCHAR(100) | X |  |  |  | UNIQUE | 로그인 이메일 |
| password_hash | VARCHAR(255) | X |  |  |  |  | 비밀번호 해시 |
| name | VARCHAR(50) | X |  |  |  | Y | 사용자 이름 |
| role | ENUM | X |  |  |  | Y | 역할 (super_admin/center_manager/manager/fc/staff/viewer) |
| status | ENUM | X | active |  |  | Y | 상태 (active/inactive/locked) |
| last_login | DATETIME | O |  |  |  |  | 마지막 로그인 일시 |
| login_fail_count | INT | X | 0 |  |  |  | 연속 로그인 실패 횟수 |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

### 회원

#### members

**설명**: 피트니스 회원 정보. 지점별 관리.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 회원 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 소속 지점 FK (데이터 격리) |
| name | VARCHAR(50) | X |  |  |  | Y | 회원 이름 |
| gender | ENUM | X |  |  |  | Y | 성별 (M/F) |
| birth_date | VARCHAR(10) | O |  |  |  |  | 생년월일 (YYYY-MM-DD) |
| phone | VARCHAR(20) | X |  |  |  | Y | 연락처 |
| email | VARCHAR(100) | O |  |  |  |  | 이메일 |
| address | VARCHAR(255) | O |  |  |  |  | 주소 |
| status | ENUM | X | active |  |  | Y | 상태 (active/expired/suspended/withdrawn) |
| manager_id | BIGINT | O |  |  | users.id | Y | 담당 FC ID |
| attendance_no | VARCHAR(20) | O |  |  |  | UNIQUE | 출석 번호 |
| company | VARCHAR(100) | O |  |  |  |  | 직장명 |
| memo | TEXT | O |  |  |  |  | 관리자 메모 |
| first_reg_date | DATETIME | X | NOW() |  |  |  | 최초 등록일 |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |
| updated_at | DATETIME | O |  |  |  |  | 수정일시 |

#### member_tickets

**설명**: 회원 이용권. 기간제/횟수제/무제한 등 구분.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 이용권 고유 ID |
| member_id | BIGINT | X |  |  | members.id | Y | 회원 FK |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| product_id | BIGINT | X |  |  | products.id | Y | 상품 FK |
| type | ENUM | X |  |  |  | Y | 유형 (period/count/unlimited) |
| start_date | DATETIME | X |  |  |  | Y | 시작일 |
| end_date | DATETIME | O |  |  |  | Y | 종료일 |
| remaining_count | INT | O |  |  |  |  | 잔여 횟수 (횟수제) |
| status | ENUM | X | active |  |  | Y | 상태 (active/expired/suspended/cancelled) |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

#### attendance

**설명**: 회원 출석 기록. 입장/퇴장 시간 및 통계.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 출석 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| member_id | BIGINT | X |  |  | members.id | Y | 회원 FK |
| type | ENUM | X | normal |  |  | Y | 출석 유형 (normal/pt/gx) |
| status | ENUM | X | checkIn |  |  | Y | 상태 (checkIn/checkOut) |
| category | VARCHAR(50) | O |  |  |  |  | 카테고리 |
| door | VARCHAR(50) | O |  |  |  |  | 출입문 정보 |
| in_time | DATETIME | X |  |  |  | Y | 입장 시간 |
| out_time | DATETIME | O |  |  |  |  | 퇴장 시간 |
| visit_count | INT | X | 1 |  |  |  | 누적 방문 횟수 |
| pass_info | VARCHAR(50) | O |  |  |  |  | 출입 수단 정보 (RFID/앱 등) |
| is_other_branch | BOOLEAN | X | false |  |  | Y | 타지점 출석 여부 |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

### 상품

#### products

**설명**: 판매 상품. 멤버십, PT, GX, 기타 상품 등.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 상품 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| category | VARCHAR(50) | X |  |  |  | Y | 대분류 카테고리 |
| category_key | ENUM | X |  |  |  | Y | 카테고리 키 (membership/pt/gx/etc) |
| sub_category | VARCHAR(50) | O |  |  |  |  | 소분류 |
| name | VARCHAR(100) | X |  |  |  | Y | 상품명 |
| cash_price | INT | X | 0 |  |  |  | 현금가 |
| card_price | INT | X | 0 |  |  |  | 카드가 |
| period | INT | O |  |  |  |  | 이용 기간 (일수) |
| kiosk_exposure | BOOLEAN | X | true |  |  |  | 키오스크 노출 여부 |
| status | ENUM | X | active |  |  | Y | 상태 (active/inactive) |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |
| updated_at | DATETIME | O |  |  |  |  | 수정일시 |

#### contracts

**설명**: 회원과 상품 간의 계약 정보.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 계약 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| member_id | BIGINT | X |  |  | members.id | Y | 회원 FK |
| product_id | BIGINT | X |  |  | products.id | Y | 상품 FK |
| start_date | DATETIME | X |  |  |  | Y | 계약 시작일 |
| end_date | DATETIME | X |  |  |  | Y | 계약 종료일 |
| total_amount | INT | X | 0 |  |  |  | 총 계약 금액 |
| paid_amount | INT | X | 0 |  |  |  | 납부 금액 |
| status | ENUM | X | active |  |  | Y | 상태 (active/completed/cancelled) |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

### 매출

#### sales

**설명**: 판매 거래 기록. 결제수단, 할인, 미납 등 상세 정보.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 매출 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| no | VARCHAR(30) | X |  |  |  | UNIQUE | 매출 번호 (R + 날짜 + 순번) |
| purchase_date | DATETIME | X |  |  |  | Y | 결제 일시 |
| type | VARCHAR(50) | X |  |  |  | Y | 매출 유형 (membership/pt/gx/product/etc) |
| product_name | VARCHAR(100) | X |  |  |  |  | 상품명 |
| manager_id | BIGINT | O |  |  | users.id | Y | 담당자 FK |
| buyer_id | BIGINT | O |  |  | members.id | Y | 구매 회원 FK |
| quantity | INT | X | 1 |  |  |  | 수량 |
| original_price | INT | X | 0 |  |  |  | 원가 |
| sale_price | INT | X | 0 |  |  |  | 판매가 |
| discount_price | INT | X | 0 |  |  |  | 할인 금액 |
| payment_method | VARCHAR(20) | X |  |  |  | Y | 결제수단 (cash/card/mileage/mixed) |
| cash | INT | X | 0 |  |  |  | 현금 결제액 |
| card | INT | X | 0 |  |  |  | 카드 결제액 |
| mileage | INT | X | 0 |  |  |  | 마일리지 결제액 |
| card_company | VARCHAR(50) | O |  |  |  |  | 카드사 |
| card_number | VARCHAR(20) | O |  |  |  |  | 카드번호 (마스킹) |
| approval_no | VARCHAR(30) | O |  |  |  |  | 승인번호 |
| unpaid | INT | X | 0 |  |  |  | 미납 금액 |
| status | ENUM | X | completed |  |  | Y | 상태 (completed/refunded/partial_refund/unpaid) |
| category | VARCHAR(50) | O |  |  |  |  | 매출 카테고리 |
| memo | TEXT | O |  |  |  |  | 메모 |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

### 시설

#### lockers

**설명**: 라커 관리. 성별 구분, 만료일, 사용 상태.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 락커 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| number | VARCHAR(10) | X |  |  |  | Y | 락커 번호 (A-001 등) |
| type | ENUM | X | standard |  |  |  | 유형 (standard/large/premium) |
| area | VARCHAR(10) | X |  |  |  | Y | 구역 (A/B/C...) |
| status | ENUM | X | available |  |  | Y | 상태 (available/occupied/expiring/broken) |
| member_id | BIGINT | O |  |  | members.id | Y | 배정 회원 FK |
| expiry_date | DATETIME | O |  |  |  | Y | 만료일 |
| gender | ENUM | O |  |  |  |  | 성별 구분 (M/F/공용) |
| last_updated | DATETIME | O |  |  |  |  | 최근 변경일시 |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

### 직원

#### staff

**설명**: 직원 정보. 센터장, 매니저, FC, 스태프 등.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 직원 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| name | VARCHAR(50) | X |  |  |  | Y | 직원 이름 |
| gender | ENUM | O |  |  |  |  | 성별 (M/F) |
| contact | VARCHAR(20) | O |  |  |  |  | 연락처 |
| role | ENUM | X |  |  |  | Y | 역할 (center_manager/manager/fc/staff) |
| job_group | VARCHAR(50) | O |  |  |  |  | 직무 그룹 |
| position | VARCHAR(50) | O |  |  |  |  | 직위 |
| team | VARCHAR(50) | O |  |  |  |  | 소속 팀 |
| join_date | DATETIME | X |  |  |  | Y | 입사일 |
| admin_id | VARCHAR(50) | O |  |  |  | UNIQUE | 관리자 계정 ID |
| memo | TEXT | O |  |  |  |  | 메모 |
| work_type | ENUM | X | full |  |  |  | 근무 유형 (full/part) |
| status | ENUM | X | active |  |  | Y | 상태 (active/leave/resigned) |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

#### payroll

**설명**: 급여 정보. 기본급, 인센티브, 공제액.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 급여 고유 ID |
| staff_id | BIGINT | X |  |  | staff.id | Y | 직원 FK |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| year_month | VARCHAR(7) | X |  |  |  | Y | 급여 연월 (YYYY-MM) |
| base_salary | INT | X | 0 |  |  |  | 기본급 |
| incentive | INT | X | 0 |  |  |  | 인센티브 |
| deduction | INT | X | 0 |  |  |  | 공제액 |
| net_salary | INT | X | 0 |  |  |  | 실지급액 |
| status | ENUM | X | pending |  |  | Y | 상태 (pending/paid/cancelled) |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

#### staff_attendance

**설명**: 직원 출근 기록. 정상, 지각, 휴가 등.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 직원 출근 고유 ID |
| staff_id | BIGINT | X |  |  | staff.id | Y | 직원 FK |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| date | VARCHAR(10) | X |  |  |  | Y | 날짜 (YYYY-MM-DD) |
| status | ENUM | X | present |  |  | Y | 상태 (present/absent/late/half_day/vacation) |
| check_in | VARCHAR(5) | O |  |  |  |  | 출근 시간 (HH:MM) |
| check_out | VARCHAR(5) | O |  |  |  |  | 퇴근 시간 (HH:MM) |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

### 메시지/마케팅

#### messages

**설명**: 메시지 전송 기록. SMS, LMS, 카톡 등.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 메시지 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| sender_id | BIGINT | X |  |  | users.id | Y | 발송자 FK |
| type | ENUM | X |  |  |  | Y | 유형 (sms/lms/kakao) |
| title | VARCHAR(100) | O |  |  |  |  | 메시지 제목 |
| content | TEXT | X |  |  |  |  | 메시지 본문 |
| recipients | JSON | X |  |  |  |  | 수신자 목록 (JSON) |
| sent_at | DATETIME | O |  |  |  | Y | 발송 일시 |
| status | ENUM | X | pending |  |  | Y | 상태 (pending/sent/failed/cancelled) |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

#### coupons

**설명**: 쿠폰 정보. 할인율/금액, 사용 한도.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 쿠폰 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| name | VARCHAR(100) | X |  |  |  |  | 쿠폰명 |
| type | ENUM | X |  |  |  | Y | 유형 (rate/amount) |
| discount_value | INT | X |  |  |  |  | 할인값 (% 또는 원) |
| start_date | DATETIME | X |  |  |  | Y | 시작일 |
| end_date | DATETIME | X |  |  |  | Y | 종료일 |
| usage_limit | INT | O |  |  |  |  | 사용 한도 |
| used_count | INT | X | 0 |  |  |  | 사용 횟수 |
| status | ENUM | X | active |  |  | Y | 상태 (active/expired/depleted) |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

#### mileage

**설명**: 마일리지 변동 기록. 적립, 사용, 취소.

**컬럼 정의**

| 컬럼명 | 데이터타입 | NULL | 기본값 | PK | FK | 인덱스 | 설명 |
|--------|-----------|------|--------|-----|-----|--------|------|
| id | BIGINT | X |  | Y |  | Y | 마일리지 고유 ID |
| branch_id | BIGINT | X |  |  | branches.id | Y | 지점 FK |
| member_id | BIGINT | X |  |  | members.id | Y | 회원 FK |
| type | ENUM | X |  |  |  | Y | 유형 (earn/use/cancel) |
| amount | INT | X | 0 |  |  |  | 변동 금액 |
| balance | INT | X | 0 |  |  |  | 변동 후 잔액 |
| description | VARCHAR(200) | O |  |  |  |  | 변동 사유 |
| created_at | DATETIME | X | NOW() |  |  |  | 생성일시 |

## 공통 컬럼 규칙

### created_at, updated_at, deleted_at

모든 주요 비즈니스 엔티티는 다음 시간 추적 컬럼을 가집니다:

| 컬럼 | 데이터타입 | 기본값 | 설명 |
|------|-----------|--------|------|
| created_at | DATETIME | NOW() | 레코드 생성 일시 |
| updated_at | DATETIME | NULL | 레코드 수정 일시 |
| deleted_at | DATETIME | NULL | 소프트 삭제 일시 (옵션) |

**적용 테이블**: tenants, branches, users, members, products, staff, contracts, sales 등

### 소프트 삭제 정책

- 데이터 무결성 보장을 위해 물리 삭제 금지
- `deleted_at` 값으로 삭제 표시 (현재 구현에서는 일부 테이블만 적용)
- 조회 쿼리에서는 `WHERE deleted_at IS NULL` 조건 추가
- 히스토리 추적 및 감시(audit) 목적

### 멀티테넌시 (tenant_id, branch_id)

**계층 구조:**

```
Tenant (본사, 1개)
  └─ Branch (지점, N개)
       └─ Entity (회원, 상품, 직원 등)
```

**격리 규칙:**

- **tenant_id 직접 참조**: tenants 테이블만 보유
- **branch_id 강제**: 모든 비즈니스 테이블은 `branch_id` 필수
- **쿼리 필터**: 모든 조회는 `branch_id` 조건 필수 추가
- **데이터 격리**: 지점 간 데이터 조회 불가 (super_admin 제외)

**예시:**

```sql
-- 올바른 쿼리 (지점 격리)
SELECT * FROM members WHERE branch_id = ? AND status = 'active';

-- 잘못된 쿼리 (지점 조건 누락)
SELECT * FROM members WHERE status = 'active'; -- 다른 지점 데이터 노출 위험
```

### ENUM 타입 정의

주요 ENUM 값:

| 컬럼 | 가능한 값 | 설명 |
|------|----------|------|
| tenants.plan | basic, standard, premium | 요금제 |
| tenants.status | active, inactive, suspended | 테넌트 상태 |
| branches.status | active, inactive | 지점 상태 |
| users.role | super_admin, center_manager, manager, fc, staff, viewer | 사용자 역할 |
| users.status | active, inactive, locked | 계정 상태 |
| members.status | active, expired, suspended, withdrawn | 회원 상태 |
| member_tickets.type | period, count, unlimited | 이용권 유형 |
| member_tickets.status | active, expired, suspended, cancelled | 이용권 상태 |
| attendance.type | normal, pt, gx | 출석 유형 |
| attendance.status | checkIn, checkOut | 출석 상태 |
| products.category_key | membership, pt, gx, etc | 상품 카테고리 |
| products.status | active, inactive | 상품 상태 |
| contracts.status | active, completed, cancelled | 계약 상태 |
| sales.status | completed, refunded, partial_refund, unpaid | 매출 상태 |
| sales.payment_method | cash, card, mileage, mixed | 결제수단 |
| staff.role | center_manager, manager, fc, staff | 직원 역할 |
| staff.work_type | full, part | 근무 유형 |
| staff.status | active, leave, resigned | 직원 상태 |
| staff_attendance.status | present, absent, late, half_day, vacation | 출근 상태 |
| messages.type | sms, lms, kakao | 메시지 유형 |
| messages.status | pending, sent, failed, cancelled | 발송 상태 |
| coupons.type | rate, amount | 할인 유형 |
| coupons.status | active, expired, depleted | 쿠폰 상태 |
| mileage.type | earn, use, cancel | 마일리지 유형 |

### 인덱스 전략

**Primary Key (PK)**
- 모든 테이블의 `id` 컬럼

**Unique Index**
- tenants.code
- branches.code

**성능 인덱스**
- 주요 FK 컬럼: branch_id, member_id, user_id, staff_id 등
- 상태 조회: status, created_at 등
- 검색 필터: code, email, phone 등

### 제약조건

**NOT NULL 제약**
- 모든 `id` (PK)
- 모든 외래키 (FK)
- 주요 비즈니스 속성

**UNIQUE 제약**
- tenants.code
- branches.code
- users.email (지점별 고유)

**CHECK 제약**
- sales.payment_method별 금액 검증
- 기간 필드 (end_date >= start_date)

## 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v2.0 | 2026-03-11 | 초기 정의서 (184개 컬럼, 16개 테이블) |
