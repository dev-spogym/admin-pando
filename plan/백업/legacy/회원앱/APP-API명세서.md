# FitGenie 회원앱 API 명세서

> **작성일**: 2026-04-17 | **버전**: 2.0
> **백엔드**: Supabase (PostgreSQL + Edge Functions + Realtime)
> **인증**: Supabase Auth (JWT)
> **Base URL**: `{SUPABASE_URL}/rest/v1` (PostgREST) / `{SUPABASE_URL}/functions/v1` (Edge Functions)
> **에러코드 체계**: `E{HTTP상태코드}{일련번호}` (에러코드정의서 참조)

---

## 공통 사항

### 인증 헤더

```
Authorization: Bearer {access_token}
apikey: {SUPABASE_ANON_KEY}
```

### 공통 응답 포맷

```json
// 성공 (단건)
{
  "success": true,
  "data": { ... },
  "message": null
}

// 성공 (목록 + 페이지네이션)
{
  "success": true,
  "data": {
    "data": [ ... ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 150,
      "totalPages": 8
    }
  },
  "message": null
}

// 에러
{
  "success": false,
  "data": null,
  "message": "사용자에게 표시할 메시지 (한글)",
  "errorCode": "E401001"
}
```

### 앱 역할 (Role)

| Role | 설명 | 비고 |
|------|------|------|
| `member` | 일반 회원 | 기본 역할 |
| `trainer` | 트레이너 (PT/그룹) | |
| `golf_trainer` | 골프강사 | trainer 확장, 쌍방서명 추가 |
| `fc` | FC (Fitness Consultant) | 영업 상담 |
| `staff` | 스태프 (프론트데스크) | 읽기 위주 |

---

## 1. 인증 API

### 1.1 POST /auth/login

회원앱 로그인. Supabase Auth 기반 JWT 발급.

**요청**

```json
{
  "phone": "010-1234-5678",
  "password": "mypassword123"
}
```

**Supabase 쿼리**

```typescript
// 1단계: Supabase Auth 로그인
const { data: authData, error } = await supabase.auth.signInWithPassword({
  email: `${phone}@fitgenie.app`,  // 전화번호 기반 이메일 변환
  password,
});

// 2단계: 사용자 프로필 조회
const { data: profile } = await supabase
  .from('members')  // 또는 staff 테이블 (role에 따라)
  .select('*, branch:branches(name, address)')
  .eq('phone', phone)
  .single();
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v1.MjQ3...",
    "user": {
      "id": "uuid-member-001",
      "role": "member",
      "member_id": "uuid-member-001",
      "branch_id": "uuid-branch-001",
      "branch_name": "강남점",
      "name": "김철수",
      "phone": "010-1234-5678"
    },
    "expires_in": 3600
  },
  "message": "로그인 성공"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E401001 | 401 | 연락처 또는 비밀번호가 올바르지 않습니다 | 인증 실패 |
| E403002 | 403 | 계정이 잠겼습니다. 관리자에게 문의해주세요 | 5회 실패 잠금 |
| E403003 | 403 | 앱 연동이 필요합니다. 가입을 진행해주세요 | app_linked_at 없음 |

---

### 1.2 POST /auth/register

앱 연동 / 가입. CRM에 등록된 회원의 전화번호를 SMS 인증 후 앱 계정과 연동.

**요청**

```json
{
  "phone": "010-1234-5678",
  "verification_code": "123456",
  "password": "newPassword123!",
  "password_confirm": "newPassword123!",
  "name": "김철수",
  "agree_terms": true,
  "agree_privacy": true,
  "agree_marketing": false
}
```

**Supabase 쿼리**

```typescript
// 1단계: 전화번호로 기존 회원 확인
const { data: member } = await supabase
  .from('members')
  .select('id, name, phone, branchId')
  .eq('phone', phone)
  .is('deletedAt', null)
  .single();

// 2단계: Supabase Auth 계정 생성
const { data: authUser } = await supabase.auth.signUp({
  email: `${phone}@fitgenie.app`,
  password,
  options: { data: { role: 'member', member_id: member.id } }
});

// 3단계: 앱 연동 시각 기록
await supabase
  .from('members')
  .update({ app_linked_at: new Date().toISOString() })
  .eq('id', member.id);
```

**응답 (201)**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "v1...",
    "user": {
      "id": "uuid-member-001",
      "role": "member",
      "member_id": "uuid-member-001",
      "branch_id": "uuid-branch-001",
      "name": "김철수"
    }
  },
  "message": "앱 연동이 완료되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400002 | 400 | 입력 형식이 올바르지 않습니다 | 비밀번호 형식 불일치 |
| E400103 | 400 | 올바른 전화번호를 입력해주세요 | 전화번호 형식 오류 |
| E404100 | 404 | 등록된 회원 정보가 없습니다. 센터에 문의해주세요 | CRM 미등록 전화번호 |
| E409100 | 409 | 이미 연동된 계정입니다. 로그인해주세요 | app_linked_at 존재 |

---

### 1.3 POST /auth/sms-verify

SMS 인증번호 요청.

**요청**

```json
{
  "phone": "010-1234-5678",
  "purpose": "register" | "reset_password"
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "expires_in": 180,
    "retry_after": 60
  },
  "message": "인증번호가 발송되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400103 | 400 | 올바른 전화번호를 입력해주세요 | 형식 오류 |
| E400003 | 400 | 잠시 후 다시 시도해주세요 | 재발송 제한 (60초) |

---

### 1.4 POST /auth/sms-confirm

SMS 인증번호 확인.

**요청**

```json
{
  "phone": "010-1234-5678",
  "code": "123456",
  "purpose": "register" | "reset_password"
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "verified": true,
    "verification_token": "temp-token-uuid",
    "expires_in": 600
  },
  "message": "인증이 완료되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400002 | 400 | 인증번호가 올바르지 않습니다 | 코드 불일치 |
| E400003 | 400 | 인증번호가 만료되었습니다. 다시 요청해주세요 | 3분 초과 |

---

### 1.5 POST /auth/reset-password

비밀번호 재설정. SMS 인증 완료 후 호출.

**요청**

```json
{
  "phone": "010-1234-5678",
  "verification_token": "temp-token-uuid",
  "new_password": "newPassword123!",
  "new_password_confirm": "newPassword123!"
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": null,
  "message": "비밀번호가 변경되었습니다. 다시 로그인해주세요"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400002 | 400 | 입력 형식이 올바르지 않습니다 | 비밀번호 정책 불충족 |
| E401003 | 401 | 인증 정보가 유효하지 않습니다 | verification_token 만료/무효 |

---

### 1.6 POST /auth/refresh-token

JWT 토큰 갱신.

**요청**

```json
{
  "refresh_token": "v1.MjQ3..."
}
```

**Supabase 쿼리**

```typescript
const { data, error } = await supabase.auth.refreshSession({
  refresh_token
});
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "v1...",
    "expires_in": 3600
  }
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E401002 | 401 | 세션이 만료되었습니다. 다시 로그인해주세요 | refresh_token 만료 |

---

### 1.7 POST /auth/logout

로그아웃. 서버 세션 종료 및 푸시 토큰 해제.

**요청**

```
Authorization: Bearer {access_token}
```

**Supabase 쿼리**

```typescript
// 1. 푸시 토큰 해제
await supabase
  .from('push_tokens')
  .delete()
  .eq('user_id', userId);

// 2. Supabase Auth 세션 종료
await supabase.auth.signOut();
```

**응답 (200)**

```json
{
  "success": true,
  "data": null,
  "message": "로그아웃되었습니다"
}
```

---

## 2. 회원 API (role: member)

### 2.1 GET /members/me

내 프로필 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('members')
  .select(`
    id, name, phone, email, gender, birthDate,
    profileImage, registeredAt, status, mileage, height,
    membershipType, membershipStart, membershipExpiry,
    branchId, lastVisitAt, memberType, referralSource, companyName,
    branch:branches(name, address, phone)
  `)
  .eq('id', userId)
  .is('deletedAt', null)
  .single();
```

**요청 파라미터**: 없음

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": "uuid-member-001",
    "name": "김철수",
    "phone": "010-1234-5678",
    "email": "kim@example.com",
    "gender": "M",
    "birthDate": "1990-01-15",
    "profileImage": "https://storage.supabase.co/avatars/member-001.jpg",
    "registeredAt": "2025-06-01T00:00:00Z",
    "status": "ACTIVE",
    "mileage": 15000,
    "height": 175,
    "membershipType": "헬스 6개월",
    "membershipStart": "2026-01-01",
    "membershipExpiry": "2026-06-30",
    "memberType": "일반",
    "lastVisitAt": "2026-04-16T09:30:00Z",
    "branch": {
      "name": "강남점",
      "address": "서울시 강남구 테헤란로 123",
      "phone": "02-1234-5678"
    }
  }
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E404100 | 404 | 회원 정보를 찾을 수 없습니다 | 탈퇴/삭제된 회원 |

---

### 2.2 PATCH /members/me

내 프로필 수정. 회원이 직접 수정 가능한 필드만 허용.

- **역할**: member
- **인증**: Bearer Token

**요청**

```json
{
  "email": "newemail@example.com",
  "profileImage": "https://storage.supabase.co/avatars/new.jpg",
  "height": 176
}
```

> 수정 가능 필드: `email`, `profileImage`, `height`
> 수정 불가 필드: `name`, `phone`, `gender`, `birthDate`, `status` (센터 관리자만 변경 가능)

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('members')
  .update({
    email: req.email,
    profileImage: req.profileImage,
    height: req.height,
    updatedAt: new Date().toISOString(),
  })
  .eq('id', userId)
  .select()
  .single();
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": "uuid-member-001",
    "email": "newemail@example.com",
    "profileImage": "https://storage.supabase.co/avatars/new.jpg",
    "height": 176,
    "updatedAt": "2026-04-17T10:00:00Z"
  },
  "message": "프로필이 수정되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400104 | 400 | 올바른 이메일 형식이 아닙니다 | 이메일 정규식 검증 실패 |
| E404100 | 404 | 회원 정보를 찾을 수 없습니다 | |

---

### 2.3 GET /members/me/tickets

내 이용권 목록 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('lesson_counts')
  .select('*, product:products(name, category, productType)')
  .eq('memberId', userId)
  .order('createdAt', { ascending: false });

