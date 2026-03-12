-- ============================================================
-- RLS (Row Level Security) 지점 데이터 격리 정책
-- ============================================================
-- 적용 대상: branchId 컬럼을 가진 모든 테이블
-- 적용 방식: 로그인한 사용자의 branchId와 행의 branchId를 비교
--
-- 적용 방법:
--   Supabase 대시보드 → SQL Editor에서 이 파일 전체를 실행하거나,
--   psql로 직접 실행:
--     psql $DATABASE_URL -f prisma/migrations/rls_branch_isolation.sql
--
-- 전제 조건:
--   1. Supabase Auth가 활성화되어 있어야 합니다.
--   2. "users" 테이블의 id 컬럼이 Supabase auth.users의 id와 연결되어 있어야 합니다.
--   3. 현재는 users.id가 Int(자동증가)이므로, auth.uid()와의 매핑이 필요합니다.
--      (추후 Supabase Auth 전환 시 users.id를 UUID로 변경 권장)
--
-- 주의:
--   - service_role 키를 사용하는 서버 사이드 작업은 RLS를 우회합니다.
--   - anon/authenticated 역할은 반드시 정책을 통과해야 합니다.
-- ============================================================

-- ============================================================
-- 헬퍼 함수: 현재 사용자의 branchId 조회
-- ============================================================
-- auth.uid()로 users 테이블에서 branchId를 가져오는 함수
-- 매 정책마다 서브쿼리를 반복하지 않도록 캐싱 함수로 정의
CREATE OR REPLACE FUNCTION auth.current_branch_id()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT "branchId"
  FROM "users"
  WHERE "id"::text = auth.uid()::text
  LIMIT 1
$$;

