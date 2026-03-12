-- ============================================================
-- RLS 멀티테넌트 확장 정책
-- ============================================================
-- 기존 rls_branch_isolation.sql 위에 적용
-- 추가 사항:
--   1. 테넌트(본사) 격리 헬퍼 함수
--   2. 슈퍼관리자 전체 지점 접근 정책
--   3. 신규 멀티테넌트 테이블 RLS
--
-- 적용 순서:
--   1. rls_branch_isolation.sql (기존)
--   2. 20260312_multi_tenant/migration.sql (스키마)
--   3. 이 파일 (RLS 확장)
-- ============================================================

-- ============================================================
-- 헬퍼 함수: 현재 사용자의 tenantId 조회
-- ============================================================
CREATE OR REPLACE FUNCTION auth.current_tenant_id()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT "tenantId"
  FROM "users"
  WHERE "id"::text = auth.uid()::text
  LIMIT 1
$$;

-- ============================================================
-- 헬퍼 함수: 현재 사용자가 슈퍼관리자인지 확인
-- ============================================================
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE("isSuperAdmin", false)
  FROM "users"
  WHERE "id"::text = auth.uid()::text
  LIMIT 1
$$;

-- ============================================================
-- 기존 테이블 정책 업데이트: 슈퍼관리자 bypass 추가
-- 슈퍼관리자는 같은 테넌트의 모든 지점 데이터 접근 가능
-- ============================================================

-- users: 슈퍼관리자는 같은 테넌트의 모든 사용자 조회
CREATE POLICY "users_super_admin_select" ON "users"
  FOR SELECT USING (
    auth.is_super_admin() AND "tenantId" = auth.current_tenant_id()
  );

CREATE POLICY "users_super_admin_update" ON "users"
  FOR UPDATE USING (
    auth.is_super_admin() AND "tenantId" = auth.current_tenant_id()
  );

-- members: 슈퍼관리자는 같은 테넌트의 모든 회원 조회
CREATE POLICY "members_super_admin_select" ON "members"
  FOR SELECT USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "members"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

CREATE POLICY "members_super_admin_update" ON "members"
  FOR UPDATE USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "members"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

-- staff: 슈퍼관리자는 같은 테넌트의 모든 직원 조회
CREATE POLICY "staff_super_admin_select" ON "staff"
  FOR SELECT USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "staff"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

CREATE POLICY "staff_super_admin_update" ON "staff"
  FOR UPDATE USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "staff"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

-- sales: 슈퍼관리자는 같은 테넌트의 모든 매출 조회
CREATE POLICY "sales_super_admin_select" ON "sales"
  FOR SELECT USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "sales"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

-- products: 슈퍼관리자는 같은 테넌트의 모든 상품 조회
CREATE POLICY "products_super_admin_select" ON "products"
  FOR SELECT USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "products"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

-- lockers: 슈퍼관리자는 같은 테넌트의 모든 락커 조회
CREATE POLICY "lockers_super_admin_select" ON "lockers"
  FOR SELECT USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "lockers"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

-- attendance: 슈퍼관리자는 같은 테넌트의 모든 출석 조회
CREATE POLICY "attendance_super_admin_select" ON "attendance"
  FOR SELECT USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "attendance"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

-- classes: 슈퍼관리자는 같은 테넌트의 모든 수업 조회
CREATE POLICY "classes_super_admin_select" ON "classes"
  FOR SELECT USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "classes"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

-- settings: 슈퍼관리자는 같은 테넌트의 모든 설정 조회/수정
CREATE POLICY "settings_super_admin_select" ON "settings"
  FOR SELECT USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "settings"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

CREATE POLICY "settings_super_admin_update" ON "settings"
  FOR UPDATE USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "settings"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

-- branches: 테넌트 격리 (기존은 authenticated 전체 허용 → 테넌트 필터 추가)
-- 기존 정책 드롭 후 재생성
DROP POLICY IF EXISTS "branches_authenticated_select" ON "branches";

CREATE POLICY "branches_tenant_select" ON "branches"
  FOR SELECT USING (
    "tenantId" = auth.current_tenant_id()
  );

CREATE POLICY "branches_super_admin_update" ON "branches"
  FOR UPDATE USING (
    auth.is_super_admin() AND "tenantId" = auth.current_tenant_id()
  );