// + 기간 이용권 (sales 기반)
const { data: salesData } = await supabase
  .from('sales')
  .select('id, productName, saleDate, amount, status')
  .eq('memberId', userId)
  .eq('status', 'COMPLETED')
  .order('saleDate', { ascending: false });
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| status | string | N | 필터: `active`, `expired`, `holding`, `all` (기본: `all`) |

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "productName": "헬스 6개월",
      "type": "MEMBERSHIP",
      "startDate": "2026-01-01",
      "endDate": "2026-06-30",
      "status": "active",
      "remainingDays": 74,
      "totalCount": null,
      "usedCount": null,
      "remainCount": null
    },
    {
      "id": 2,
      "productName": "PT 30회",
      "type": "PT",
      "startDate": "2026-01-15",
      "endDate": "2026-07-14",
      "status": "active",
      "remainingDays": 88,
      "totalCount": 30,
      "usedCount": 12,
      "remainCount": 18
    }
  ]
}
```

---

### 2.4 GET /members/me/attendance

내 출석 이력 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data, count } = await supabase
  .from('attendance')
  .select('*', { count: 'exact' })
  .eq('memberId', userId)
  .order('checkInAt', { ascending: false })
  .range(from, to);
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| page | number | N | 페이지 번호 (기본: 1) |
| size | number | N | 페이지 크기 (기본: 20) |
| start_date | string | N | 조회 시작일 (YYYY-MM-DD) |
| end_date | string | N | 조회 종료일 (YYYY-MM-DD) |

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 101,
        "checkInAt": "2026-04-17T09:15:00Z",
        "checkOutAt": "2026-04-17T11:30:00Z",
        "type": "REGULAR",
        "checkInMethod": "APP"
      },
      {
        "id": 100,
        "checkInAt": "2026-04-16T10:00:00Z",
        "checkOutAt": "2026-04-16T12:00:00Z",
        "type": "PT",
        "checkInMethod": "KIOSK"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 2.5 POST /members/me/attendance/qr

QR 체크인. 센터 QR 코드를 스캔하여 출석 처리.

- **역할**: member
- **인증**: Bearer Token

**요청**

```json
{
  "qr_code": "FITGENIE-BRANCH001-20260417",
  "device_info": {
    "os": "ios",
    "model": "iPhone 15",
    "app_version": "2.0.0"
  }
}
```

**Supabase 쿼리**

```typescript
// 1. QR 코드 유효성 검증 (지점 매칭)
const { data: branch } = await supabase
  .from('branches')
  .select('id, name')
  .eq('qr_code_prefix', qrPrefix)
  .single();

// 2. 이용권 유효성 확인
const { data: member } = await supabase
  .from('members')
  .select('id, status, membershipExpiry')
  .eq('id', userId)
  .single();

// 3. 당일 중복 출석 확인
const { count } = await supabase
  .from('attendance')
  .select('id', { count: 'exact', head: true })
  .eq('memberId', userId)
  .gte('checkInAt', `${today}T00:00:00`)
  .lte('checkInAt', `${today}T23:59:59`)
  .is('checkOutAt', null);

// 4. 출석 기록 생성
const { data } = await supabase
  .from('attendance')
  .insert({
    memberId: userId,
    memberName: member.name,
    checkInAt: new Date().toISOString(),
    type: 'REGULAR',
    checkInMethod: 'APP',
    branchId: branch.id,
  })
  .select()
  .single();
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 102,
    "checkInAt": "2026-04-17T09:15:00Z",
    "type": "REGULAR",
    "checkInMethod": "APP",
    "branch_name": "강남점"
  },
  "message": "출석이 완료되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E403400 | 403 | 오늘 이미 출석하셨습니다 | 당일 중복 체크인 |
| E422400 | 422 | 유효한 이용권이 없습니다 | 만료/미보유 |
| E422401 | 422 | 이용이 정지된 상태입니다. 관리자에게 문의해주세요 | SUSPENDED 상태 |
| E400002 | 400 | 유효하지 않은 QR 코드입니다 | QR 코드 파싱 실패 |

---

### 2.6 GET /members/me/body-compositions

내 체성분 이력 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('member_body_info')
  .select('*')
  .eq('memberId', userId)
  .order('measuredAt', { ascending: false });
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| limit | number | N | 조회 개수 (기본: 50) |

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "measuredAt": "2026-04-10T14:00:00Z",
      "height": 175.0,
      "weight": 72.5,
      "bloodPressureSystolic": 120,
      "bloodPressureDiastolic": 80,
      "heartRate": 68,
      "memo": "3개월 목표 체중 도달"
    },
    {
      "id": 3,
      "measuredAt": "2026-03-10T14:00:00Z",
      "height": 175.0,
      "weight": 75.0,
      "bloodPressureSystolic": 125,
      "bloodPressureDiastolic": 82,
      "heartRate": 72,
      "memo": null
    }
  ]
}
```

---

### 2.7 GET /members/me/payments

내 결제 이력 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data, count } = await supabase
  .from('sales')
  .select('*', { count: 'exact' })
  .eq('memberId', userId)
  .order('saleDate', { ascending: false })
  .range(from, to);
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| page | number | N | 페이지 번호 (기본: 1) |
| size | number | N | 페이지 크기 (기본: 20) |

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 201,
        "productName": "PT 30회",
        "saleDate": "2026-01-15T10:00:00Z",
        "amount": 1500000,
        "paymentMethod": "CARD",
        "status": "COMPLETED",
        "cardCompany": "삼성카드",
        "approvalNo": "12345678"
      },
      {
        "id": 150,
        "productName": "헬스 6개월",
        "saleDate": "2025-12-28T14:00:00Z",
        "amount": 360000,
        "paymentMethod": "CARD",
        "status": "COMPLETED",
        "cardCompany": "현대카드",
        "approvalNo": "87654321"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 2.8 GET /members/me/reservations

내 예약 목록 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('lesson_bookings')
  .select(`
    *,
    schedule:lesson_schedules(
      id, startAt, endAt, capacity, currentCount,
      lesson:lessons(name, type, instructorName)
    )
  `)
  .eq('memberId', userId)
  .in('status', ['BOOKED', 'WAITLIST'])
  .order('createdAt', { ascending: false });
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| status | string | N | 필터: `BOOKED`, `WAITLIST`, `ATTENDED`, `CANCELLED`, `all` (기본: 예약중만) |
| start_date | string | N | 수업 시작일 필터 (YYYY-MM-DD) |

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 301,
      "scheduleId": 50,
      "status": "BOOKED",
      "createdAt": "2026-04-16T08:00:00Z",
      "schedule": {
        "startAt": "2026-04-18T10:00:00Z",
        "endAt": "2026-04-18T10:50:00Z",
        "capacity": 20,
        "currentCount": 15,
        "lesson": {
          "name": "모닝 요가",
          "type": "GX",
          "instructorName": "박지영"
        }
      }
    }
  ]
}
```

---

### 2.9 POST /members/me/reservations

수업 예약 생성.

- **역할**: member
- **인증**: Bearer Token

**요청**

```json
{
  "schedule_id": 50
}
```

**Supabase 쿼리**

```typescript
// 1. 수업 일정 조회 (정원 확인)
const { data: schedule } = await supabase
  .from('lesson_schedules')
  .select('id, capacity, currentCount, status')
  .eq('id', scheduleId)
  .single();

// 2. 정원 초과 확인
if (schedule.currentCount >= schedule.capacity) {
  throw { code: 'E400502', message: '수업 정원이 초과되었습니다' };
}

// 3. 중복 예약 확인
const { count } = await supabase
  .from('lesson_bookings')
  .select('id', { count: 'exact', head: true })
  .eq('scheduleId', scheduleId)
  .eq('memberId', userId)
  .in('status', ['BOOKED', 'WAITLIST']);

// 4. 예약 생성
const { data } = await supabase
  .from('lesson_bookings')
  .insert({
    scheduleId,
    memberId: userId,
    memberName: memberName,
    status: 'BOOKED',
  })
  .select()
  .single();

// 5. 현재 인원 업데이트
await supabase
  .from('lesson_schedules')
  .update({ currentCount: schedule.currentCount + 1 })
  .eq('id', scheduleId);
```

**응답 (201)**

```json
{
  "success": true,
  "data": {
    "id": 302,
    "scheduleId": 50,
    "status": "BOOKED",
    "createdAt": "2026-04-17T08:00:00Z"
  },
  "message": "예약이 완료되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400502 | 400 | 수업 정원이 초과되었습니다 | capacity 도달 |
| E409100 | 409 | 이미 예약된 수업입니다 | 중복 예약 |
| E422500 | 422 | 수강 가능한 잔여 횟수가 없습니다 | 횟수 소진 |
| E404500 | 404 | 수업을 찾을 수 없습니다 | schedule 미존재 |

---

### 2.10 DELETE /members/me/reservations/{id}

예약 취소.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
// 1. 예약 조회 (취소 마감 시간 확인)
const { data: booking } = await supabase
  .from('lesson_bookings')
  .select('*, schedule:lesson_schedules(startAt, cancel_deadline_hours)')
  .eq('id', bookingId)
  .eq('memberId', userId)
  .single();

// 2. 취소 마감 시간 확인
const deadline = new Date(booking.schedule.startAt);
deadline.setHours(deadline.getHours() - (booking.schedule.cancel_deadline_hours || 3));
if (new Date() > deadline) {
  throw { code: 'E400501', message: '예약 취소 마감시간이 지났습니다' };
}

// 3. 예약 취소 처리
await supabase
  .from('lesson_bookings')
  .update({ status: 'CANCELLED', cancelReason: reason })
  .eq('id', bookingId);

// 4. 현재 인원 감소
await supabase
  .from('lesson_schedules')
  .update({ currentCount: schedule.currentCount - 1 })
  .eq('id', booking.scheduleId);
```

**요청**

```json
{
  "cancel_reason": "개인 사정"
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 302,
    "status": "CANCELLED",
    "cancelReason": "개인 사정"
  },
  "message": "예약이 취소되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400501 | 400 | 예약 취소 마감시간이 지났습니다 | cancel_deadline_hours 초과 |
| E404001 | 404 | 예약 정보를 찾을 수 없습니다 | 예약 미존재 또는 타인 예약 |

---

### 2.11 GET /members/me/coupons

내 쿠폰함 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('member_coupons')
  .select('*, coupon:coupons(name, type, value, min_amount)')
  .eq('memberId', userId)
  .order('createdAt', { ascending: false });
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| status | string | N | `available`, `used`, `expired` (기본: `available`) |

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "couponName": "웰컴 할인 쿠폰",
      "type": "PERCENT",
      "value": 10,
      "minAmount": 100000,
      "status": "available",
      "validFrom": "2026-04-01",
      "validUntil": "2026-06-30",
      "usedAt": null
    },
    {
      "id": 8,
      "couponName": "PT 1회 무료 체험",
      "type": "FREE_SESSION",
      "value": 1,
      "minAmount": null,
      "status": "used",
      "validFrom": "2026-03-01",
      "validUntil": "2026-05-31",
      "usedAt": "2026-03-15T10:00:00Z"
    }
  ]
}
```

