# FitGenie CRM API 명세서

**버전**: v2.0
**작성일**: 2026-03-11
**Base URL**: `/api/v1`

---

## 1. 공통 사항

### 인증
모든 API는 Bearer Token 기반 JWT 인증을 사용합니다. 로그인 후 발급받은 토큰을 `Authorization` 헤더에 포함시켜야 합니다.

```
Authorization: Bearer {jwt_token}
```

### Content-Type
모든 요청과 응답은 JSON 형식입니다.

```
Content-Type: application/json
```

### 공통 에러 응답 포맷

모든 에러 응답은 다음의 표준 포맷을 따릅니다.

```json
{
  "error": "ERROR_CODE",
  "message": "오류에 대한 상세 설명"
}
```

### 공통 HTTP 상태 코드

| 상태 코드 | 설명 |
|----------|------|
| 200 | 요청 성공 |
| 201 | 리소스 생성 성공 |
| 400 | 잘못된 요청 (유효성 검사 실패) |
| 401 | 인증 필요 (토큰 없음/만료) |
| 403 | 접근 권한 없음 |
| 404 | 리소스를 찾을 수 없음 |
| 500 | 서버 오류 |

### 페이지네이션 공통 파라미터

목록 조회 API는 다음의 Query 파라미터를 지원합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| page | number | 1 | 페이지 번호 (1부터 시작) |
| limit (또는 size) | number | 20 | 한 페이지당 조회 건수 |
| sort | string | - | 정렬 기준 필드명 |
| order | string | asc | 정렬 순서 (asc: 오름차순, desc: 내림차순) |

---

## 2. API 목록 요약

| ID | Method | 엔드포인트 | 설명 | 인증 필요 | 상태 |
|----|--------|----------|------|---------|------|
| API-001 | POST | /auth/login | 로그인 | N | 개발완료 |
| API-002 | POST | /auth/logout | 로그아웃 | Y | 개발완료 |
| API-003 | GET | /dashboard/stats | 대시보드 통계 | Y | 개발완료 |
| API-004 | GET | /dashboard/birthday-members | 생일 회원 조회 | Y | 개발완료 |
| API-005 | GET | /dashboard/unpaid-members | 미납 회원 조회 | Y | 개발완료 |
| API-006 | GET | /dashboard/expiring-members | 만료예정 회원 조회 | Y | 개발완료 |
| API-007 | GET | /members | 회원 목록 조회 | Y | 개발완료 |
| API-008 | GET | /members/:id | 회원 상세 조회 | Y | 개발완료 |
| API-009 | POST | /members | 회원 등록 | Y | 개발완료 |
| API-010 | PUT | /members/:id | 회원 수정 | Y | 개발완료 |
| API-011 | DELETE | /members/:id | 회원 삭제 | Y | 개발완료 |
| API-012 | GET | /members/stats/summary | 회원 통계 요약 | Y | 개발완료 |
| API-013 | GET | /attendance | 출석 기록 조회 | Y | 개발완료 |
| API-014 | POST | /attendance | 출석 등록 | Y | 개발완료 |
| API-015 | GET | /sales | 매출 조회 | Y | 개발완료 |
| API-016 | POST | /sales | 매출 등록 (결제) | Y | 개발완료 |
| API-017 | GET | /sales/stats/summary | 매출 통계 요약 | Y | 개발완료 |
| API-018 | GET | /products | 상품 목록 조회 | Y | 개발완료 |
| API-019 | POST | /products | 상품 등록 | Y | 개발완료 |
| API-020 | GET | /lockers | 락커 목록 조회 | Y | 개발완료 |
| API-021 | PATCH | /lockers/:id | 락커 배정/해제 | Y | 개발완료 |
| API-022 | GET | /staff | 직원 목록 조회 | Y | 개발완료 |
| API-023 | POST | /staff | 직원 등록 | Y | 개발완료 |
| API-024 | PUT | /staff/:id | 직원 수정 | Y | 개발완료 |
| API-025 | DELETE | /staff/:id | 직원 삭제 | Y | 개발완료 |
| API-026 | GET | /staff/attendance | 직원 출근부 조회 | Y | 개발완료 |
| API-027 | POST | /system/reset | 시스템 초기화 | Y | 개발완료 |

---

## 3. 도메인별 API 상세

### 3.1 인증 (Authentication)

#### API-001: 로그인

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-001 |
| Method | POST |
| URL | `/api/v1/auth/login` |
| 설명 | 이메일/비밀번호 로그인 인증 |
| 인증 필요 | N |
| 관련 화면 | SCR-001 |
| 관련 기능 | FN-001 |

**Request Headers**