-- ============================================================
-- 1. users 테이블
-- ============================================================
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- service_role 우회 (관리자 백엔드 작업용)
CREATE POLICY "users_service_role_bypass" ON "users"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "users_branch_isolation_select" ON "users"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "users_branch_isolation_insert" ON "users"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "users_branch_isolation_update" ON "users"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "users_branch_isolation_delete" ON "users"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 2. members 테이블
-- ============================================================
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_service_role_bypass" ON "members"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "members_branch_isolation_select" ON "members"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "members_branch_isolation_insert" ON "members"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "members_branch_isolation_update" ON "members"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "members_branch_isolation_delete" ON "members"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 3. staff 테이블
-- ============================================================
ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_service_role_bypass" ON "staff"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "staff_branch_isolation_select" ON "staff"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "staff_branch_isolation_insert" ON "staff"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "staff_branch_isolation_update" ON "staff"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "staff_branch_isolation_delete" ON "staff"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 4. products 테이블
-- ============================================================
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_service_role_bypass" ON "products"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "products_branch_isolation_select" ON "products"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "products_branch_isolation_insert" ON "products"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "products_branch_isolation_update" ON "products"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "products_branch_isolation_delete" ON "products"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 5. sales 테이블
-- ============================================================
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_service_role_bypass" ON "sales"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "sales_branch_isolation_select" ON "sales"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "sales_branch_isolation_insert" ON "sales"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "sales_branch_isolation_update" ON "sales"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "sales_branch_isolation_delete" ON "sales"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 6. attendance 테이블
-- ============================================================
ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_service_role_bypass" ON "attendance"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "attendance_branch_isolation_select" ON "attendance"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "attendance_branch_isolation_insert" ON "attendance"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "attendance_branch_isolation_update" ON "attendance"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "attendance_branch_isolation_delete" ON "attendance"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 7. lockers 테이블
-- ============================================================
ALTER TABLE "lockers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lockers_service_role_bypass" ON "lockers"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "lockers_branch_isolation_select" ON "lockers"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "lockers_branch_isolation_insert" ON "lockers"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "lockers_branch_isolation_update" ON "lockers"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "lockers_branch_isolation_delete" ON "lockers"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 8. classes 테이블
-- ============================================================
ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_service_role_bypass" ON "classes"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "classes_branch_isolation_select" ON "classes"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "classes_branch_isolation_insert" ON "classes"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "classes_branch_isolation_update" ON "classes"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "classes_branch_isolation_delete" ON "classes"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 9. messages 테이블
-- ============================================================
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_service_role_bypass" ON "messages"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "messages_branch_isolation_select" ON "messages"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "messages_branch_isolation_insert" ON "messages"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "messages_branch_isolation_update" ON "messages"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "messages_branch_isolation_delete" ON "messages"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 10. coupons 테이블
-- ============================================================
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_service_role_bypass" ON "coupons"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "coupons_branch_isolation_select" ON "coupons"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "coupons_branch_isolation_insert" ON "coupons"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "coupons_branch_isolation_update" ON "coupons"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "coupons_branch_isolation_delete" ON "coupons"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 11. contracts 테이블
-- ============================================================
ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_service_role_bypass" ON "contracts"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "contracts_branch_isolation_select" ON "contracts"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "contracts_branch_isolation_insert" ON "contracts"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "contracts_branch_isolation_update" ON "contracts"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "contracts_branch_isolation_delete" ON "contracts"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- 12. settings 테이블
-- ============================================================
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_service_role_bypass" ON "settings"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "settings_branch_isolation_select" ON "settings"
  FOR SELECT USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "settings_branch_isolation_insert" ON "settings"
  FOR INSERT WITH CHECK (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "settings_branch_isolation_update" ON "settings"
  FOR UPDATE USING (
    "branchId" = auth.current_branch_id()
  );

CREATE POLICY "settings_branch_isolation_delete" ON "settings"
  FOR DELETE USING (
    "branchId" = auth.current_branch_id()
  );

-- ============================================================
-- branchId가 없는 테이블 처리 (연관 테이블)
-- body_compositions, member_memos, member_goals: members를 통해 간접 격리
-- payroll: staff를 통해 간접 격리
-- branches: 전체 지점 목록은 authenticated 사용자에게 읽기 허용
-- ============================================================

-- branches 테이블: 읽기는 허용, 쓰기는 service_role만
ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_service_role_bypass" ON "branches"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "branches_authenticated_select" ON "branches"
  FOR SELECT USING (auth.role() = 'authenticated');

-- body_compositions: 연결된 member의 branchId로 격리
ALTER TABLE "body_compositions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "body_compositions_service_role_bypass" ON "body_compositions"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "body_compositions_branch_isolation_select" ON "body_compositions"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "body_compositions"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "body_compositions_branch_isolation_insert" ON "body_compositions"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "body_compositions"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "body_compositions_branch_isolation_update" ON "body_compositions"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "body_compositions"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "body_compositions_branch_isolation_delete" ON "body_compositions"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "body_compositions"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

-- member_memos: 연결된 member의 branchId로 격리
ALTER TABLE "member_memos" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_memos_service_role_bypass" ON "member_memos"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "member_memos_branch_isolation_select" ON "member_memos"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "member_memos"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "member_memos_branch_isolation_insert" ON "member_memos"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "member_memos"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "member_memos_branch_isolation_update" ON "member_memos"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "member_memos"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "member_memos_branch_isolation_delete" ON "member_memos"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "member_memos"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

-- member_goals: 연결된 member의 branchId로 격리
ALTER TABLE "member_goals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_goals_service_role_bypass" ON "member_goals"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "member_goals_branch_isolation_select" ON "member_goals"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "member_goals"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "member_goals_branch_isolation_insert" ON "member_goals"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "member_goals"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "member_goals_branch_isolation_update" ON "member_goals"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "member_goals"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "member_goals_branch_isolation_delete" ON "member_goals"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "members"
      WHERE "members"."id" = "member_goals"."memberId"
        AND "members"."branchId" = auth.current_branch_id()
    )
  );

-- payroll: 연결된 staff의 branchId로 격리
ALTER TABLE "payroll" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_service_role_bypass" ON "payroll"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "payroll_branch_isolation_select" ON "payroll"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "staff"
      WHERE "staff"."id" = "payroll"."staffId"
        AND "staff"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "payroll_branch_isolation_insert" ON "payroll"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "staff"
      WHERE "staff"."id" = "payroll"."staffId"
        AND "staff"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "payroll_branch_isolation_update" ON "payroll"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "staff"
      WHERE "staff"."id" = "payroll"."staffId"
        AND "staff"."branchId" = auth.current_branch_id()
    )
  );

CREATE POLICY "payroll_branch_isolation_delete" ON "payroll"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "staff"
      WHERE "staff"."id" = "payroll"."staffId"
        AND "staff"."branchId" = auth.current_branch_id()
    )
  );

-- ============================================================
-- 완료
-- ============================================================
-- 적용 후 확인 쿼리:
--   SELECT tablename, policyname, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
