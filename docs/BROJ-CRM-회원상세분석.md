# BROJ CRM 회원 상세 페이지 분석

## 회원 상세 모달 구조

### 좌측 프로필 패널
| 필드명 | 설명 | 우리 현황 |
|--------|------|---------|
| 프로필 이미지 | 카메라 아이콘으로 업로드 | ✅ 있음 |
| 상태 배지 | 활성/만료/예정/임박/홀딩/미등록 | ✅ 있음 |
| 방문 기록 | "방문 기록 없음" / "최근 3/17" | ❌ 없음 |
| 이름 + (연락처 4자리) | 이혜진 (0712) | ✅ 있음 |
| 출석 체크 버튼 | 즉시 출석 처리 | ❌ 없음 (상세에서) |
| 상품 구매 버튼 | POS로 이동 | ❌ 없음 (상세에서) |
| 메시지 버튼 | 개별 메시지 전송 | ❌ 없음 (상세에서) |
| 더보기(...) 버튼 | 추가 액션 | ❌ 없음 |
| 성별 | 남성/여성 | ✅ 있음 |
| 생년월일 | YYYY-MM-DD | ✅ 있음 |
| 연락처 | 010-XXXX-XXXX | ✅ 있음 |
| 주소 | 전체 주소 | ✅ 있음 |
| 간단 주소 | 시/구 단위 | ❌ 없음 |
| **상담 담당자** | 직원명 | ❌ 없음 |
| **특이사항** | 메모 | ❌ 없음 |
| **방문경로** | 직원소개/인터넷/지인소개 등 | ❌ 없음 |
| **운동목적** | 다이어트/체력향상/재활 등 | ❌ 없음 |
| **광고성 수신** | 동의/거부 | ❌ 없음 |
| 구독플랜 | BROJ 자체 | - (해당없음) |
| BROJ 운톡 | BROJ 자체 | - (해당없음) |
| E-mail | 이메일 | ✅ 있음 |
| 쿠폰 | N개 (링크) | ✅ 있음 |
| 마일리지 | N점 (링크) | ✅ 있음 |
| 등록일 | YYYY-MM-DD (요일) | ✅ 있음 |

### 상단 탭 (9개)
| 탭명 | 설명 | 우리 현황 |
|------|------|---------|
| 대시보드 | 유효/만료 상품 + 결제통계 + 메모 | ⚠️ 부분 (상세는 있지만 대시보드 뷰 없음) |
| 상품내역 | 이용권/대여권 탭 + 상세 카드 | ⚠️ 부분 |
| **결제내역** | 누적결제/미수금/환불 통계 + 결제 테이블 | ❌ 없음 (회원별) |
| **예약내역** | 월별 캘린더 + SHOW/NOSHOW/미처리 + 예약취소 | ❌ 없음 |
| 출석내역 | 월별 캘린더 + 출석률/횟수/마지막출석 + 출석취소 | ⚠️ 부분 |
| **상세내역** | 홀딩/연장/양도/쿠폰/마일리지 서브탭 | ❌ 핵심 없음 (홀딩/연장/양도) |
| **로그기록(Beta)** | CRM 활동 이력 (감사로그 유사) | ⚠️ 감사로그는 있지만 회원별 필터 없음 |
| 계약서 | 계약서 목록 + 삭제 | ✅ 전자계약 있음 |
| 메모 | 회원별 메모 CRUD | ✅ 있음 |

### 상세내역 서브탭 (신규 필요)
| 서브탭 | 설명 | 구현 필요 |
|--------|------|---------|
| **홀딩** | 이용권 일시정지 (시작일/종료일/사유) | ✅ 필수 |
| **연장** | 이용권 기간 연장 (추가일수/사유) | ✅ 필수 |
| **양도** | 이용권 타 회원에게 양도 | ✅ 필수 |
| 쿠폰 | 보유 쿠폰 목록 | ✅ 있음 |
| 마일리지 | 마일리지 이력 | ✅ 있음 |

### 대시보드 탭 우측 패널
| 항목 | 설명 |
|------|------|
| 총 누적 결제 금액 | (누적 결제 건수: N) XXX원 |
| 미수금 | XXX원 |
| 회원권 | XXX원 |
| 수강권 | XXX원 |
| 운동복 | XXX원 |
| 락커 | XXX원 |
| 일반 | XXX원 |
| 메모 (N) | 메모 추가 + 자세히 보기 |

---

## 우리 members 테이블 추가 필요 컬럼
```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS "shortAddress" TEXT;        -- 간단 주소
ALTER TABLE members ADD COLUMN IF NOT EXISTS "counselorId" INTEGER;      -- 상담 담당자 ID
ALTER TABLE members ADD COLUMN IF NOT EXISTS "counselorName" TEXT;       -- 상담 담당자명
ALTER TABLE members ADD COLUMN IF NOT EXISTS "specialNote" TEXT;         -- 특이사항
ALTER TABLE members ADD COLUMN IF NOT EXISTS "visitSource" TEXT;         -- 방문경로
ALTER TABLE members ADD COLUMN IF NOT EXISTS "exercisePurpose" TEXT;     -- 운동목적
ALTER TABLE members ADD COLUMN IF NOT EXISTS "adConsent" BOOLEAN DEFAULT true; -- 광고성 수신 동의
ALTER TABLE members ADD COLUMN IF NOT EXISTS "lastVisitAt" TIMESTAMPTZ;  -- 마지막 방문일
```

## 신규 테이블: member_holdings (홀딩 이력)
```sql
CREATE TABLE IF NOT EXISTS member_holdings (
  id SERIAL PRIMARY KEY,
  "memberId" INTEGER NOT NULL,
  "productId" INTEGER,
  "productName" TEXT,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  reason TEXT,
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, CANCELLED
  "createdBy" INTEGER,
  "createdByName" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
```

## 신규 테이블: member_extensions (연장 이력)
```sql
CREATE TABLE IF NOT EXISTS member_extensions (
  id SERIAL PRIMARY KEY,
  "memberId" INTEGER NOT NULL,
  "productId" INTEGER,
  "productName" TEXT,
  "extraDays" INTEGER NOT NULL,
  "originalEndDate" DATE,
  "newEndDate" DATE,
  reason TEXT,
  "createdBy" INTEGER,
  "createdByName" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
```

## 신규 테이블: member_transfers (양도 이력)
```sql
CREATE TABLE IF NOT EXISTS member_transfers (
  id SERIAL PRIMARY KEY,
  "fromMemberId" INTEGER NOT NULL,
  "fromMemberName" TEXT,
  "toMemberId" INTEGER NOT NULL,
  "toMemberName" TEXT,
  "productId" INTEGER,
  "productName" TEXT,
  reason TEXT,
  "createdBy" INTEGER,
  "createdByName" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
```

## 신규 테이블: member_memos (회원 메모 — 기존에 없으면)
```sql
CREATE TABLE IF NOT EXISTS member_memos (
  id SERIAL PRIMARY KEY,
  "memberId" INTEGER NOT NULL,
  "branchId" INTEGER,
  content TEXT NOT NULL,
  "createdBy" INTEGER,
  "createdByName" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
```