---

### 2.12 GET /members/me/mileage

내 마일리지 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
// 현재 잔액
const { data: member } = await supabase
  .from('members')
  .select('mileage')
  .eq('id', userId)
  .single();

// 적립/사용 이력
const { data: history } = await supabase
  .from('mileage_history')
  .select('*')
  .eq('memberId', userId)
  .order('createdAt', { ascending: false })
  .range(from, to);
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "balance": 15000,
    "history": [
      {
        "id": 30,
        "type": "EARN",
        "amount": 5000,
        "description": "PT 30회 구매 적립",
        "createdAt": "2026-01-15T10:00:00Z"
      },
      {
        "id": 25,
        "type": "USE",
        "amount": -3000,
        "description": "상품 구매 시 사용",
        "createdAt": "2025-12-20T14:00:00Z"
      }
    ]
  }
}
```

---

### 2.13 GET /members/me/locker

내 락커 정보 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('lockers')
  .select('id, number, status, assignedAt, expiresAt')
  .eq('memberId', userId)
  .eq('status', 'IN_USE')
  .single();
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 45,
    "number": "A-023",
    "status": "IN_USE",
    "assignedAt": "2026-01-01T00:00:00Z",
    "expiresAt": "2026-06-30T23:59:59Z",
    "remainingDays": 74
  }
}
```

> 락커 미배정 시: `{ "success": true, "data": null }`

---

## 3. 수업 API (공통)

### 3.1 GET /classes

수업 목록 조회. 회원은 예약 가능한 수업, 직원은 전체 수업을 조회.

- **역할**: 전체 (로그인 필요)
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
let query = supabase
  .from('lesson_schedules')
  .select(`
    *,
    lesson:lessons(id, name, type, instructorName, duration, color),
    bookings:lesson_bookings(id, memberId, status)
  `)
  .eq('branchId', branchId)
  .gte('startAt', startDate)
  .lte('startAt', endDate)
  .order('startAt', { ascending: true });

// 수업 상태 필터 (OPEN만 또는 전체)
if (role === 'member') {
  query = query.eq('status', 'OPEN');
}
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| start_date | string | Y | 조회 시작일 (YYYY-MM-DD) |
| end_date | string | Y | 조회 종료일 (YYYY-MM-DD) |
| type | string | N | 수업 유형 필터: `PT`, `GX`, `GOLF` 등 |
| instructor_id | number | N | 강사 ID 필터 |

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 50,
      "startAt": "2026-04-18T10:00:00Z",
      "endAt": "2026-04-18T10:50:00Z",
      "capacity": 20,
      "currentCount": 15,
      "status": "OPEN",
      "lesson": {
        "id": 5,
        "name": "모닝 요가",
        "type": "GX",
        "instructorName": "박지영",
        "duration": 50,
        "color": "#4CAF50"
      },
      "isBooked": false,
      "availableSlots": 5
    }
  ]
}
```

---

### 3.2 GET /classes/{id}

수업 상세 조회.

- **역할**: 전체 (로그인 필요)
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('lesson_schedules')
  .select(`
    *,
    lesson:lessons(*),
    bookings:lesson_bookings(id, memberId, memberName, status)
  `)
  .eq('id', scheduleId)
  .single();
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 50,
    "startAt": "2026-04-18T10:00:00Z",
    "endAt": "2026-04-18T10:50:00Z",
    "capacity": 20,
    "currentCount": 15,
    "status": "OPEN",
    "room": "스튜디오 A",
    "lesson": {
      "id": 5,
      "name": "모닝 요가",
      "type": "GX",
      "instructorName": "박지영",
      "duration": 50,
      "description": "초급자를 위한 하타 요가 클래스",
      "color": "#4CAF50"
    },
    "bookings": [
      { "id": 301, "memberId": 1, "memberName": "김철수", "status": "BOOKED" },
      { "id": 302, "memberId": 2, "memberName": "이영희", "status": "BOOKED" }
    ]
  }
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E404500 | 404 | 수업을 찾을 수 없습니다 | schedule 미존재 |

---

## 4. 상품/결제 API (role: member)

### 4.1 GET /products

구매 가능한 상품 목록 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('branchId', branchId)
  .eq('isActive', true)
  .order('name', { ascending: true });
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| category | string | N | `PT`, `MEMBERSHIP`, `GX`, `PRODUCT`, `SERVICE` |

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "name": "헬스 6개월",
      "category": "MEMBERSHIP",
      "price": 360000,
      "duration": 180,
      "sessions": null,
      "description": "헬스장 이용 6개월권"
    },
    {
      "id": 11,
      "name": "PT 30회",
      "category": "PT",
      "price": 1500000,
      "duration": null,
      "sessions": 30,
      "description": "1:1 개인 트레이닝 30회"
    }
  ]
}
```

---

### 4.2 GET /products/{id}

상품 상세 조회.

- **역할**: member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('id', productId)
  .eq('isActive', true)
  .single();
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 11,
    "name": "PT 30회",
    "category": "PT",
    "price": 1500000,
    "duration": 180,
    "sessions": 30,
    "description": "1:1 개인 트레이닝 30회. 유효기간 6개월.",
    "holdingEnabled": true,
    "transferEnabled": false,
    "sportType": "헬스",
    "classType": "1:1",
    "deductionType": "횟수차감"
  }
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E404301 | 404 | 상품을 찾을 수 없습니다 | productId 미존재 |

---

### 4.3 POST /payments/prepare

결제 준비. 토스페이먼츠 결제창 호출 전 서버에 결제 정보 등록.

- **역할**: member
- **인증**: Bearer Token
- **구현**: Edge Function

**요청**

```json
{
  "product_id": 11,
  "amount": 1500000,
  "coupon_id": null,
  "mileage_use": 0,
  "payment_method": "CARD"
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "order_id": "fitgenie-20260417-001",
    "amount": 1500000,
    "order_name": "PT 30회",
    "customer_name": "김철수",
    "customer_phone": "010-1234-5678",
    "toss_client_key": "test_ck_...",
    "success_url": "https://app.fitgenie.kr/payment/success",
    "fail_url": "https://app.fitgenie.kr/payment/fail"
  }
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400300 | 400 | 결제 금액을 확인해주세요 | 금액 불일치 |
| E404301 | 404 | 상품을 찾을 수 없습니다 | 상품 미존재/비활성 |
| E422950 | 422 | 유효기간이 만료된 쿠폰입니다 | 쿠폰 만료 |

---

### 4.4 POST /payments/confirm

결제 확인. 토스페이먼츠 결제 완료 콜백 후 서버 검증 및 이용권 생성.

- **역할**: member
- **인증**: Bearer Token
- **구현**: Edge Function

**요청**

```json
{
  "order_id": "fitgenie-20260417-001",
  "payment_key": "toss_payment_key_...",
  "amount": 1500000
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "sale_id": 205,
    "product_name": "PT 30회",
    "amount": 1500000,
    "payment_method": "CARD",
    "card_company": "삼성카드",
    "approval_no": "12345678",
    "paid_at": "2026-04-17T15:30:00Z",
    "ticket": {
      "id": 55,
      "product_name": "PT 30회",
      "total_count": 30,
      "start_date": "2026-04-17",
      "end_date": "2026-10-16"
    }
  },
  "message": "결제가 완료되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400300 | 400 | 결제 금액이 일치하지 않습니다 | 서버 금액 != 결제 금액 |
| E402001 | 402 | 결제 처리에 실패했습니다. 다시 시도해주세요 | PG사 승인 실패 |
| E503002 | 503 | 결제 서비스에 일시적인 문제가 발생했습니다 | PG API 오류 |

---

## 5. 트레이너 API (role: trainer, golf_trainer)

### 5.1 GET /instructor/dashboard

강사 홈 대시보드.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const today = new Date().toISOString().slice(0, 10);

// 오늘 수업 목록
const { data: todayClasses } = await supabase
  .from('classes')
  .select('*')
  .eq('instructorId', staffId)
  .eq('branchId', branchId)
  .gte('startAt', `${today}T00:00:00`)
  .lte('startAt', `${today}T23:59:59`)
  .order('startAt', { ascending: true });

// 담당 회원 수
const { count: memberCount } = await supabase
  .from('members')
  .select('id', { count: 'exact', head: true })
  .eq('staffId', staffId);

// 이번 달 완료 수업 수
const monthStart = `${today.slice(0, 7)}-01`;
const { count: completedCount } = await supabase
  .from('classes')
  .select('id', { count: 'exact', head: true })
  .eq('instructorId', staffId)
  .eq('lesson_status', 'completed')
  .gte('startAt', `${monthStart}T00:00:00`);
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "todayClasses": [
      {
        "id": 100,
        "title": "PT - 김철수",
        "startAt": "2026-04-17T10:00:00Z",
        "endAt": "2026-04-17T10:50:00Z",
        "memberName": "김철수",
        "lessonStatus": "scheduled",
        "type": "PT"
      }
    ],
    "todayClassCount": 6,
    "completedToday": 2,
    "memberCount": 25,
    "monthlyCompleted": 48,
    "unreadNotifications": 3
  }
}
```

---

### 5.2 GET /instructor/classes

내 수업 목록.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('classes')
  .select('*, member:members(name, phone)')
  .eq('instructorId', staffId)
  .eq('branchId', branchId)
  .gte('startAt', startDate)
  .lte('startAt', endDate)
  .order('startAt', { ascending: true });
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| start_date | string | Y | 조회 시작일 |
| end_date | string | Y | 조회 종료일 |
| status | string | N | `scheduled`, `in_progress`, `completed`, `no_show`, `cancelled` |

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "title": "PT - 김철수",
      "startAt": "2026-04-17T10:00:00Z",
      "endAt": "2026-04-17T10:50:00Z",
      "lessonStatus": "scheduled",
      "capacity": 1,
      "room": null,
      "member": {
        "name": "김철수",
        "phone": "010-1234-5678"
      },
      "signatureUrl": null,
      "completedAt": null
    }
  ]
}
```

