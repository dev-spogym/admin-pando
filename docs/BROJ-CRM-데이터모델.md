# BROJ CRM 데이터 모델 분석 및 구현 계획

## 분석 기반
- Chrome Extension으로 crm.broj.co.kr 실시간 탐색
- 대시보드, 고객관리, 출석부, 마일리지내역, 캘린더, 락커, 메세지/쿠폰, 매출관리(통합매출내역), 상품관리(현장판매), 센터설정 확인
- 우측 퀵메뉴: 알림센터(뉴스피드), 일정관리, 방문회원, 원격제어

---

## 1. 신규 테이블 설계

### 1-1. news_feed (알림센터/뉴스피드)
```sql
CREATE TABLE news_feed (
  id SERIAL PRIMARY KEY,
  "branchId" INTEGER REFERENCES branches(id),
  "userId" INTEGER REFERENCES users(id),
  "userName" TEXT,
  type TEXT NOT NULL, -- 'CRM', 'SYSTEM', 'ALERT'
  action TEXT NOT NULL, -- 'LOCKER_MODIFY', 'LOCKER_RETRIEVE', 'MEMBER_CREATE', 'PAYMENT', etc.
  message TEXT NOT NULL,
  "targetType" TEXT, -- 'member', 'locker', 'product', 'payment'
  "targetId" INTEGER,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
```

### 1-2. lessons (수업 관리)
```sql
CREATE TABLE lessons (
  id SERIAL PRIMARY KEY,
  "branchId" INTEGER REFERENCES branches(id),
  name TEXT NOT NULL, -- '그룹필라테스', '1:1 PT' 등
  type TEXT NOT NULL, -- 'GROUP', 'PERSONAL', 'SEMI_PERSONAL'
  "instructorId" INTEGER REFERENCES users(id),
  "instructorName" TEXT,
  capacity INTEGER DEFAULT 1, -- 정원
  duration INTEGER DEFAULT 60, -- 분
  color TEXT, -- 캘린더 색상 코드
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
```

### 1-3. lesson_schedules (수업 일정)
```sql
CREATE TABLE lesson_schedules (
  id SERIAL PRIMARY KEY,
  "lessonId" INTEGER REFERENCES lessons(id),
  "branchId" INTEGER REFERENCES branches(id),
  "instructorId" INTEGER REFERENCES users(id),
  "startAt" TIMESTAMPTZ NOT NULL,
  "endAt" TIMESTAMPTZ NOT NULL,
  "currentCount" INTEGER DEFAULT 0, -- 현재 예약 수
  capacity INTEGER, -- 이 일정의 정원 (NULL이면 lesson 기본값)
  status TEXT DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'COMPLETED', 'CANCELLED'
  memo TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
```

### 1-4. lesson_bookings (수업 예약)
```sql
CREATE TABLE lesson_bookings (
  id SERIAL PRIMARY KEY,
  "scheduleId" INTEGER REFERENCES lesson_schedules(id),
  "memberId" INTEGER REFERENCES members(id),
  "memberName" TEXT,
  status TEXT DEFAULT 'BOOKED', -- 'BOOKED', 'ATTENDED', 'NOSHOW', 'CANCELLED'
  "bookedAt" TIMESTAMPTZ DEFAULT NOW(),
  "attendedAt" TIMESTAMPTZ,
  "cancelledAt" TIMESTAMPTZ,
  "cancelReason" TEXT
);
```

### 1-5. lesson_counts (횟수 관리 — 수강권 차감)
```sql
CREATE TABLE lesson_counts (
  id SERIAL PRIMARY KEY,
  "memberId" INTEGER REFERENCES members(id),
  "productId" INTEGER REFERENCES products(id),
  "totalCount" INTEGER NOT NULL, -- 총 횟수
  "usedCount" INTEGER DEFAULT 0, -- 사용 횟수
  "remainingCount" INTEGER GENERATED ALWAYS AS ("totalCount" - "usedCount") STORED,
  "startDate" DATE,
  "endDate" DATE,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'PAUSED'
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
```

