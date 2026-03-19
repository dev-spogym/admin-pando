-- ============================================================
-- OnFit GAP Phase 1 - DB 스키마 마이그레이션
-- 작성일: 2026-03-19
-- 내용: 기존 테이블 ALTER 3개 + 신규 테이블 12개
-- ============================================================

-- ============================================================
-- 1. 기존 테이블 ALTER
-- ============================================================

-- 1-A. members 테이블 확장
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_type VARCHAR(20) DEFAULT 'individual';
ALTER TABLE members ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50);
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS company_name VARCHAR(100);

-- 1-B. products 테이블 확장
ALTER TABLE products ADD COLUMN IF NOT EXISTS class_type VARCHAR(30);
ALTER TABLE products ADD COLUMN IF NOT EXISTS deduction_type VARCHAR(30);
ALTER TABLE products ADD COLUMN IF NOT EXISTS suspend_limit INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS daily_use_limit INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_group_id INT;

-- 1-C. classes 테이블 확장 (일정/스케줄)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS target_type VARCHAR(20) DEFAULT 'member';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_category VARCHAR(30);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';

-- ============================================================
-- 2. 신규 테이블 생성 (12개)
-- ============================================================

-- 2-1. 회원 신체정보
CREATE TABLE IF NOT EXISTS member_body_info (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id),
  height DECIMAL(5,1),
  weight DECIMAL(5,1),
  blood_pressure VARCHAR(20),
  heart_rate INT,
  notes TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_member_body_info_member ON member_body_info(member_id);
CREATE INDEX IF NOT EXISTS idx_member_body_info_branch ON member_body_info(branch_id);

-- 2-2. 회원 종합평가
CREATE TABLE IF NOT EXISTS member_evaluations (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id),
  staff_id INT NOT NULL,
  staff_name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  score INT,
  content TEXT NOT NULL,
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_member_evaluations_member ON member_evaluations(member_id);
CREATE INDEX IF NOT EXISTS idx_member_evaluations_branch ON member_evaluations(branch_id);

-- 2-3. 상담 이력
CREATE TABLE IF NOT EXISTS consultations (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id),
  staff_id INT NOT NULL,
  staff_name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'scheduled',
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultations_member ON consultations(member_id);
CREATE INDEX IF NOT EXISTS idx_consultations_branch ON consultations(branch_id);
CREATE INDEX IF NOT EXISTS idx_consultations_staff ON consultations(staff_id);

-- 2-4. 운동 프로그램 템플릿
CREATE TABLE IF NOT EXISTS exercise_programs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  difficulty VARCHAR(20),
  exercises JSONB,
  is_active BOOLEAN DEFAULT true,
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercise_programs_branch ON exercise_programs(branch_id);

-- 2-5. 회원별 운동 프로그램 배정
CREATE TABLE IF NOT EXISTS member_exercise_programs (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id),
  program_id INT NOT NULL REFERENCES exercise_programs(id),
  assigned_by INT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_member_exercise_programs_member ON member_exercise_programs(member_id);
CREATE INDEX IF NOT EXISTS idx_member_exercise_programs_program ON member_exercise_programs(program_id);
CREATE INDEX IF NOT EXISTS idx_member_exercise_programs_branch ON member_exercise_programs(branch_id);

-- 2-6. 운동 이력 기록
CREATE TABLE IF NOT EXISTS exercise_logs (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id),
  program_id INT,
  exercise_name VARCHAR(100) NOT NULL,
  sets INT,
  reps INT,
  weight DECIMAL(5,1),
  duration INT,
  distance DECIMAL(7,2),
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_member ON exercise_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_branch ON exercise_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_logged_at ON exercise_logs(logged_at);

-- 2-7. 그룹수업 템플릿
CREATE TABLE IF NOT EXISTS class_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  default_capacity INT DEFAULT 14,
  default_duration INT DEFAULT 50,
  description TEXT,
  color VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_class_templates_branch ON class_templates(branch_id);

-- 2-8. 직원 근태 기록
CREATE TABLE IF NOT EXISTS staff_attendance (
  id SERIAL PRIMARY KEY,
  staff_id INT NOT NULL,
  staff_name VARCHAR(100) NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'normal',
  work_hours DECIMAL(4,1),
  notes TEXT,
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff ON staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_branch ON staff_attendance(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_clock_in ON staff_attendance(clock_in);

-- 2-9. 할인 정책
CREATE TABLE IF NOT EXISTS discount_policies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  min_period INT,
  max_discount DECIMAL(10,0),
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discount_policies_branch ON discount_policies(branch_id);

-- 2-10. 선수익금
CREATE TABLE IF NOT EXISTS deferred_revenue (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL,
  member_id INT NOT NULL,
  member_name VARCHAR(100) NOT NULL,
  product_name VARCHAR(100),
  total_amount DECIMAL(12,0) NOT NULL,
  recognized_amount DECIMAL(12,0) DEFAULT 0,
  remaining_amount DECIMAL(12,0) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deferred_revenue_branch ON deferred_revenue(branch_id);
CREATE INDEX IF NOT EXISTS idx_deferred_revenue_member ON deferred_revenue(member_id);

-- 2-11. 공지사항
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  author_id INT NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ,
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notices_branch ON notices(branch_id);
CREATE INDEX IF NOT EXISTS idx_notices_pinned ON notices(is_pinned);

-- 2-12. 상품 분류
CREATE TABLE IF NOT EXISTS product_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  branch_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_groups_branch ON product_groups(branch_id);

-- FK: products.product_group_id -> product_groups.id
ALTER TABLE products ADD CONSTRAINT fk_products_product_group
  FOREIGN KEY (product_group_id) REFERENCES product_groups(id)
  ON DELETE SET NULL;

-- ============================================================
-- 3. RLS 정책 (branchId 기반 격리)
-- ============================================================

-- RLS 활성화
ALTER TABLE member_body_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_exercise_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deferred_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 인증된 사용자는 자기 지점 데이터만 접근
CREATE POLICY branch_isolation_member_body_info ON member_body_info
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_member_evaluations ON member_evaluations
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_consultations ON consultations
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_exercise_programs ON exercise_programs
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_member_exercise_programs ON member_exercise_programs
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_exercise_logs ON exercise_logs
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_class_templates ON class_templates
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_staff_attendance ON staff_attendance
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_discount_policies ON discount_policies
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_deferred_revenue ON deferred_revenue
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_notices ON notices
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
CREATE POLICY branch_isolation_product_groups ON product_groups
  FOR ALL USING (branch_id::text = current_setting('app.current_branch_id', true));