---

### 5.3 GET /instructor/classes/{id}

수업 상세 (강사용).

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 100,
    "title": "PT - 김철수",
    "startAt": "2026-04-17T10:00:00Z",
    "endAt": "2026-04-17T10:50:00Z",
    "lessonStatus": "scheduled",
    "capacity": 1,
    "room": "PT룸 A",
    "member": {
      "id": 1,
      "name": "김철수",
      "phone": "010-1234-5678",
      "remainCount": 18,
      "lastBodyInfo": {
        "weight": 72.5,
        "measuredAt": "2026-04-10"
      }
    },
    "signatureUrl": null,
    "completedAt": null,
    "cancelDeadlineHours": 3
  }
}
```

---

### 5.4 PATCH /instructor/classes/{id}/start

수업 시작 처리.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('classes')
  .update({ lesson_status: 'in_progress' })
  .eq('id', classId)
  .eq('instructorId', staffId)
  .eq('lesson_status', 'scheduled')
  .select()
  .single();
```

**요청**: 없음 (path parameter만)

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 100,
    "lessonStatus": "in_progress"
  },
  "message": "수업이 시작되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400500 | 400 | 수업을 시작할 수 없는 상태입니다 | 이미 시작/완료/취소된 수업 |
| E404500 | 404 | 수업을 찾을 수 없습니다 | |

---

### 5.5 PATCH /instructor/classes/{id}/attendance

수업 출석 체크 (참여 회원별).

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**요청**

```json
{
  "member_id": 1,
  "status": "ATTENDED"
}
```

**Supabase 쿼리**

```typescript
await supabase
  .from('lesson_bookings')
  .update({ status: 'ATTENDED' })
  .eq('scheduleId', classId)
  .eq('memberId', memberId);
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "memberId": 1,
    "memberName": "김철수",
    "status": "ATTENDED"
  },
  "message": "출석 처리되었습니다"
}
```

---

### 5.6 POST /instructor/classes/{id}/complete

수업 완료 + 서명 처리.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**요청**

```json
{
  "signature": "data:image/png;base64,iVBOR...",
  "memo": "오늘 스쿼트 자세 교정 진행"
}
```

**Supabase ��리**

```typescript
// 1. 서명 이미지 업로드 (Supabase Storage)
const { data: uploaded } = await supabase.storage
  .from('signatures')
  .upload(`classes/${classId}/instructor.png`, signatureBlob);

// 2. 수업 완료 처리
await supabase
  .from('classes')
  .update({
    lesson_status: 'completed',
    signature_url: uploaded.path,
    signature_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  })
  .eq('id', classId)
  .eq('instructorId', staffId);

// 3. 횟수 차감 (PT인 경우)
await supabase
  .from('lesson_counts')
  .update({ usedCount: currentUsed + 1 })
  .eq('memberId', memberId)
  .eq('productId', productId);
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 100,
    "lessonStatus": "completed",
    "signatureUrl": "https://storage.supabase.co/signatures/classes/100/instructor.png",
    "completedAt": "2026-04-17T10:55:00Z",
    "remainCount": 17
  },
  "message": "수업이 완료되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400801 | 400 | 전자서명을 완료해주세요 | signature 누락 |
| E400500 | 400 | 수업을 시작할 수 없는 상태입니다 | 미시작/이미 완료 |

---

### 5.7 PATCH /instructor/classes/{id}/no-show

노쇼 처리.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**요청**

```json
{
  "member_id": 1,
  "deduct_count": true,
  "reason": "연락 없이 미참석"
}
```

**Supabase 쿼리**

```typescript
// 1. 예약 상태 변경
await supabase
  .from('lesson_bookings')
  .update({ status: 'NOSHOW' })
  .eq('scheduleId', classId)
  .eq('memberId', memberId);

// 2. 페널티 기록
await supabase
  .from('penalties')
  .insert({
    branchId,
    memberId,
    memberName,
    scheduleId: classId,
    type: 'NOSHOW',
    deductCount: deductCount ? 1 : 0,
    reason,
    appliedBy: staffName,
  });

// 3. 횟수 차감 (설정에 따라)
if (deductCount) {
  await supabase
    .from('lesson_counts')
    .update({ usedCount: currentUsed + 1 })
    .eq('memberId', memberId);
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "memberId": 1,
    "status": "NOSHOW",
    "penaltyId": 15,
    "countDeducted": true
  },
  "message": "노쇼 처리되었습니다"
}
```

---

### 5.8 GET /instructor/members

담당 회원 목록.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('members')
  .select('id, name, phone, status, membershipExpiry, lastVisitAt')
  .eq('staffId', staffId)
  .is('deletedAt', null)
  .order('name', { ascending: true });
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| search | string | N | 이름/전화번호 검색 |

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "김철수",
      "phone": "010-1234-5678",
      "status": "ACTIVE",
      "membershipExpiry": "2026-06-30",
      "lastVisitAt": "2026-04-16T09:30:00Z",
      "remainCount": 18
    }
  ]
}
```

---

### 5.9 GET /instructor/members/{id}

회원 상세 (강사용).

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data: member } = await supabase
  .from('members')
  .select('*')
  .eq('id', memberId)
  .eq('staffId', staffId) // 담당 회원만 조회 가능
  .single();

// 최근 체성분
const { data: bodyInfo } = await supabase
  .from('member_body_info')
  .select('*')
  .eq('memberId', memberId)
  .order('measuredAt', { ascending: false })
  .limit(1);

// 이용권 잔여
const { data: counts } = await supabase
  .from('lesson_counts')
  .select('*')
  .eq('memberId', memberId);
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "김철수",
    "phone": "010-1234-5678",
    "gender": "M",
    "birthDate": "1990-01-15",
    "status": "ACTIVE",
    "registeredAt": "2025-06-01T00:00:00Z",
    "lastVisitAt": "2026-04-16T09:30:00Z",
    "latestBodyInfo": {
      "weight": 72.5,
      "height": 175,
      "measuredAt": "2026-04-10"
    },
    "tickets": [
      {
        "productName": "PT 30회",
        "totalCount": 30,
        "usedCount": 12,
        "remainCount": 18,
        "endDate": "2026-07-14"
      }
    ],
    "evaluations": [],
    "programs": []
  }
}
```

---

### 5.10 POST /instructor/members/{id}/body-compositions

체성분 등록.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**요청**

```json
{
  "measuredAt": "2026-04-17T14:00:00Z",
  "height": 175.0,
  "weight": 71.5,
  "bloodPressureSystolic": 118,
  "bloodPressureDiastolic": 78,
  "heartRate": 66,
  "memo": "체중 감량 목표 달성 중"
}
```

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('member_body_info')
  .insert({
    memberId,
    measuredAt: req.measuredAt,
    height: req.height,
    weight: req.weight,
    bloodPressureSystolic: req.bloodPressureSystolic,
    bloodPressureDiastolic: req.bloodPressureDiastolic,
    heartRate: req.heartRate,
    memo: req.memo,
  })
  .select()
  .single();
```

**응답 (201)**

```json
{
  "success": true,
  "data": {
    "id": 6,
    "memberId": 1,
    "measuredAt": "2026-04-17T14:00:00Z",
    "height": 175.0,
    "weight": 71.5,
    "bloodPressureSystolic": 118,
    "bloodPressureDiastolic": 78,
    "heartRate": 66,
    "memo": "체중 감량 목표 달성 중"
  },
  "message": "체성분이 기록되었습니다"
}
```

---

### 5.11 POST /instructor/members/{id}/body-info

신체정보 등록. 체성분과 동일 테이블 사용 (member_body_info).

> 5.10과 동일한 API. body-compositions와 body-info는 같은 엔드포인트.

---

### 5.12 POST /instructor/members/{id}/evaluations

회원 평가 등록.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**요청**

```json
{
  "evaluatedAt": "2026-04-17T15:00:00Z",
  "category": "체력",
  "score": 7,
  "content": "유산소 능력 향상, 상체 근력 보강 필요",
  "evaluatorName": "이강사"
}
```

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('member_evaluations')
  .insert({
    memberId,
    evaluatedAt: req.evaluatedAt,
    category: req.category,
    score: req.score,
    content: req.content,
    evaluatorName: req.evaluatorName,
  })
  .select()
  .single();
```

**응답 (201)**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "memberId": 1,
    "evaluatedAt": "2026-04-17T15:00:00Z",
    "category": "체력",
    "score": 7,
    "content": "유산소 능력 향상, 상체 근력 보강 필요",
    "evaluatorName": "이강사"
  },
  "message": "평가가 등록되었습니다"
}
```

> **category 옵션**: `체력`, `자세`, `유연성`, `근력`, `목표달성`
> **score 범위**: 1~10

---

### 5.13 POST /instructor/members/{id}/exercise-programs

운동 프로그램 배정.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**요청**

```json
{
  "program_id": 5
}
```

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('member_exercise_programs')
  .insert({
    memberId,
    programId: req.program_id,
    assignedBy: staffId,
    assignedAt: new Date().toISOString(),
    status: 'ACTIVE',
  })
  .select('*, exercise_programs(name, category, level)')
  .single();
```

**응답 (201)**

```json
{
  "success": true,
  "data": {
    "id": 20,
    "memberId": 1,
    "programId": 5,
    "programName": "초급 체중감량 프로그램",
    "category": "다이어트",
    "level": "초급",
    "assignedAt": "2026-04-17T15:30:00Z",
    "status": "ACTIVE"
  },
  "message": "프로그램이 배정되었습니다"
}
```

---

### 5.14 POST /instructor/members/{id}/exercise-logs

운동 이력 기록.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**요청**

```json
{
  "logDate": "2026-04-17",
  "exerciseName": "벤치프레스",
  "sets": 4,
  "reps": 10,
  "weightKg": 60,
  "durationMin": null,
  "distanceKm": null,
  "memo": "4세트 완료, 마지막 세트 보조"
}
```

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('exercise_logs')
  .insert({
    memberId,
    logDate: req.logDate,
    exerciseName: req.exerciseName,
    sets: req.sets,
    reps: req.reps,
    weightKg: req.weightKg,
    durationMin: req.durationMin,
    distanceKm: req.distanceKm,
    memo: req.memo,
  })
  .select()
  .single();
```

**응답 (201)**