### 1-6. penalties (페널티 관리)
```sql
CREATE TABLE penalties (
  id SERIAL PRIMARY KEY,
  "branchId" INTEGER REFERENCES branches(id),
  "memberId" INTEGER REFERENCES members(id),
  "memberName" TEXT,
  "scheduleId" INTEGER REFERENCES lesson_schedules(id),
  type TEXT NOT NULL, -- 'NOSHOW', 'LATE_CANCEL', 'LATE'
  "deductCount" INTEGER DEFAULT 1, -- 차감 횟수
  reason TEXT,
  "appliedAt" TIMESTAMPTZ DEFAULT NOW(),
  "appliedBy" INTEGER REFERENCES users(id)
);
```

### 1-7. refunds (환불 내역)
```sql
CREATE TABLE refunds (
  id SERIAL PRIMARY KEY,
  "saleId" INTEGER REFERENCES sales(id),
  "branchId" INTEGER REFERENCES branches(id),
  "memberId" INTEGER REFERENCES members(id),
  "memberName" TEXT,
  "productName" TEXT,
  "refundAmount" DECIMAL(12,2) NOT NULL,
  "refundMethod" TEXT, -- 'CASH', 'CARD', 'TRANSFER'
  reason TEXT,
  status TEXT DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'REJECTED'
  "processedBy" INTEGER REFERENCES users(id),
  "processedAt" TIMESTAMPTZ DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
```

### 1-8. unpaid (미수금 관리)
```sql
CREATE TABLE unpaid (
  id SERIAL PRIMARY KEY,
  "saleId" INTEGER REFERENCES sales(id),
  "branchId" INTEGER REFERENCES branches(id),
  "memberId" INTEGER REFERENCES members(id),
  "memberName" TEXT,
  "productName" TEXT,
  "unpaidAmount" DECIMAL(12,2) NOT NULL,
  "dueDate" DATE,
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PARTIAL', 'PAID', 'OVERDUE'
  memo TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
```

### 1-9. visit_logs (방문회원 — 우측 퀵메뉴)
```sql
CREATE TABLE visit_logs (
  id SERIAL PRIMARY KEY,
  "branchId" INTEGER REFERENCES branches(id),
  "memberId" INTEGER REFERENCES members(id),
  "memberName" TEXT,
  "checkInAt" TIMESTAMPTZ DEFAULT NOW(),
  "checkOutAt" TIMESTAMPTZ,
  method TEXT, -- 'KIOSK', 'QR', 'MANUAL', 'RFID'
  "gateId" TEXT -- 출입문 ID
);
```

---

## 2. 기존 테이블 확장

### 2-1. products 테이블 확장
```sql
-- 회원권/수강권/대여권/일반 상품 타입 분리
ALTER TABLE products ADD COLUMN IF NOT EXISTS "productType" TEXT DEFAULT 'MEMBERSHIP';
-- 'MEMBERSHIP' (회원권/기간제), 'LESSON' (수강권/횟수제), 'RENTAL' (대여권/락커), 'GENERAL' (일반/운동복 등)

ALTER TABLE products ADD COLUMN IF NOT EXISTS "totalCount" INTEGER; -- 횟수제 상품의 총 횟수
ALTER TABLE products ADD COLUMN IF NOT EXISTS "cashPrice" DECIMAL(12,2); -- 현금가
ALTER TABLE products ADD COLUMN IF NOT EXISTS "cardPrice" DECIMAL(12,2); -- 카드가
ALTER TABLE products ADD COLUMN IF NOT EXISTS "kioskVisible" BOOLEAN DEFAULT true; -- 키오스크 노출
ALTER TABLE products ADD COLUMN IF NOT EXISTS "multiBranch" BOOLEAN DEFAULT false; -- 다지점 이용 가능
ALTER TABLE products ADD COLUMN IF NOT EXISTS "sportType" TEXT; -- 종목 (헬스, 필라테스, 요가 등)
ALTER TABLE products ADD COLUMN IF NOT EXISTS tag TEXT; -- 태그
```

