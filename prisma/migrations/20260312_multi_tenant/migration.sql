-- 멀티테넌트 아키텍처 마이그레이션
-- 2026-03-12

-- ============================================================
-- 1. tenants 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  plan VARCHAR(20) NOT NULL DEFAULT 'BASIC',
  "maxBranches" INT NOT NULL DEFAULT 1,
  "ownerUserId" INT,
  "planExpiresAt" TIMESTAMP,
  "paymentMethod" VARCHAR(20),
  "overdueDays" INT NOT NULL DEFAULT 0,
  "taxInvoiceType" VARCHAR(20) NOT NULL DEFAULT 'HQ',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 기본 테넌트 생성 (기존 데이터 호환)
INSERT INTO tenants (id, name, plan) VALUES (1, '스포짐', 'STANDARD')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. branches 테이블 확장
-- ============================================================
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "tenantId" INT REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "isHq" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "branchCode" VARCHAR(5);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "branchStatus" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "maxMembers" INT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "maxStaff" INT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "maxLockers" INT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "pausedAt" DATE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "resumeAt" DATE;

-- 기존 지점에 tenantId 설정
UPDATE branches SET "tenantId" = 1 WHERE "tenantId" IS NULL;

-- ============================================================
-- 3. users 테이블 확장
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS "tenantId" INT REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "currentBranchId" INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "loginFailCount" INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;

-- branchId를 nullable로 변경 (슈퍼관리자용)
ALTER TABLE users ALTER COLUMN "branchId" DROP NOT NULL;

-- 기존 사용자에 tenantId 설정
UPDATE users SET "tenantId" = 1 WHERE "tenantId" IS NULL;

-- 첫 번째 ADMIN을 슈퍼관리자로 설정
UPDATE users SET "isSuperAdmin" = true WHERE role = 'ADMIN' AND id = (SELECT MIN(id) FROM users WHERE role = 'ADMIN');

-- ============================================================
-- 4. staff 테이블 확장
-- ============================================================
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "staffStatus" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "resignedAt" TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "resignReason" VARCHAR(200);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "resignScheduledAt" DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "previousEmployeeId" INT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "leaveStartAt" DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "leaveEndAt" DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "leaveReason" VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "loginFailCount" INT NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "transferredFromBranchId" INT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS "transferredAt" DATE;

-- ============================================================
-- 5. members 테이블 확장
-- ============================================================
ALTER TABLE members ADD COLUMN IF NOT EXISTS "homeBranchId" INT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "withdrawnAt" TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "withdrawReason" VARCHAR(200);
ALTER TABLE members ADD COLUMN IF NOT EXISTS "privacyMaskedAt" TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "previousMemberId" INT;

-- ============================================================
-- 6. sales 테이블 확장
-- ============================================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "assignedFcId" INT;

-- ============================================================
-- 7. audit_log 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  "tenantId" INT NOT NULL DEFAULT 1,
  "userId" INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  "targetType" VARCHAR(50),
  "targetId" INT,
  "fromBranchId" INT,
  "toBranchId" INT,
  "beforeValue" JSONB,
  "afterValue" JSONB,
  detail JSONB,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log("tenantId");
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log("userId");
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log("createdAt");

-- ============================================================
-- 8. member_transfer_log 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS member_transfer_log (
  id SERIAL PRIMARY KEY,
  "tenantId" INT NOT NULL DEFAULT 1,
  "memberId" INT NOT NULL,
  "fromBranchId" INT NOT NULL,
  "toBranchId" INT NOT NULL,
  "transferType" VARCHAR(20) NOT NULL,
  "approvedBy" INT NOT NULL,
  reason VARCHAR(200),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_transfer_tenant ON member_transfer_log("tenantId");
CREATE INDEX IF NOT EXISTS idx_member_transfer_member ON member_transfer_log("memberId");

-- ============================================================
-- 9. staff_transfer_log 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_transfer_log (
  id SERIAL PRIMARY KEY,
  "tenantId" INT NOT NULL DEFAULT 1,
  "staffId" INT NOT NULL,
  "fromBranchId" INT NOT NULL,
  "toBranchId" INT NOT NULL,
  "fromRole" VARCHAR(20) NOT NULL,
  "toRole" VARCHAR(20) NOT NULL,
  "approvedBy" INT NOT NULL,
  "effectiveDate" DATE NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_transfer_tenant ON staff_transfer_log("tenantId");
CREATE INDEX IF NOT EXISTS idx_staff_transfer_staff ON staff_transfer_log("staffId");

-- ============================================================
-- 10. staff_settlements 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_settlements (
  id SERIAL PRIMARY KEY,
  "tenantId" INT NOT NULL DEFAULT 1,
  "staffId" INT NOT NULL,
  "branchId" INT NOT NULL,
  "unpaidSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "unpaidCommission" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "severancePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "unusedLeavePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "advanceDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "approvedBy" INT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_settlement_tenant ON staff_settlements("tenantId");
CREATE INDEX IF NOT EXISTS idx_staff_settlement_staff ON staff_settlements("staffId");

-- ============================================================
-- 11. branch_closure_log 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS branch_closure_log (
  id SERIAL PRIMARY KEY,
  "tenantId" INT NOT NULL DEFAULT 1,
  "branchId" INT NOT NULL,
  "announcedAt" DATE NOT NULL,
  "closingDate" DATE NOT NULL,
  "totalMembers" INT NOT NULL DEFAULT 0,
  "transferredMembers" INT NOT NULL DEFAULT 0,
  "refundedMembers" INT NOT NULL DEFAULT 0,
  "totalStaff" INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  "createdBy" INT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branch_closure_tenant ON branch_closure_log("tenantId");

-- ============================================================
-- 12. subscriptions 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  "tenantId" INT NOT NULL,
  plan VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  "billingDate" DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_tenant ON subscriptions("tenantId");

-- ============================================================
-- 13. 추가 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches("tenantId");
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users("tenantId");
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff("staffStatus");
CREATE INDEX IF NOT EXISTS idx_members_home_branch ON members("homeBranchId");