```
Content-Type: application/json
```

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "branch_id": 1
}
```

| 필드명 | 타입 | 필수 | 설명 |
|-------|------|------|------|
| email | string | Y | 사용자 이메일 |
| password | string | Y | 비밀번호 |
| branch_id | number | Y | 지점 ID |

**Response (성공 - 200)**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "홍길동",
    "role": "manager",
    "branch_id": 1
  }
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| token | string | JWT 인증 토큰 (이후 API 호출 시 사용) |
| user.id | number | 사용자 ID |
| user.name | string | 사용자 이름 |
| user.role | string | 사용자 역할 (manager, staff 등) |
| user.branch_id | number | 지점 ID |

**Response (실패 - 401)**

```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "이메일 또는 비밀번호가 올바르지 않습니다"
}
```

---

#### API-002: 로그아웃

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-002 |
| Method | POST |
| URL | `/api/v1/auth/logout` |
| 설명 | 세션 종료 및 토큰 무효화 |
| 인증 필요 | Y |
| 관련 화면 | SCR-002 |
| 관련 기능 | FN-001 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음

**Response (성공 - 200)**

```json
{
  "message": "로그아웃 되었습니다"
}
```

**Response (실패 - 401)**

```json
{
  "error": "UNAUTHORIZED",
  "message": "인증이 필요합니다"
}
```

---

### 3.2 대시보드 (Dashboard)

#### API-003: 대시보드 통계

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-003 |
| Method | GET |
| URL | `/api/v1/dashboard/stats` |
| 설명 | 지점별 대시보드 핵심 KPI 조회 |
| 인증 필요 | Y |
| 관련 화면 | SCR-002 |
| 관련 기능 | FN-002 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음

**Response (성공 - 200)**

```json
{
  "totalMembers": 450,
  "activeMembers": 320,
  "expiringMembers": 25,
  "expiredMembers": 105,
  "monthlySales": 15000000,
  "todayAttendance": 87
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| totalMembers | number | 총 회원 수 |
| activeMembers | number | 활성 회원 수 |
| expiringMembers | number | 만료 예정 회원 수 |
| expiredMembers | number | 만료된 회원 수 |
| monthlySales | number | 월간 매출 (원) |
| todayAttendance | number | 오늘 출석 인원 |

**Response (실패 - 500)**

```json
{
  "error": "SERVER_ERROR",
  "message": "데이터를 불러올 수 없습니다"
}
```

---

#### API-004: 생일 회원 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-004 |
| Method | GET |
| URL | `/api/v1/dashboard/birthday-members` |
| 설명 | 오늘 생일인 회원 목록 조회 |
| 인증 필요 | Y |
| 관련 화면 | SCR-002 |
| 관련 기능 | FN-002 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음

**Response (성공 - 200)**

```json
{
  "members": [
    {
      "id": 1,
      "name": "김회원",
      "phone": "010-1234-5678"
    }
  ]
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| members[].id | number | 회원 ID |
| members[].name | string | 회원 이름 |
| members[].phone | string | 회원 연락처 |

**Response (실패 - 500)**

```json
{
  "error": "SERVER_ERROR",
  "message": "데이터를 불러올 수 없습니다"
}
```

---

#### API-005: 미납 회원 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-005 |
| Method | GET |
| URL | `/api/v1/dashboard/unpaid-members` |
| 설명 | 미납 내역이 있는 회원 목록 조회 |
| 인증 필요 | Y |
| 관련 화면 | SCR-002 |
| 관련 기능 | FN-002 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음

**Response (성공 - 200)**

```json
{
  "members": [
    {
      "id": 2,
      "name": "이회원",
      "unpaidAmount": 150000
    }
  ]
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| members[].id | number | 회원 ID |
| members[].name | string | 회원 이름 |
| members[].unpaidAmount | number | 미납 금액 (원) |

**Response (실패 - 500)**

```json
{
  "error": "SERVER_ERROR",
  "message": "조회 실패"
}
```

---

#### API-006: 만료예정 회원 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-006 |
| Method | GET |
| URL | `/api/v1/dashboard/expiring-members` |
| 설명 | 7일 내 이용권 만료 예정 회원 조회 |
| 인증 필요 | Y |
| 관련 화면 | SCR-002 |
| 관련 기능 | FN-002 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음

**Response (성공 - 200)**

```json
{
  "members": [
    {
      "id": 3,
      "name": "박회원",
      "expiryDate": "2026-03-18",
      "dDay": -7
    }
  ]
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| members[].id | number | 회원 ID |
| members[].name | string | 회원 이름 |
| members[].expiryDate | string | 이용권 만료일 (YYYY-MM-DD) |
| members[].dDay | number | D-day (음수 = 만료일까지 남은 일수) |

**Response (실패 - 500)**

```json
{
  "error": "SERVER_ERROR",
  "message": "조회 실패"
}
```

---

### 3.3 회원 관리 (Members)

#### API-007: 회원 목록 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-007 |
| Method | GET |
| URL | `/api/v1/members` |
| 설명 | 회원 목록 조회 (검색/필터/페이지네이션) |
| 인증 필요 | Y |
| 관련 화면 | SCR-010 |
| 관련 기능 | FN-003 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음 (Query 파라미터 사용)

**Query 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| search | string | N | 회원 이름/전화번호 검색 |
| status | string | N | 회원 상태 필터 (active, expired, suspended 등) |
| gender | string | N | 성별 필터 (M, F) |
| manager_id | number | N | 담당 매니저 ID |
| page | number | N | 페이지 번호 (기본값: 1) |
| size | number | N | 한 페이지당 조회 건수 (기본값: 20) |
| sort | string | N | 정렬 기준 (name, createdAt 등) |
| order | string | N | 정렬 순서 (asc, desc) |

**Request Example**

```
GET /api/v1/members?search=김&status=active&page=1&size=20&sort=name&order=asc
```

**Response (성공 - 200)**

```json
{
  "data": [
    {
      "id": 1,
      "name": "김회원",
      "phone": "010-1234-5678",
      "status": "active",
      "gender": "M"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 450
  }
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| data[].id | number | 회원 ID |
| data[].name | string | 회원 이름 |
| data[].phone | string | 연락처 |
| data[].status | string | 회원 상태 |
| data[].gender | string | 성별 |
| pagination.page | number | 현재 페이지 |
| pagination.size | number | 페이지당 건수 |
| pagination.total | number | 전체 회원 수 |

**Response (실패 - 403)**

```json
{
  "error": "FORBIDDEN",
  "message": "접근 권한이 없습니다"
}
```

---

#### API-008: 회원 상세 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-008 |
| Method | GET |
| URL | `/api/v1/members/:id` |
| 설명 | 회원 상세 정보 조회 (프로필/이용권/출석/결제/체성분/메모) |
| 인증 필요 | Y |
| 관련 화면 | SCR-011 |
| 관련 기능 | FN-006 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Path 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | Y | 회원 ID |

**Request Body**

없음

**Response (성공 - 200)**

```json
{
  "profile": {
    "id": 1,
    "name": "김회원",
    "gender": "M",
    "birthDate": "1990-01-15",
    "phone": "010-1234-5678",
    "email": "kim@example.com",
    "address": "서울시 강남구",
    "status": "active",
    "createdAt": "2025-01-01T00:00:00Z",
    "managerId": 5
  },
  "tickets": [
    {
      "id": 1,
      "productName": "3개월 이용권",
      "startDate": "2026-01-01",
      "expiryDate": "2026-03-31",
      "status": "active"
    }
  ],
  "attendance": [
    {
      "id": 1,
      "date": "2026-03-10",
      "inTime": "09:00",
      "outTime": "10:00",
      "type": "normal"
    }
  ],
  "payments": [
    {
      "id": 1,
      "date": "2026-01-01",
      "amount": 300000,
      "method": "card",
      "status": "completed"
    }
  ],
  "bodyComposition": [
    {
      "date": "2026-03-01",
      "weight": 75.5,
      "bodyFatRate": 22.5
    }
  ],
  "memos": [
    {
      "id": 1,
      "content": "운동 목표: 체지방률 20% 이하",
      "createdAt": "2026-03-01",
      "staffId": 5
    }
  ]
}
```

**Response (실패 - 404)**

```json
{
  "error": "NOT_FOUND",
  "message": "회원을 찾을 수 없습니다"
}
```

---

#### API-009: 회원 등록

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-009 |
| Method | POST |
| URL | `/api/v1/members` |
| 설명 | 신규 회원 등록 |
| 인증 필요 | Y |
| 관련 화면 | SCR-012 |
| 관련 기능 | FN-004 |

**Request Headers**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**

```json
{
  "name": "신입회원",
  "gender": "M",
  "birthDate": "1995-05-20",
  "phone": "010-9876-5432",
  "email": "newmember@example.com",
  "address": "서울시 강남구 테헤란로",
  "memo": "신문광고로 방문",
  "managerId": 5
}
```

| 필드명 | 타입 | 필수 | 설명 |
|-------|------|------|------|
| name | string | Y | 회원 이름 |
| gender | string | Y | 성별 (M, F) |
| birthDate | string | Y | 생년월일 (YYYY-MM-DD) |
| phone | string | Y | 연락처 |
| email | string | N | 이메일 |
| address | string | N | 주소 |
| memo | string | N | 특이사항 메모 |
| managerId | number | N | 담당 매니저 ID |

**Response (성공 - 201)**

```json
{
  "id": 1,
  "name": "신입회원",
  "status": "active",
  "createdAt": "2026-03-11T10:30:00Z"
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| id | number | 생성된 회원 ID |
| name | string | 회원 이름 |
| status | string | 회원 상태 |
| createdAt | string | 생성 시간 (ISO 8601) |

**Response (실패 - 400)**

```json
{
  "error": "DUPLICATE_PHONE",
  "message": "이미 등록된 연락처입니다"
}
```

---

#### API-010: 회원 수정

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-010 |
| Method | PUT |
| URL | `/api/v1/members/:id` |
| 설명 | 기존 회원 정보 수정 |
| 인증 필요 | Y |
| 관련 화면 | SCR-013 |
| 관련 기능 | FN-005 |

**Request Headers**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | Y | 회원 ID |

**Request Body**

```json
{
  "name": "김회원(수정)",
  "phone": "010-1111-2222",
  "email": "kim.updated@example.com",
  "address": "서울시 송파구",
  "memo": "주소 변경됨",
  "managerId": 6
}
```

| 필드명 | 타입 | 필수 | 설명 |
|-------|------|------|------|
| name | string | N | 회원 이름 |
| phone | string | N | 연락처 |
| email | string | N | 이메일 |
| address | string | N | 주소 |
| memo | string | N | 메모 |
| managerId | number | N | 담당 매니저 ID |

**Response (성공 - 200)**

```json
{
  "id": 1,
  "name": "김회원(수정)",
  "updatedAt": "2026-03-11T11:00:00Z"
}
```

**Response (실패 - 404)**

```json
{
  "error": "NOT_FOUND",
  "message": "회원을 찾을 수 없습니다"
}
```

---

#### API-011: 회원 삭제

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-011 |
| Method | DELETE |
| URL | `/api/v1/members/:id` |
| 설명 | 회원 삭제 (소프트 삭제) |
| 인증 필요 | Y |
| 관련 화면 | SCR-011 |
| 관련 기능 | FN-005 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Path 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | Y | 회원 ID |

**Request Body**

없음

**Response (성공 - 200)**

```json
{
  "message": "회원이 삭제되었습니다"
}
```

**Response (실패 - 403)**

```json
{
  "error": "FORBIDDEN",
  "message": "삭제 권한이 없습니다"
}
```

---

#### API-012: 회원 통계 요약

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-012 |
| Method | GET |
| URL | `/api/v1/members/stats/summary` |
| 설명 | 회원 상태별 통계 요약 |
| 인증 필요 | Y |
| 관련 화면 | SCR-010 |
| 관련 기능 | FN-003 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음

**Response (성공 - 200)**

```json
{
  "total": 450,
  "active": 320,
  "expired": 105,
  "suspended": 15,
  "withdrawn": 10
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| total | number | 총 회원 수 |
| active | number | 활성 회원 수 |
| expired | number | 만료된 회원 수 |
| suspended | number | 중단된 회원 수 |
| withdrawn | number | 탈퇴한 회원 수 |

**Response (실패 - 500)**

```json
{
  "error": "SERVER_ERROR",
  "message": "통계 조회 실패"
}
```

---

### 3.4 출석 관리 (Attendance)

#### API-013: 출석 기록 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-013 |
| Method | GET |
| URL | `/api/v1/attendance` |
| 설명 | 회원 출석 기록 조회 |
| 인증 필요 | Y |
| 관련 화면 | SCR-020 |
| 관련 기능 | FN-008 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음 (Query 파라미터 사용)

**Query 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| startDate | string | N | 조회 시작일 (YYYY-MM-DD) |
| endDate | string | N | 조회 종료일 (YYYY-MM-DD) |
| type | string | N | 수업 유형 (normal, pt, gx) |
| page | number | N | 페이지 번호 (기본값: 1) |
| size | number | N | 한 페이지당 조회 건수 (기본값: 50) |

**Request Example**

```
GET /api/v1/attendance?startDate=2026-03-01&endDate=2026-03-31&type=normal&page=1&size=50
```

**Response (성공 - 200)**

```json
{
  "data": [
    {
      "id": 1,
      "memberId": 1,
      "memberName": "김회원",
      "type": "normal",
      "inTime": "2026-03-11T09:00:00",
      "outTime": "2026-03-11T10:00:00",
      "status": "completed"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 50,
    "total": 250
  }
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| data[].id | number | 출석 기록 ID |
| data[].memberId | number | 회원 ID |
| data[].memberName | string | 회원 이름 |
| data[].type | string | 수업 유형 (normal, pt, gx) |
| data[].inTime | string | 입장 시간 |
| data[].outTime | string | 퇴장 시간 |
| data[].status | string | 출석 상태 |

**Response (실패 - 500)**

```json
{
  "error": "SERVER_ERROR",
  "message": "조회 실패"
}
```

---

#### API-014: 출석 등록

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-014 |
| Method | POST |
| URL | `/api/v1/attendance` |
| 설명 | 출석 체크인/체크아웃 등록 |
| 인증 필요 | Y |
| 관련 화면 | SCR-020 |
| 관련 기능 | FN-008 |

**Request Headers**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**

```json
{
  "memberId": 1,
  "type": "normal",
  "status": "checkIn"
}
```

| 필드명 | 타입 | 필수 | 설명 |
|-------|------|------|------|
| memberId | number | Y | 회원 ID |
| type | string | Y | 수업 유형 (normal, pt, gx) |
| status | string | Y | 상태 (checkIn, checkOut) |

**Response (성공 - 201)**

```json
{
  "id": 1,
  "memberId": 1,
  "inTime": "2026-03-11T09:00:00",
  "visitCount": 45
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| id | number | 생성된 출석 기록 ID |
| memberId | number | 회원 ID |
| inTime | string | 입장 시간 |
| visitCount | number | 누적 방문 횟수 |

**Response (실패 - 400)**

```json
{
  "error": "ALREADY_CHECKED_IN",
  "message": "이미 출석 처리되었습니다"
}
```

---

### 3.5 매출 관리 (Sales)

#### API-015: 매출 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-015 |
| Method | GET |
| URL | `/api/v1/sales` |
| 설명 | 매출 내역 조회 (기간/유형/상태 필터) |
| 인증 필요 | Y |
| 관련 화면 | SCR-030 |
| 관련 기능 | FN-010 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음 (Query 파라미터 사용)

**Query 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| startDate | string | N | 조회 시작일 (YYYY-MM-DD) |
| endDate | string | N | 조회 종료일 (YYYY-MM-DD) |
| type | string | N | 상품 유형 (membership, pt, gx 등) |
| status | string | N | 매출 상태 (completed, refunded 등) |
| page | number | N | 페이지 번호 (기본값: 1) |
| size | number | N | 한 페이지당 조회 건수 (기본값: 20) |

**Request Example**

```
GET /api/v1/sales?startDate=2026-03-01&endDate=2026-03-31&status=completed&page=1&size=20
```

**Response (성공 - 200)**

```json
{
  "data": [
    {
      "id": 1,
      "date": "2026-03-11",
      "productName": "3개월 이용권",
      "amount": 300000,
      "paymentMethod": "card",
      "status": "completed"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 150
  }
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| data[].id | number | 매출 ID |
| data[].date | string | 거래일 (YYYY-MM-DD) |
| data[].productName | string | 상품명 |
| data[].amount | number | 거래금액 (원) |
| data[].paymentMethod | string | 결제 수단 (cash, card, mileage) |
| data[].status | string | 거래 상태 |

**Response (실패 - 403)**

```json
{
  "error": "FORBIDDEN",
  "message": "매출 조회 권한이 없습니다"
}
```

---

#### API-016: 매출 등록 (결제)

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-016 |
| Method | POST |
| URL | `/api/v1/sales` |
| 설명 | POS 결제 처리 및 매출 등록 |
| 인증 필요 | Y |
| 관련 화면 | SCR-032 |
| 관련 기능 | FN-012 |

**Request Headers**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**

```json
{
  "memberId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 1
    }
  ],
  "paymentMethod": "mixed",
  "cashAmount": 0,
  "cardAmount": 300000,
  "mileageAmount": 0
}
```

| 필드명 | 타입 | 필수 | 설명 |
|-------|------|------|------|
| memberId | number | Y | 회원 ID |
| items | array | Y | 구매 상품 목록 |
| items[].productId | number | Y | 상품 ID |
| items[].quantity | number | Y | 수량 |
| paymentMethod | string | Y | 결제 수단 (cash, card, mileage, mixed) |
| cashAmount | number | Y | 현금 결제액 |
| cardAmount | number | Y | 카드 결제액 |
| mileageAmount | number | Y | 마일리지 사용액 |

**Response (성공 - 201)**

```json
{
  "saleId": 1,
  "totalAmount": 300000,
  "receiptNo": "R20260311001"
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| saleId | number | 생성된 매출 ID |
| totalAmount | number | 합계 금액 (원) |
| receiptNo | string | 영수증 번호 |

**Response (실패 - 400)**

```json
{
  "error": "PAYMENT_FAILED",
  "message": "결제에 실패했습니다"
}
```

---

#### API-017: 매출 통계 요약

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-017 |
| Method | GET |
| URL | `/api/v1/sales/stats/summary` |
| 설명 | 매출 통계 요약 (총매출/현금/카드/마일리지) |
| 인증 필요 | Y |
| 관련 화면 | SCR-030 |
| 관련 기능 | FN-010 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음 (Query 파라미터 사용)

**Query 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| startDate | string | N | 조회 시작일 (YYYY-MM-DD) |
| endDate | string | N | 조회 종료일 (YYYY-MM-DD) |

**Response (성공 - 200)**

```json
{
  "totalSales": 15000000,
  "cashSales": 3000000,
  "cardSales": 11000000,
  "mileageSales": 1000000,
  "refundTotal": 500000
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| totalSales | number | 총 매출 (원) |
| cashSales | number | 현금 매출 (원) |
| cardSales | number | 카드 매출 (원) |
| mileageSales | number | 마일리지 사용액 (원) |
| refundTotal | number | 환불액 (원) |

**Response (실패 - 500)**

```json
{
  "error": "SERVER_ERROR",
  "message": "통계 조회 실패"
}
```

---

### 3.6 상품 관리 (Products)

#### API-018: 상품 목록 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-018 |
| Method | GET |
| URL | `/api/v1/products` |
| 설명 | 상품 목록 조회 (카테고리/상태 필터) |
| 인증 필요 | Y |
| 관련 화면 | SCR-040 |
| 관련 기능 | FN-013 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음 (Query 파라미터 사용)

**Query 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| category | string | N | 상품 카테고리 (membership, pt, gx, etc) |
| status | string | N | 상품 상태 (active, inactive) |

**Request Example**

```
GET /api/v1/products?category=membership&status=active
```

**Response (성공 - 200)**

```json
{
  "data": [
    {
      "id": 1,
      "name": "3개월 이용권",
      "category": "membership",
      "cashPrice": 280000,
      "cardPrice": 300000,
      "period": 90,
      "status": "active"
    }
  ]
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| data[].id | number | 상품 ID |
| data[].name | string | 상품명 |
| data[].category | string | 카테고리 |
| data[].cashPrice | number | 현금 가격 (원) |
| data[].cardPrice | number | 카드 가격 (원) |
| data[].period | number | 이용 기간 (일) |
| data[].status | string | 상태 |

**Response (실패 - 500)**

```json
{
  "error": "SERVER_ERROR",
  "message": "조회 실패"
}
```

---

#### API-019: 상품 등록

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-019 |
| Method | POST |
| URL | `/api/v1/products` |
| 설명 | 신규 상품 등록 |
| 인증 필요 | Y |
| 관련 화면 | SCR-041 |
| 관련 기능 | FN-014 |

**Request Headers**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**

```json
{
  "category": "membership",
  "name": "3개월 이용권",
  "cashPrice": 280000,
  "cardPrice": 300000,
  "period": 90,
  "kioskExposure": true
}
```

| 필드명 | 타입 | 필수 | 설명 |
|-------|------|------|------|
| category | string | Y | 카테고리 (membership, pt, gx, etc) |
| name | string | Y | 상품명 |
| cashPrice | number | Y | 현금 가격 (원) |
| cardPrice | number | Y | 카드 가격 (원) |
| period | number | Y | 이용 기간 (일) |
| kioskExposure | boolean | N | 키오스크 노출 여부 |

**Response (성공 - 201)**

```json
{
  "id": 1,
  "name": "3개월 이용권",
  "createdAt": "2026-03-11"
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| id | number | 생성된 상품 ID |
| name | string | 상품명 |
| createdAt | string | 생성일 |

**Response (실패 - 400)**

```json
{
  "error": "DUPLICATE_NAME",
  "message": "동일 카테고리에 같은 상품명이 있습니다"
}
```

---

### 3.7 시설 관리 (Facilities - Lockers)

#### API-020: 락커 목록 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-020 |
| Method | GET |
| URL | `/api/v1/lockers` |
| 설명 | 구역별 락커 현황 조회 |
| 인증 필요 | Y |
| 관련 화면 | SCR-050 |
| 관련 기능 | FN-015 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음 (Query 파라미터 사용)

**Query 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| area | string | N | 구역 필터 (A, B, C 등) |

**Request Example**

```
GET /api/v1/lockers?area=A
```

**Response (성공 - 200)**

```json
{
  "data": [
    {
      "id": 1,
      "number": "A-001",
      "area": "A",
      "status": "available",
      "memberId": null
    }
  ]
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| data[].id | number | 락커 ID |
| data[].number | string | 락커 번호 |
| data[].area | string | 구역 |
| data[].status | string | 상태 (available, occupied, maintenance) |
| data[].memberId | number \| null | 배정된 회원 ID (없으면 null) |

**Response (실패 - 500)**

```json
{
  "error": "SERVER_ERROR",
  "message": "조회 실패"
}
```

---

#### API-021: 락커 배정/해제

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-021 |
| Method | PATCH |
| URL | `/api/v1/lockers/:id` |
| 설명 | 락커 배정 또는 해제 |
| 인증 필요 | Y |
| 관련 화면 | SCR-051 |
| 관련 기능 | FN-016 |

**Request Headers**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | Y | 락커 ID |

**Request Body**

```json
{
  "action": "assign",
  "memberId": 1,
  "expiryDate": "2026-06-30"
}
```

| 필드명 | 타입 | 필수 | 설명 |
|-------|------|------|------|
| action | string | Y | 동작 (assign: 배정, release: 해제) |
| memberId | number | Y (assign시) | 회원 ID |
| expiryDate | string | N | 만료일 (YYYY-MM-DD) |

**Response (성공 - 200)**

```json
{
  "id": 1,
  "number": "A-001",
  "status": "occupied",
  "memberId": 1
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| id | number | 락커 ID |
| number | string | 락커 번호 |
| status | string | 변경된 상태 |
| memberId | number \| null | 배정된 회원 ID |

**Response (실패 - 400)**

```json
{
  "error": "ALREADY_ASSIGNED",
  "message": "이미 사용중인 락커입니다"
}
```

---

### 3.8 직원/급여 관리 (Staff & Payroll)

#### API-022: 직원 목록 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-022 |
| Method | GET |
| URL | `/api/v1/staff` |
| 설명 | 직원 목록 조회 (역할/상태 필터) |
| 인증 필요 | Y |
| 관련 화면 | SCR-060 |
| 관련 기능 | FN-019 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음 (Query 파라미터 사용)

**Query 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| search | string | N | 직원 이름/연락처 검색 |
| role | string | N | 직책 필터 (center_manager, manager, fc, staff) |
| status | string | N | 상태 필터 (active, leave, resigned) |

**Request Example**

```
GET /api/v1/staff?search=박&role=fc&status=active
```

**Response (성공 - 200)**

```json
{
  "data": [
    {
      "id": 1,
      "name": "박트레이너",
      "role": "fc",
      "status": "active",
      "contact": "010-9999-8888"
    }
  ]
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| data[].id | number | 직원 ID |
| data[].name | string | 직원 이름 |
| data[].role | string | 직책 |
| data[].status | string | 상태 |
| data[].contact | string | 연락처 |

**Response (실패 - 403)**

```json
{
  "error": "FORBIDDEN",
  "message": "직원 조회 권한이 없습니다"
}
```

---

#### API-023: 직원 등록

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-023 |
| Method | POST |
| URL | `/api/v1/staff` |
| 설명 | 신규 직원 등록 |
| 인증 필요 | Y |
| 관련 화면 | SCR-061 |
| 관련 기능 | FN-020 |

**Request Headers**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**

```json
{
  "name": "박트레이너",
  "gender": "M",
  "contact": "010-9999-8888",
  "role": "fc",
  "joinDate": "2025-03-01",
  "workType": "full"
}
```

| 필드명 | 타입 | 필수 | 설명 |
|-------|------|------|------|
| name | string | Y | 직원 이름 |
| gender | string | Y | 성별 (M, F) |
| contact | string | Y | 연락처 |
| role | string | Y | 직책 (center_manager, manager, fc, staff) |
| joinDate | string | Y | 입사일 (YYYY-MM-DD) |
| workType | string | Y | 근무 유형 (full: 정직원, part: 계약직) |

**Response (성공 - 201)**

```json
{
  "id": 1,
  "name": "박트레이너",
  "adminId": "park_trainer_20260311"
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| id | number | 생성된 직원 ID |
| name | string | 직원 이름 |
| adminId | string | 시스템 계정 ID |

**Response (실패 - 400)**

```json
{
  "error": "DUPLICATE_EMAIL",
  "message": "이미 등록된 이메일입니다"
}
```

---

#### API-024: 직원 수정

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-024 |
| Method | PUT |
| URL | `/api/v1/staff/:id` |
| 설명 | 직원 정보 수정 |
| 인증 필요 | Y |
| 관련 화면 | SCR-060 |
| 관련 기능 | FN-020 |

**Request Headers**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | Y | 직원 ID |

**Request Body**

```json
{
  "name": "박트레이너(수정)",
  "contact": "010-7777-6666",
  "role": "manager",
  "status": "active"
}
```

| 필드명 | 타입 | 필수 | 설명 |
|-------|------|------|------|
| name | string | N | 직원 이름 |
| contact | string | N | 연락처 |
| role | string | N | 직책 |
| status | string | N | 상태 (active, leave, resigned) |

**Response (성공 - 200)**

```json
{
  "id": 1,
  "name": "박트레이너(수정)",
  "updatedAt": "2026-03-11"
}
```

**Response (실패 - 404)**

```json
{
  "error": "NOT_FOUND",
  "message": "직원을 찾을 수 없습니다"
}
```

---

#### API-025: 직원 삭제

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-025 |
| Method | DELETE |
| URL | `/api/v1/staff/:id` |
| 설명 | 직원 삭제 (소프트 삭제) |
| 인증 필요 | Y |
| 관련 화면 | SCR-060 |
| 관련 기능 | FN-020 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Path 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | Y | 직원 ID |

**Request Body**

없음

**Response (성공 - 200)**

```json
{
  "message": "직원이 삭제되었습니다"
}
```

**Response (실패 - 403)**

```json
{
  "error": "FORBIDDEN",
  "message": "삭제 권한이 없습니다"
}
```

---

#### API-026: 직원 출근부 조회

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-026 |
| Method | GET |
| URL | `/api/v1/staff/attendance` |
| 설명 | 직원 출퇴근 기록 조회 |
| 인증 필요 | Y |
| 관련 화면 | SCR-062 |
| 관련 기능 | FN-021 |

**Request Headers**

```
Authorization: Bearer {token}
```

**Request Body**

없음 (Query 파라미터 사용)

**Query 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| staffId | number | N | 직원 ID |
| yearMonth | string | N | 조회 연월 (YYYY-MM 형식) |

**Request Example**

```
GET /api/v1/staff/attendance?staffId=1&yearMonth=2026-03
```

**Response (성공 - 200)**

```json
{
  "data": [
    {
      "date": "2026-03-11",
      "staffId": 1,
      "checkIn": "09:00",
      "checkOut": "18:00",
      "status": "present"
    }
  ]
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| data[].date | string | 날짜 (YYYY-MM-DD) |
| data[].staffId | number | 직원 ID |
| data[].checkIn | string | 출근 시간 (HH:mm) |
| data[].checkOut | string | 퇴근 시간 (HH:mm) |
| data[].status | string | 상태 (present, absent, leave, late 등) |

**Response (실패 - 500)**

```json
{
  "error": "SERVER_ERROR",
  "message": "조회 실패"
}
```

---

### 3.9 설정 (Settings & System)

#### API-027: 시스템 초기화

**기본 정보**

| 항목 | 내용 |
|-----|------|
| ID | API-027 |
| Method | POST |
| URL | `/api/v1/system/reset` |
| 설명 | 지점 데이터 초기화 (개발/테스트용) |
| 인증 필요 | Y |
| 관련 화면 | SCR-094 |
| 관련 기능 | FN-033 |

**Request Headers**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**

```json
{
  "branchId": 1,
  "confirmPassword": "password123",
  "targets": ["members", "sales", "attendance"]
}
```

| 필드명 | 타입 | 필수 | 설명 |
|-------|------|------|------|
| branchId | number | Y | 초기화할 지점 ID |
| confirmPassword | string | Y | 관리자 확인 비밀번호 |
| targets | array | Y | 초기화 대상 (members, sales, attendance 등) |

**Response (성공 - 200)**

```json
{
  "message": "데이터가 초기화되었습니다",
  "resetTargets": ["members", "sales", "attendance"]
}
```

| 필드명 | 타입 | 설명 |
|-------|------|------|
| message | string | 결과 메시지 |
| resetTargets | array | 초기화된 데이터 목록 |

**Response (실패 - 401)**

```json
{
  "error": "INVALID_PASSWORD",
  "message": "비밀번호가 올바르지 않습니다"
}
```

---

## 4. API 통합 가이드

### 4.1 인증 플로우

1. **로그인** (API-001): 사용자가 이메일/비밀번호로 로그인
2. **토큰 획득**: 응답에서 JWT 토큰 받기
3. **토큰 사용**: 모든 후속 API 요청의 `Authorization` 헤더에 토큰 포함
4. **토큰 갱신** (구현 필요): 토큰 만료 시 재로그인 또는 갱신 엔드포인트 호출
5. **로그아웃** (API-002): 세션 종료

### 4.2 페이지네이션 처리

목록 조회 API 사용 시:

```
GET /api/v1/members?page=1&size=20&sort=name&order=asc
```

응답 예시:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 450
  }
}
```

다음 페이지 조회:

```
GET /api/v1/members?page=2&size=20&sort=name&order=asc
```

### 4.3 에러 처리

모든 에러는 표준 포맷으로 응답됩니다.

```json
{
  "error": "ERROR_CODE",
  "message": "상세 설명"
}
```

**일반적인 에러 코드:**

- `INVALID_CREDENTIALS`: 로그인 실패
- `UNAUTHORIZED`: 인증 토큰 없음/만료
- `FORBIDDEN`: 권한 부족
- `NOT_FOUND`: 리소스 없음
- `DUPLICATE_*`: 중복 데이터 (예: DUPLICATE_PHONE, DUPLICATE_NAME)
- `INVALID_PASSWORD`: 비밀번호 오류
- `SERVER_ERROR`: 서버 오류

### 4.4 날짜/시간 형식

- **날짜**: `YYYY-MM-DD` (예: 2026-03-11)
- **시간**: `HH:mm` (24시간 형식, 예: 09:00, 18:00)
- **타임스탬프**: ISO 8601 형식 (예: 2026-03-11T10:30:00Z)

### 4.5 통화 단위

- 모든 금액은 **원(₩)** 단위
- API 응답에서 정수로 표시 (예: 300000)

---

## 5. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|-----|------|---------|
| v2.0 | 2026-03-11 | 27개 API 전체 명세 작성 |
| v1.0 | - | 초기 버전 |

---

## 6. 기술 지원

API 사용 관련 문의사항이 있을 경우 개발팀에 연락하시기 바랍니다.

**연락처**: development@spogym.com
**문서 버전**: v2.0
**최종 업데이트**: 2026-03-11