-- ============================================================
-- 신규 멀티테넌트 테이블 RLS
-- ============================================================

-- tenants: 슈퍼관리자만 자기 테넌트 조회
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_service_role_bypass" ON "tenants"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "tenants_select" ON "tenants"
  FOR SELECT USING (
    "id" = auth.current_tenant_id()
  );

-- audit_log: 테넌트 격리 + 슈퍼관리자/센터장만 조회
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_service_role_bypass" ON "audit_log"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 일반 사용자: 자기 지점 감사 로그만 조회
CREATE POLICY "audit_log_branch_select" ON "audit_log"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

-- 슈퍼관리자: 테넌트 전체 감사 로그 조회
CREATE POLICY "audit_log_super_admin_select" ON "audit_log"
  FOR SELECT USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "audit_log"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

-- 감사 로그 INSERT: 모든 인증된 사용자 허용 (기록은 제한하지 않음)
CREATE POLICY "audit_log_insert" ON "audit_log"
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- 감사 로그는 UPDATE/DELETE 불가 (immutable)
-- 정책 미생성 = 차단

-- member_transfer_log: 테넌트 격리
ALTER TABLE "member_transfer_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_transfer_log_service_role_bypass" ON "member_transfer_log"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "member_transfer_log_branch_select" ON "member_transfer_log"
  FOR SELECT USING (
    "fromBranchId" = auth.current_branch_id()
    OR "toBranchId" = auth.current_branch_id()
  );

CREATE POLICY "member_transfer_log_super_admin_select" ON "member_transfer_log"
  FOR SELECT USING (
    auth.is_super_admin()
  );

CREATE POLICY "member_transfer_log_insert" ON "member_transfer_log"
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- staff_transfer_log: 테넌트 격리
ALTER TABLE "staff_transfer_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_transfer_log_service_role_bypass" ON "staff_transfer_log"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "staff_transfer_log_branch_select" ON "staff_transfer_log"
  FOR SELECT USING (
    "fromBranchId" = auth.current_branch_id()
    OR "toBranchId" = auth.current_branch_id()
  );

CREATE POLICY "staff_transfer_log_super_admin_select" ON "staff_transfer_log"
  FOR SELECT USING (
    auth.is_super_admin()
  );

CREATE POLICY "staff_transfer_log_insert" ON "staff_transfer_log"
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- staff_settlements: 지점 격리 (staff 연결)
ALTER TABLE "staff_settlements" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_settlements_service_role_bypass" ON "staff_settlements"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "staff_settlements_branch_select" ON "staff_settlements"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "staff_settlements_super_admin_select" ON "staff_settlements"
  FOR SELECT USING (
    auth.is_super_admin() AND EXISTS (
      SELECT 1 FROM "branches"
      WHERE "branches"."id" = "staff_settlements"."branchId"
        AND "branches"."tenantId" = auth.current_tenant_id()
    )
  );

CREATE POLICY "staff_settlements_insert" ON "staff_settlements"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id() OR auth.is_super_admin()
  );

CREATE POLICY "staff_settlements_update" ON "staff_settlements"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id() OR auth.is_super_admin()
  );

-- branch_closure_log: 슈퍼관리자만
ALTER TABLE "branch_closure_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_closure_log_service_role_bypass" ON "branch_closure_log"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "branch_closure_log_super_admin_select" ON "branch_closure_log"
  FOR SELECT USING (
    auth.is_super_admin()
  );

CREATE POLICY "branch_closure_log_super_admin_insert" ON "branch_closure_log"
  FOR INSERT WITH CHECK (
    auth.is_super_admin()
  );

CREATE POLICY "branch_closure_log_super_admin_update" ON "branch_closure_log"
  FOR UPDATE USING (
    auth.is_super_admin()
  );

-- subscriptions: 슈퍼관리자만 자기 테넌트
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_service_role_bypass" ON "subscriptions"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "subscriptions_tenant_select" ON "subscriptions"
  FOR SELECT USING (
    "tenantId" = auth.current_tenant_id()
  );

CREATE POLICY "subscriptions_super_admin_update" ON "subscriptions"
  FOR UPDATE USING (
    auth.is_super_admin() AND "tenantId" = auth.current_tenant_id()
  );

-- ============================================================
-- 확인 쿼리
-- ============================================================
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