### 2-2. sales 테이블 확장
```sql
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'CARD';
-- 'CARD', 'CASH', 'TRANSFER', 'MILEAGE', 'MIXED'
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "cashAmount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "cardAmount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "unpaidAmount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "registrationType" TEXT; -- '신규등록', '재등록', '업그레이드'
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "processedBy" INTEGER; -- 결제 담당자 ID
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "processedByName" TEXT; -- 결제 담당자명
```

### 2-3. lockers 테이블 확장
```sql
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS "password" TEXT; -- 비밀번호
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS "isBroken" BOOLEAN DEFAULT false; -- 고장 여부
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS "lastActionType" TEXT; -- 'ASSIGN', 'MOVE', 'RETRIEVE', 'REPAIR'
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS "lastActionAt" TIMESTAMPTZ;
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS "lastActionBy" INTEGER;
```

### 2-4. attendance 테이블 확장
```sql
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS "userType" TEXT DEFAULT 'MEMBER'; -- 'MEMBER', 'STAFF', 'GUEST'
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS "checkType" TEXT DEFAULT 'IN'; -- 'IN', 'OUT'
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS "gateId" TEXT; -- 출입문
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS "isSuccess" BOOLEAN DEFAULT true; -- 출석 성공/실패
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS "failReason" TEXT; -- 실패 사유
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS "sourceBranchId" INTEGER; -- 타지점 출석인 경우 원래 지점
```

---

## 3. 신규 페이지 구현 목록

### 즉시 구현 (기존 코드 수정/확장)
1. **매출 분석 탭 추가** — Sales.tsx에 상품별/결제수단별/환불/미수금/미완료 탭
2. **환불 관리** — refunds 테이블 + RefundList 컴포넌트
3. **미수금 관리** — unpaid 테이블 + UnpaidList 페이지
4. **락커 액션 버튼** — 기록/이동/회수/고장 버튼 + 우측 상세패널
5. **회원 일괄 상태변경** — MemberList 벌크 액션
6. **만료 상품 숨기기** — MemberList 필터 추가
7. **뉴스피드/알림센터** — 우측 슬라이드 패널

### 신규 페이지
8. **수업 관리** — /lessons (CRUD + 강사배정 + 정원)
9. **횟수 관리** — /lesson-counts (차감 이력)
10. **페널티 관리** — /penalties
11. **수업 통계** — /lesson-stats
12. **방문회원 패널** — 우측 퀵메뉴 (오늘 방문 실시간)
13. **매출 통계** — /sales/stats (차트 + 분석)

---

## 4. 우측 퀵메뉴 구조

```
RightQuickPanel (고정 우측 세로 버튼)
├── 알림센터 → NewsFeed 슬라이드 패널
│   └── 타임라인: CRM 알림 (락커변경, 결제, 회원등록 등)
├── 일정관리 → SchedulePanel 슬라이드 패널
│   └── 오늘 수업 일정 리스트
├── 방문회원 → VisitPanel 슬라이드 패널
│   └── 오늘 출석 회원 실시간 리스트
└── 원격제어 → RemotePanel 슬라이드 패널
    └── 키오스크/출입문 원격 제어
```

---

## 5. 회원 상세 페이지 추가 필드 (추정)

BROJ CRM 고객관리에서 확인된 컬럼:
- No, 상태(활성/예정/임박/만료/홀딩/미등록), 이름, 성별, 생년월일, 나이, 연락처
- 보유 이용권 (상품명 + 기간 + 상태)
- 회원권/수강권/락커/운동복 탭별 목록

우리 members 테이블에 추가 필요:
```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS "age" INTEGER; -- 자동 계산 가능
ALTER TABLE members ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "memo" TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "referralSource" TEXT; -- 가입 경로
ALTER TABLE members ADD COLUMN IF NOT EXISTS "assignedTrainerId" INTEGER; -- 담당 트레이너
ALTER TABLE members ADD COLUMN IF NOT EXISTS "profileImageUrl" TEXT;
```