```json
{
  "success": true,
  "data": {
    "id": 50,
    "memberId": 1,
    "logDate": "2026-04-17",
    "exerciseName": "벤치프레스",
    "sets": 4,
    "reps": 10,
    "weightKg": 60.0,
    "memo": "4세트 완료, 마지막 세트 보조"
  },
  "message": "운동 이력이 기록되었습니다"
}
```

---

### 5.15 GET /instructor/stats

강사 근무현황 / KPI.

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const monthStart = `${today.slice(0, 7)}-01`;

// 이번 달 수업 통계
const { data: classes } = await supabase
  .from('classes')
  .select('id, lesson_status, startAt')
  .eq('instructorId', staffId)
  .gte('startAt', `${monthStart}T00:00:00`);

// 페널티 목록
const { data: penalties } = await supabase
  .from('penalties')
  .select('*')
  .eq('branchId', branchId)
  .eq('appliedBy', staffName)
  .gte('createdAt', `${monthStart}T00:00:00`);
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "period": "2026-04",
    "totalClasses": 52,
    "completedClasses": 48,
    "cancelledClasses": 2,
    "noShowCount": 2,
    "completionRate": 92.3,
    "memberCount": 25,
    "newMembersThisMonth": 3,
    "avgClassesPerDay": 2.6
  }
}
```

---

### 5.16 GET /instructor/penalties

페널티 목록 (내가 적용한 페널티).

- **역할**: trainer, golf_trainer
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data, count } = await supabase
  .from('penalties')
  .select('*', { count: 'exact' })
  .eq('branchId', branchId)
  .eq('appliedBy', staffName)
  .order('createdAt', { ascending: false })
  .range(from, to);
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 15,
        "memberId": 1,
        "memberName": "김철수",
        "type": "NOSHOW",
        "deductCount": 1,
        "reason": "연락 없이 미참석",
        "appliedBy": "이강사",
        "createdAt": "2026-04-17T10:55:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

## 6. 골프강사 전용 API (role: golf_trainer)

> 골프강사는 트레이너 API(섹션 5) 전체를 사용하며, 아래는 **쌍방서명 및 레슨 확인서** 전용 API.

### 6.1 POST /golf/classes/{id}/dual-sign/start

쌍방서명 시작 (강사 서명). 강사가 먼저 서명 후 회원에게 서명을 요청.

- **역할**: golf_trainer
- **인증**: Bearer Token

**요청**

```json
{
  "instructor_signature": "data:image/png;base64,iVBORw0KGgo...",
  "signature_mode": "face_to_face",
  "device_info": {
    "os": "ios",
    "model": "iPhone 15",
    "app_version": "2.0.0"
  }
}
```

> **signature_mode 옵션**:
> - `face_to_face`: 대면 서명 (기기를 회원에게 전달)
> - `remote`: 원격 서명 (회원 앱에 푸시 알림 발송)

**Supabase 쿼리**

```typescript
// 1. 수업 상태 확인 (in_progress 상태여야 함)
const { data: classData } = await supabase
  .from('classes')
  .select('id, lesson_status, member_id, member_name, instructorId')
  .eq('id', classId)
  .eq('instructorId', staffId)
  .single();

if (classData.lesson_status !== 'in_progress') {
  throw { code: 'E400500', message: '수업을 시작할 수 없는 상태입니다' };
}

// 2. 강사 서명 이미지 업로드
const { data: uploaded } = await supabase.storage
  .from('signatures')
  .upload(`dual-sign/${classId}/instructor.png`, signatureBlob);

// 3. 서명 레코드 생성
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 후 만료

const { data: signature } = await supabase
  .from('class_signatures')
  .insert({
    classId,
    branchId,
    instructorId: staffId,
    memberId: classData.member_id,
    instructorSignatureUrl: uploaded.path,
    instructorSignedAt: new Date().toISOString(),
    status: 'pending_member',
    signatureMode: req.signature_mode,
    expiresAt: expiresAt.toISOString(),
    deviceInfo: req.device_info,
  })
  .select()
  .single();

// 4. 원격 모드인 경우 푸시 알림 발송
if (req.signature_mode === 'remote') {
  await supabase.functions.invoke('send-push', {
    body: {
      userId: classData.member_id,
      title: '레슨 서명 요청',
      body: '골프 레슨이 완료되었습니다. 서명을 확인해주세요.',
      data: { type: 'dual_sign', signatureId: signature.id, classId }
    }
  });
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "signature_id": "uuid-sig-001",
    "class_id": 100,
    "status": "pending_member",
    "signature_mode": "face_to_face",
    "instructor_signed_at": "2026-04-17T10:52:00Z",
    "expires_at": "2026-04-18T10:52:00Z",
    "push_sent": false,
    "member_name": "김철수"
  },
  "message": "강사 서명이 완료되었습니다. 회원 서명을 진행해주세요"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400801 | 400 | 강사 서명이 필요합니다 | instructor_signature 누락 |
| E400500 | 400 | 수업을 시작할 수 없는 상태입니다 | 수업이 in_progress가 아님 |
| E409800 | 409 | 이미 서명이 완료된 수업입니다 | 기존 완료된 서명 존재 |

---

### 6.2 POST /golf/classes/{id}/dual-sign/member

회원 서명 (쌍방서명 완료).

- **역할**: golf_trainer (대면) 또는 member (원격)
- **인증**: Bearer Token

**요청**

```json
{
  "signature_id": "uuid-sig-001",
  "member_signature": "data:image/png;base64,iVBORw0KGgo...",
  "device_info": {
    "os": "android",
    "model": "Galaxy S24",
    "app_version": "2.0.0"
  }
}
```

**Supabase 쿼리**

```typescript
// 1. 서명 레코드 확인 (만료/완료 체크)
const { data: sig } = await supabase
  .from('class_signatures')
  .select('*')
  .eq('id', signatureId)
  .single();

if (sig.status === 'completed') {
  throw { code: 'E409800', message: '이미 서명이 완료되었습니다' };
}
if (new Date(sig.expiresAt) < new Date()) {
  throw { code: 'E400003', message: '서명 요청이 만료되었습니다' };
}

// 2. 회원 서명 이미지 업로드
const { data: uploaded } = await supabase.storage
  .from('signatures')
  .upload(`dual-sign/${classId}/member.png`, signatureBlob);

// 3. 서명 레코드 업데이트 → completed
await supabase
  .from('class_signatures')
  .update({
    memberSignatureUrl: uploaded.path,
    memberSignedAt: new Date().toISOString(),
    status: 'completed',
    memberDeviceInfo: req.device_info,
  })
  .eq('id', signatureId);

// 4. 수업 완료 처리
await supabase
  .from('classes')
  .update({
    lesson_status: 'completed',
    completed_at: new Date().toISOString(),
    signature_url: sig.instructorSignatureUrl, // 강사 서명 URL (기존 필드 호환)
    signature_at: sig.instructorSignedAt,
  })
  .eq('id', classId);

// 5. 횟수 차감
await supabase
  .from('lesson_counts')
  .update({ usedCount: currentUsed + 1 })
  .eq('memberId', sig.memberId);

// 6. 레슨 확인서 자동 생성
await supabase
  .from('golf_certificates')
  .insert({
    classId,
    signatureId,
    branchId,
    instructorId: sig.instructorId,
    memberId: sig.memberId,
    lessonDate: classData.startAt,
    status: 'issued',
  });
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "signature_id": "uuid-sig-001",
    "status": "completed",
    "instructor_signed_at": "2026-04-17T10:52:00Z",
    "member_signed_at": "2026-04-17T10:55:00Z",
    "certificate_id": "uuid-cert-001",
    "remain_count": 17
  },
  "message": "쌍방서명이 완료되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400801 | 400 | 전자서명을 완료해주세요 | member_signature 누락 |
| E409800 | 409 | 이미 서명이 완료되었습니다 | status = completed |
| E400003 | 400 | 서명 요청이 만료되었습니다. 강사에게 재요청해주세요 | 24시간 초과 |
| E404001 | 404 | 서명 요청을 찾을 수 없습니다 | signatureId 미존재 |

---

### 6.3 GET /golf/classes/{id}/dual-sign/status

서명 상태 조회. 원격 서명 시 폴링 또는 Realtime 대체용.

- **역할**: golf_trainer, member
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('class_signatures')
  .select('*')
  .eq('classId', classId)
  .order('createdAt', { ascending: false })
  .limit(1)
  .single();
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "signature_id": "uuid-sig-001",
    "status": "pending_member",
    "signature_mode": "remote",
    "instructor_signed_at": "2026-04-17T10:52:00Z",
    "member_signed_at": null,
    "expires_at": "2026-04-18T10:52:00Z",
    "remaining_seconds": 85320
  }
}
```

> **status 값**: `pending_member` (회원 서명 대기) | `completed` (완료) | `expired` (만료)

---

### 6.4 POST /golf/classes/{id}/dual-sign/resend

원격 서명 알림 재발송.

- **역할**: golf_trainer
- **인증**: Bearer Token

**요청**

```json
{
  "signature_id": "uuid-sig-001"
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "push_sent": true,
    "resend_count": 2
  },
  "message": "알림이 재발송되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E400003 | 400 | 잠시 후 다시 시도해주세요 | 재발송 제한 (1분 간격) |
| E409800 | 409 | 이미 서명이 완료되었습니다 | 완료 후 재발송 시도 |

---

### 6.5 GET /golf/certificates

레슨 확인서 목록.

- **역할**: golf_trainer
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('golf_certificates')
  .select(`
    *,
    class:classes(title, startAt, endAt),
    member:members(name, phone),
    signature:class_signatures(instructorSignatureUrl, memberSignatureUrl)
  `)
  .eq('instructorId', staffId)
  .order('lessonDate', { ascending: false })
  .range(from, to);
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| page | number | N | 페이지 번호 |
| size | number | N | 페이지 크기 |
| start_date | string | N | 시작일 필터 |
| end_date | string | N | 종료일 필터 |
| member_id | number | N | 회원 ID 필터 |

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid-cert-001",
        "classId": 100,
        "lessonDate": "2026-04-17T10:00:00Z",
        "status": "issued",
        "member": {
          "name": "김철수",
          "phone": "010-1234-5678"
        },
        "class": {
          "title": "골프 레슨 - 김철수",
          "startAt": "2026-04-17T10:00:00Z",
          "endAt": "2026-04-17T10:50:00Z"
        },
        "createdAt": "2026-04-17T10:55:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 30,
      "totalPages": 2
    }
  }
}
```

---

### 6.6 GET /golf/certificates/{id}

레슨 확인서 상세.

- **역할**: golf_trainer, member (본인 확인서)
- **인증**: Bearer Token

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": "uuid-cert-001",
    "classId": 100,
    "lessonDate": "2026-04-17T10:00:00Z",
    "status": "issued",
    "branch": {
      "name": "강남점",
      "address": "서울시 강남구 테헤란로 123"
    },
    "instructor": {
      "name": "박프로",
      "phone": "010-9876-5432"
    },
    "member": {
      "name": "김철수",
      "phone": "010-1234-5678"
    },
    "class": {
      "title": "골프 레슨 - 김철수",
      "startAt": "2026-04-17T10:00:00Z",
      "endAt": "2026-04-17T10:50:00Z",
      "duration": 50
    },
    "signatures": {
      "instructorSignatureUrl": "https://storage.supabase.co/signatures/dual-sign/100/instructor.png",
      "memberSignatureUrl": "https://storage.supabase.co/signatures/dual-sign/100/member.png",
      "instructorSignedAt": "2026-04-17T10:52:00Z",
      "memberSignedAt": "2026-04-17T10:55:00Z"
    },
    "createdAt": "2026-04-17T10:55:00Z"
  }
}
```

---

### 6.7 GET /golf/certificates/{id}/pdf

레슨 확인서 PDF 다운로드.

- **역할**: golf_trainer, member (본인 확인서)
- **인증**: Bearer Token
- **구현**: Edge Function

**응답**: `Content-Type: application/pdf`

```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="lesson-certificate-20260417.pdf"
```

> PDF는 Edge Function에서 서버사이드 렌더링 후 바이너리 반환.
> 앱에서는 응답을 파일로 저장하거나 공유 시트로 전달.

---

## 7. FC API (role: fc)

### 7.1 GET /fc/dashboard

FC 홈 대시보드.

- **역할**: fc
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const today = new Date().toISOString().slice(0, 10);

// 오늘 상담 예정
const { data: todayConsultations } = await supabase
  .from('consultations')
  .select('*')
  .eq('staffId', staffId)
  .eq('branchId', branchId)
  .eq('status', '예정')
  .gte('scheduledAt', `${today}T00:00:00`)
  .lte('scheduledAt', `${today}T23:59:59`);

// 담당 회원 현황
const { count: memberCount } = await supabase
  .from('members')
  .select('id', { count: 'exact', head: true })
  .eq('staffId', staffId)
  .is('deletedAt', null);

// 만료 예정 회원 (30일 이내)
const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const { count: expiringCount } = await supabase
  .from('members')
  .select('id', { count: 'exact', head: true })
  .eq('staffId', staffId)
  .eq('status', 'ACTIVE')
  .lte('membershipExpiry', in30Days);
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "todayConsultations": [
      {
        "id": 50,
        "memberId": 5,
        "memberName": "이영희",
        "type": "재등록상담",
        "scheduledAt": "2026-04-17T14:00:00Z",
        "status": "예정"
      }
    ],
    "todayConsultationCount": 3,
    "memberCount": 45,
    "expiringMemberCount": 8,
    "monthlyRegistrations": 5,
    "monthlyConsultations": 22,
    "unreadNotifications": 2
  }
}
```

---

### 7.2 GET /fc/consultations

상담 목록 조회.

- **역할**: fc
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('consultations')
  .select('*, member:members(name, phone)')
  .eq('staffId', staffId)
  .eq('branchId', branchId)
  .order('scheduledAt', { ascending: false })
  .range(from, to);
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| page | number | N | 페이지 번호 |
| size | number | N | 페이지 크기 |
| status | string | N | `예정`, `완료`, `취소`, `노쇼` |
| type | string | N | `상담`, `OT`, `체험`, `재등록상담` |
| start_date | string | N | 시작일 필터 |
| end_date | string | N | 종료일 필터 |

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 50,
        "memberId": 5,
        "memberName": "이영희",
        "type": "재등록상담",
        "channel": "방문",
        "staffName": "박FC",
        "content": "3개월 연장 안내, 할인 쿠폰 제안",
        "status": "완료",
        "result": "등록",
        "consultedAt": "2026-04-17T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 22,
      "totalPages": 2
    }
  }
}
```

---

### 7.3 POST /fc/consultations

상담 등록.

- **역할**: fc
- **인증**: Bearer Token

**요청**

```json
{
  "memberId": 5,
  "consultedAt": "2026-04-17T14:00:00Z",
  "type": "재등록상담",
  "channel": "방문",
  "content": "3개월 연장 안내, 할인 쿠폰 제안",
  "status": "완료",
  "result": "등록",
  "nextAction": "계약서 작성 예정"
}
```

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('consultations')
  .insert({
    memberId: req.memberId,
    staffId,
    branchId,
    type: req.type,
    staffName: currentUser.name,
    content: req.content,
    status: req.status,
    result: req.result,
    nextAction: req.nextAction,
    channel: req.channel,
    consultedAt: req.consultedAt,
    scheduledAt: req.consultedAt,
    completedAt: req.status === '완료' ? req.consultedAt : null,
  })
  .select()
  .single();
```

**응답 (201)**

```json
{
  "success": true,
  "data": {
    "id": 51,
    "memberId": 5,
    "type": "재등록상담",
    "status": "완료",
    "result": "등록",
    "consultedAt": "2026-04-17T14:00:00Z"
  },
  "message": "상담이 등록되었습니다"
}
```

---

### 7.4 PATCH /fc/consultations/{id}

상담 수정.

- **역할**: fc
- **인증**: Bearer Token

**요청**

```json
{
  "content": "3개월 연장 완료, 특별 할인 적용",
  "result": "등록",
  "nextAction": null
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 51,
    "content": "3개월 연장 완료, 특별 할인 적용",
    "result": "등록"
  },
  "message": "상담이 수정되었습니다"
}
```

---

### 7.5 DELETE /fc/consultations/{id}

상담 삭제.

- **역할**: fc
- **인증**: Bearer Token

**응답 (200)**

```json
{
  "success": true,
  "data": null,
  "message": "상담이 삭제되었습니다"
}
```

---

### 7.6 GET /fc/members

FC 담당 회원 목록.

- **역할**: fc
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('members')
  .select('id, name, phone, status, membershipExpiry, lastVisitAt, mileage')
  .eq('staffId', staffId)
  .is('deletedAt', null)
  .order('name', { ascending: true });
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| search | string | N | 이름/전화번호 검색 |
| status | string | N | 회원 상태 필터 |

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "이영희",
      "phone": "010-5555-6666",
      "status": "ACTIVE",
      "membershipExpiry": "2026-05-15",
      "lastVisitAt": "2026-04-16T18:00:00Z",
      "mileage": 8000,
      "daysUntilExpiry": 28
    }
  ]
}
```

---

### 7.7 GET /fc/members/{id}

FC 담당 회원 상세.

- **역할**: fc
- **인증**: Bearer Token

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "이영희",
    "phone": "010-5555-6666",
    "gender": "F",
    "status": "ACTIVE",
    "membershipType": "헬스 6개월",
    "membershipExpiry": "2026-05-15",
    "registeredAt": "2025-11-15T00:00:00Z",
    "lastVisitAt": "2026-04-16T18:00:00Z",
    "mileage": 8000,
    "totalPayments": 720000,
    "consultationCount": 5,
    "lastConsultation": {
      "type": "재등록상담",
      "consultedAt": "2026-04-17T14:00:00Z",
      "result": "등록"
    }
  }
}
```

---

### 7.8 GET /fc/members/{id}/memos

회원 메모 목록 조회.

- **역할**: fc
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('member_memos')
  .select('*')
  .eq('memberId', memberId)
  .eq('authorId', staffId)
  .order('createdAt', { ascending: false });
```

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "memberId": 5,
      "content": "가격 민감도 높음. 할인 쿠폰 선호.",
      "category": "상담",
      "authorName": "박FC",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z"
    }
  ]
}
```

---

### 7.9 POST /fc/members/{id}/memos

회원 메모 등록.

- **역할**: fc
- **인증**: Bearer Token

**요청**

```json
{
  "content": "이번 달 내 3개월 연장 예정. 주말 이용 선호.",
  "category": "상담"
}
```

**응답 (201)**

```json
{
  "success": true,
  "data": {
    "id": 11,
    "memberId": 5,
    "content": "이번 달 내 3개월 연장 예정. 주말 이용 선호.",
    "category": "상담",
    "authorName": "박FC",
    "createdAt": "2026-04-17T15:00:00Z"
  },
  "message": "메모가 등록되었습니다"
}
```

---

### 7.10 PATCH /fc/members/{id}/memos/{memoId}

회원 메모 수정.

- **역할**: fc (본인 작성 메모만)
- **인증**: Bearer Token

**요청**

```json
{
  "content": "3개월 연장 완료. 주말 이용 선호. VIP 대응."
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 11,
    "content": "3개월 연장 완료. 주말 이용 선호. VIP 대응.",
    "updatedAt": "2026-04-17T16:00:00Z"
  },
  "message": "메모가 수정되었습니다"
}
```

---

### 7.11 DELETE /fc/members/{id}/memos/{memoId}

회원 메모 삭제.

- **역할**: fc (본인 작성 메모만)
- **인증**: Bearer Token

**응답 (200)**

```json
{
  "success": true,
  "data": null,
  "message": "메모가 삭제되었습니다"
}
```

---

### 7.12 GET /fc/members/expiring

만료 예정 회원 목록. 30일 이내 이용권 만료 회원.

- **역할**: fc
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const today = new Date().toISOString();

const { data } = await supabase
  .from('members')
  .select('id, name, phone, membershipType, membershipExpiry, lastVisitAt')
  .eq('staffId', staffId)
  .eq('status', 'ACTIVE')
  .gte('membershipExpiry', today)
  .lte('membershipExpiry', in30Days)
  .is('deletedAt', null)
  .order('membershipExpiry', { ascending: true });
```

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "이영희",
      "phone": "010-5555-6666",
      "membershipType": "헬스 6개월",
      "membershipExpiry": "2026-05-15",
      "daysUntilExpiry": 28,
      "lastConsultationType": "재등록상담",
      "lastConsultationDate": "2026-04-10"
    }
  ]
}
```

---

### 7.13 GET /fc/stats

FC 성과 / KPI.

- **역할**: fc
- **인증**: Bearer Token

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "period": "2026-04",
    "totalConsultations": 22,
    "completedConsultations": 18,
    "registrationRate": 55.6,
    "newRegistrations": 5,
    "renewals": 3,
    "totalSalesAmount": 2850000,
    "expiringMembers": 8,
    "contactedExpiring": 6,
    "avgConsultationsPerDay": 1.3
  }
}
```

---

## 8. 스태프 API (role: staff)

### 8.1 GET /staff/dashboard

스태프 홈 대시보드.

- **역할**: staff
- **인증**: Bearer Token

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "todayAttendance": {
      "total": 45,
      "currentlyIn": 12
    },
    "lockerStatus": {
      "total": 100,
      "inUse": 72,
      "available": 25,
      "maintenance": 3
    },
    "todayClasses": 8,
    "unreadNotifications": 1
  }
}
```

---

### 8.2 GET /staff/members

회원 조회 (읽기전용).

- **역할**: staff
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data, count } = await supabase
  .from('members')
  .select('id, name, phone, gender, status, membershipType, membershipExpiry', { count: 'exact' })
  .eq('branchId', branchId)
  .is('deletedAt', null)
  .order('name', { ascending: true })
  .range(from, to);
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| search | string | N | 이름/전화번호 검색 |
| page | number | N | 페이지 번호 |
| size | number | N | 페이지 크기 |

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "name": "김철수",
        "phone": "010-1234-5678",
        "gender": "M",
        "status": "ACTIVE",
        "membershipType": "헬스 6개월",
        "membershipExpiry": "2026-06-30"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 200,
      "totalPages": 10
    }
  }
}
```

---

### 8.3 GET /staff/members/{id}

회원 상세 (읽기전용).

- **역할**: staff
- **인증**: Bearer Token

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "김철수",
    "phone": "010-1234-5678",
    "gender": "M",
    "status": "ACTIVE",
    "membershipType": "헬스 6개월",
    "membershipExpiry": "2026-06-30",
    "registeredAt": "2025-06-01T00:00:00Z",
    "lastVisitAt": "2026-04-16T09:30:00Z",
    "lockerNumber": "A-023"
  }
}
```

> 스태프는 수정 API 호출 불가. PATCH/PUT/DELETE 요청 시 E403001 반환.

---

### 8.4 POST /staff/attendance

수동 출석 처리. 카운터에서 회원 대신 출석 처리.

- **역할**: staff
- **인증**: Bearer Token

**요청**

```json
{
  "member_id": 1,
  "type": "MANUAL"
}
```

**Supabase 쿼리**

```typescript
// 1. 회원 이용권 유효성 확인
const { data: member } = await supabase
  .from('members')
  .select('id, name, phone, status, membershipExpiry')
  .eq('id', memberId)
  .single();

// 2. 출석 기록 생성
const { data } = await supabase
  .from('attendance')
  .insert({
    memberId,
    memberName: member.name,
    checkInAt: new Date().toISOString(),
    type: 'MANUAL',
    checkInMethod: 'MANUAL',
    phone: member.phone,
    branchId,
  })
  .select()
  .single();
```

**응답 (201)**

```json
{
  "success": true,
  "data": {
    "id": 103,
    "memberId": 1,
    "memberName": "김철수",
    "checkInAt": "2026-04-17T09:30:00Z",
    "type": "MANUAL",
    "checkInMethod": "MANUAL"
  },
  "message": "출석이 처리되었습니다"
}
```

**에러**

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| E403400 | 403 | 오늘 이미 출석하셨습니다 | 중복 출석 |
| E422400 | 422 | 유효한 이용권이 없습니다 | 만료/미보유 |
| E404100 | 404 | 회원을 찾을 수 없습니다 | |

---

### 8.5 GET /staff/classes

수업 일정 조회 (읽기전용).

- **역할**: staff
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('classes')
  .select('*, instructor:users(name)')
  .eq('branchId', branchId)
  .gte('startAt', startDate)
  .lte('startAt', endDate)
  .order('startAt', { ascending: true });
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| start_date | string | Y | 조회 시작일 |
| end_date | string | Y | 조회 종료일 |

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "title": "PT - 김철수",
      "startAt": "2026-04-17T10:00:00Z",
      "endAt": "2026-04-17T10:50:00Z",
      "instructorName": "이강사",
      "capacity": 1,
      "currentCount": 1,
      "lessonStatus": "scheduled",
      "room": "PT룸 A"
    }
  ]
}
```

---

## 9. 공통 API

### 9.1 GET /notifications

알림 목록 조회.

- **역할**: 전체 (로그인 필요)
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data, count } = await supabase
  .from('notifications')
  .select('*', { count: 'exact' })
  .eq('userId', userId)
  .order('createdAt', { ascending: false })
  .range(from, to);
```

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| page | number | N | 페이지 번호 |
| size | number | N | 페이지 크기 |
| is_read | boolean | N | 읽음 여부 필터 |

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 500,
        "type": "RESERVATION",
        "title": "예약 확인",
        "body": "4/18(금) 10:00 모닝 요가 수업이 예약되었습니다.",
        "isRead": false,
        "data": { "scheduleId": 50 },
        "createdAt": "2026-04-17T08:00:00Z"
      },
      {
        "id": 499,
        "type": "ATTENDANCE",
        "title": "출석 완료",
        "body": "강남점 출석이 완료되었습니다.",
        "isRead": true,
        "data": null,
        "createdAt": "2026-04-16T09:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 30,
      "totalPages": 2
    },
    "unreadCount": 5
  }
}
```

> **type 목록**: `RESERVATION`, `ATTENDANCE`, `PAYMENT`, `ANNOUNCEMENT`, `EXPIRY_WARNING`, `DUAL_SIGN`, `SYSTEM`

---

### 9.2 PATCH /notifications/{id}/read

알림 읽음 처리.

- **역할**: 전체
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
await supabase
  .from('notifications')
  .update({ isRead: true, readAt: new Date().toISOString() })
  .eq('id', notificationId)
  .eq('userId', userId);
```

**응답 (200)**

```json
{
  "success": true,
  "data": { "id": 500, "isRead": true },
  "message": null
}
```

---

### 9.3 GET /announcements

공지사항 목록.

- **역할**: 전체 (로그인 필요)
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('notices')
  .select('*')
  .eq('branch_id', branchId)
  .eq('is_published', true)
  .order('is_pinned', { ascending: false })
  .order('created_at', { ascending: false });
```

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "title": "4월 센터 운영시간 변경 안내",
      "content": "4/20(일)은 시설 점검으로 인해 14:00에 조기 마감합니다.",
      "authorName": "관리자",
      "isPinned": true,
      "createdAt": "2026-04-15T09:00:00Z"
    }
  ]
}
```

---

### 9.4 GET /center-info

센터(지점) 정보 조회.

- **역할**: 전체 (로그인 필요)
- **인증**: Bearer Token

**Supabase 쿼리**

```typescript
const { data } = await supabase
  .from('branches')
  .select('*')
  .eq('id', branchId)
  .single();
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "강남점",
    "address": "서울시 강남구 테헤란로 123 4층",
    "phone": "02-1234-5678",
    "businessHours": {
      "weekday": "06:00 - 23:00",
      "saturday": "08:00 - 20:00",
      "sunday": "10:00 - 18:00",
      "holiday": "휴무"
    },
    "facilities": ["헬스장", "GX룸", "골프연습장", "샤워실", "사우나"],
    "mapUrl": "https://map.naver.com/...",
    "latitude": 37.5065,
    "longitude": 127.0536
  }
}
```

---

### 9.5 POST /inquiries

1:1 문의 등록.

- **역할**: 전체 (로그인 필요)
- **인증**: Bearer Token

**요청**

```json
{
  "category": "이용문의",
  "title": "운동복 대여 가능한가요?",
  "content": "운동복 대여 서비스가 있는지 궁금합니다."
}
```

**응답 (201)**

```json
{
  "success": true,
  "data": {
    "id": 30,
    "category": "이용문의",
    "title": "운동복 대여 가능한가요?",
    "status": "접수",
    "createdAt": "2026-04-17T16:00:00Z"
  },
  "message": "문의가 등록되었습니다"
}
```

> **category 옵션**: `이용문의`, `결제문의`, `시설문의`, `수업문의`, `기타`

---

### 9.6 GET /inquiries

내 문의 목록 조회.

- **역할**: 전체 (로그인 필요)
- **인증**: Bearer Token

**응답 (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 30,
      "category": "이용문의",
      "title": "운동복 대여 가능한가요?",
      "status": "답변완료",
      "createdAt": "2026-04-17T16:00:00Z",
      "answer": {
        "content": "네, 1층 카운터에서 대여 가능합니다. 1회 2,000원입니다.",
        "answeredBy": "관리자",
        "answeredAt": "2026-04-17T17:30:00Z"
      }
    }
  ]
}
```

> **status**: `접수`, `처리중`, `답변완료`

---

### 9.7 GET /app-version

앱 버전 체크. 강제/권장 업데이트 판단용.

- **역할**: 전체 (인증 불요)
- **인증**: 없음

**요청 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:----:|------|
| platform | string | Y | `ios` 또는 `android` |
| current_version | string | Y | 현재 앱 버전 (예: `2.0.0`) |

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "latest_version": "2.1.0",
    "minimum_version": "2.0.0",
    "force_update": false,
    "update_url": "https://apps.apple.com/app/fitgenie/id123456",
    "release_notes": "수업 예약 UX 개선, 버그 수정"
  }
}
```

---

### 9.8 PUT /settings

앱 설정 저장.

- **역할**: 전체 (로그인 필요)
- **인증**: Bearer Token

**요청**

```json
{
  "push_enabled": true,
  "push_reservation": true,
  "push_attendance": true,
  "push_payment": true,
  "push_announcement": true,
  "push_marketing": false,
  "language": "ko",
  "theme": "system"
}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "push_enabled": true,
    "push_reservation": true,
    "push_attendance": true,
    "push_payment": true,
    "push_announcement": true,
    "push_marketing": false,
    "language": "ko",
    "theme": "system"
  },
  "message": "설정이 저장되었습니다"
}
```

---

### 9.9 POST /push-token

푸시 토큰 등록/갱신.

- **역할**: 전체 (로그인 필요)
- **인증**: Bearer Token

**요청**

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "platform": "ios",
  "device_id": "uuid-device-001"
}
```

**Supabase 쿼리**

```typescript
await supabase
  .from('push_tokens')
  .upsert({
    userId,
    token: req.token,
    platform: req.platform,
    deviceId: req.device_id,
    updatedAt: new Date().toISOString(),
  }, { onConflict: 'userId,deviceId' });
```

**응답 (200)**

```json
{
  "success": true,
  "data": null,
  "message": "푸시 토큰이 등록되었습니다"
}
```

---

## 10. Supabase Realtime 구독

### 10.1 골프 쌍방서명 상태 실시간 감지

원격 서명 모드에서 강사/회원 양쪽이 서명 상태를 실시간으로 수신.

```typescript
// 강사 앱: 회원 서명 완료 대기
const channel = supabase
  .channel(`signature-${signatureId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'class_signatures',
    filter: `id=eq.${signatureId}`
  }, (payload) => {
    if (payload.new.status === 'completed') {
      // 회원 서명 완료 → 수업 완료 UI 전환
      showCompletionScreen(payload.new);
    }
  })
  .subscribe();

// 구독 해제
channel.unsubscribe();
```

### 10.2 알림 실시간 수신

```typescript
const channel = supabase
  .channel(`notifications-${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `userId=eq.${userId}`
  }, (payload) => {
    // 새 알림 수신 → 배지 업데이트 + 인앱 토스트
    updateNotificationBadge();
    showToast(payload.new.title, payload.new.body);
  })
  .subscribe();
```

### 10.3 수업 예약 현황 실시간 반영

```typescript
const channel = supabase
  .channel(`schedule-${scheduleId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'lesson_schedules',
    filter: `id=eq.${scheduleId}`
  }, (payload) => {
    // 예약 현황 업데이트 (정원/현재 인원)
    updateScheduleCount(payload.new.currentCount, payload.new.capacity);
  })
  .subscribe();
```

---

## 11. 에러 코드 체계

> 에러코드 네이밍: `E{HTTP상태코드}{일련번호}` (상세 기준은 `에러코드정의서.md` 참조)

### 전체 에러 코드 테이블 (앱 API 범위)

| 에러코드 | HTTP | 사용자 메시지 | 설명 |
|----------|------|--------------|------|
| **공통 (001~099)** | | | |
| E400001 | 400 | 필수 입력 항목을 확인해주세요 | 필수값 누락 |
| E400002 | 400 | 입력 형식이 올바르지 않습니다 | 형식 검증 실패 |
| E400003 | 400 | 허용된 범위를 초과했습니다 | 요청 제한 |
| E401001 | 401 | 연락처 또는 비밀번호가 올바르지 않습니다 | 인증 실패 |
| E401002 | 401 | 세션이 만료되었습니다. 다시 로그인해주세요 | JWT 만료 |
| E401003 | 401 | 인증 정보가 유효하지 않습니다 | JWT 무효 |
| E403001 | 403 | 접근 권한이 없습니다 | RBAC 차단 |
| E403002 | 403 | 계정이 잠겼습니다. 관리자에게 문의해주세요 | 5회 실패 잠금 |
| E403003 | 403 | 앱 연동이 필요합니다. 가입을 진행해주세요 | app_linked_at 없음 |
| E404001 | 404 | 요청한 데이터를 찾을 수 없습니다 | 범용 Not Found |
| E500001 | 500 | 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요 | 서버 내부 오류 |
| **회원 (100~199)** | | | |
| E400100 | 400 | 이름은 2글자 이상 입력해주세요 | name 검증 |
| E400103 | 400 | 올바른 전화번호를 입력해주세요 | phone 형식 |
| E400104 | 400 | 올바른 이메일 형식이 아닙니다 | email 형식 |
| E404100 | 404 | 회원 정보를 찾을 수 없습니다 | member 미존재 |
| E409100 | 409 | 이미 등록된 전화번호입니다 | phone 중복 |
| **매출/결제 (300~399)** | | | |
| E400300 | 400 | 결제 금액을 확인해주세요 | amount 불일치 |
| E402001 | 402 | 결제 처리에 실패했습니다. 다시 시도해주세요 | PG사 실패 |
| E402002 | 402 | 카드 승인에 실패했습니다. 다른 결제 수단을 이용해주세요 | 카드사 거절 |
| E404301 | 404 | 상품을 찾을 수 없습니다 | product 미존재 |
| E503002 | 503 | 결제 서비스에 일시적인 문제가 발생했습니다 | PG API 오류 |
| **출석 (400~499)** | | | |
| E403400 | 403 | 오늘 이미 출석하셨습니다 | 중복 체크인 |
| E403401 | 403 | 현재 이용 가능한 시간이 아닙니다 | 영업시간 외 |
| E422400 | 422 | 유효한 이용권이 없습니다 | 만료/미보유 |
| E422401 | 422 | 이용이 정지된 상태입니다. 관리자에게 문의해주세요 | SUSPENDED |
| **수업/예약 (500~599)** | | | |
| E400500 | 400 | 수업을 시작할 수 없는 상태입니다 | 상태 불일치 |
| E400501 | 400 | 예약 취소 마감시간이 지났습니다 | cancel_deadline 초과 |
| E400502 | 400 | 수업 정원이 초과되었습니다 | capacity 도달 |
| E404500 | 404 | 수업을 찾을 수 없습니다 | schedule 미존재 |
| E422500 | 422 | 수강 가능한 잔여 횟수가 없습니다 | sessions 소진 |
| **서명/계약 (800~899)** | | | |
| E400801 | 400 | 전자서명을 완료해주세요 | signature 누락 |
| E409800 | 409 | 이미 서명이 완료되었습니다 | 중복 서명 |
| **쿠폰/마일리지 (950~999)** | | | |
| E404950 | 404 | 쿠폰을 찾을 수 없습니다 | coupon 미존재 |
| E422950 | 422 | 유효기간이 만료된 쿠폰입니다 | validUntil 초과 |
| E422951 | 422 | 쿠폰이 모두 소진되었습니다 | 발행량 소진 |

---

## 12. 공통 응답 포맷 (요약)

```typescript
// TypeScript 타입 정의

/** 공통 API 응답 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
  errorCode?: string | null;
}

/** 페이지네이션 메타 */
interface Pagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

/** 페이지네이션 응답 */
interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/** API 에러 */
interface ApiError {
  success: false;
  data: null;
  message: string;
  errorCode: string;
}
```

### HTTP 상태코드별 클라이언트 처리

| HTTP | 처리 방식 | 설명 |
|------|-----------|------|
| 200 | 정상 처리 | 성공 |
| 201 | 정상 처리 | 리소스 생성 성공 |
| 400 | 인라인 에러 / 토스트 | 입력값 오류 |
| 401 | 토큰 갱신 시도 → 실패 시 로그인 리다이렉트 | 인증 만료 |
| 402 | 결제 실패 모달 | PG 오류 |
| 403 | 토스트 알림 | 권한 부족 |
| 404 | 토스트 알림 | 데이터 없음 |
| 409 | 토스트 + 안내 | 상태 충돌 |
| 422 | 모달 또는 토스트 | 비즈니스 로직 위반 |
| 500 | 전역 에러 토스트 | 서버 오류 |
| 503 | 전역 에러 + 재시도 버튼 | 외부 서비스 오류 |

---

## 13. Supabase 테이블 참조

> 앱 API에서 사용하는 주요 테이블 목록

| 테이블명 | 설명 | 주요 컬럼 |
|---------|------|-----------|
| `members` | 회원 | id, name, phone, gender, status, branchId, staffId, membershipExpiry |
| `branches` | 지점 | id, name, address, phone |
| `attendance` | 출석 | id, memberId, checkInAt, checkOutAt, type, checkInMethod, branchId |
| `sales` | 매출 | id, memberId, productId, amount, paymentMethod, status, saleDate |
| `products` | 상품 | id, name, category, price, duration, sessions, isActive, branchId |
| `lessons` | 수업 | id, name, type, instructorId, capacity, branchId |
| `lesson_schedules` | 수업 일정 | id, lessonId, startAt, endAt, capacity, currentCount, status |
| `lesson_bookings` | 수업 예약 | id, scheduleId, memberId, status, cancelReason |
| `lesson_counts` | 횟수 관리 | id, memberId, productId, totalCount, usedCount |
| `classes` | 수업(1:1/골프) | id, instructorId, member_id, lesson_status, signature_url, completed_at |
| `class_signatures` | 쌍방서명 | id, classId, instructorId, memberId, status, instructorSignatureUrl, memberSignatureUrl |
| `golf_certificates` | 레슨 확인서 | id, classId, signatureId, instructorId, memberId, lessonDate |
| `consultations` | 상담 | id, memberId, staffId, type, status, result, content |
| `member_body_info` | 신체정보 | id, memberId, measuredAt, height, weight |
| `member_evaluations` | 종합평가 | id, memberId, category, score, content |
| `exercise_programs` | 운동 프로그램 | id, branchId, name, category, level |
| `member_exercise_programs` | 프로그램 배정 | id, memberId, programId, assignedBy, status |
| `exercise_logs` | 운동 이력 | id, memberId, logDate, exerciseName, sets, reps, weightKg |
| `penalties` | 페널티 | id, memberId, type, deductCount, reason |
| `lockers` | 락커 | id, number, status, memberId, expiresAt |
| `notices` | 공지사항 | id, title, content, is_pinned, is_published, branch_id |
| `notifications` | 알림 | id, userId, type, title, body, isRead |
| `push_tokens` | 푸시 토큰 | userId, token, platform, deviceId |
| `member_memos` | 회원 메모 | id, memberId, authorId, content, category |
| `member_coupons` | 회원 쿠폰 | id, memberId, couponId, status, usedAt |
| `mileage_history` | 마일리지 이력 | id, memberId, type, amount, description |
| `staff` | 직원 | id, name, phone, role, branchId, isActive, staffStatus |
| `users` | 사용자(로그인) | id, username, password, role, branchId, tenantId |
| `audit_logs` | 감사 로그 | id, branchId, userId, action, targetType, targetId, detail |

---

## 변경 이력

| 버전 | 작성일 | 변경사항 |
|------|--------|----------|
| 2.0 | 2026-04-17 | 최초 작성 — 역할 기반 통합 앱 API 전체 (인증 7개 + 회원 13개 + 수업 2개 + 상품/결제 4개 + 트레이너 16개 + 골프강사 7개 + FC 13개 + 스태프 5개 + 공통 9개 + Realtime 3개) |
