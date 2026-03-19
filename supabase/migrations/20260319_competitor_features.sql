-- ============================================================
-- 경쟁사 분석 기능 반영 마이그레이션
-- 날짜: 2026-03-19
-- 대상: products, classes, clothing, lesson_schedules, lesson_bookings, settings
-- ============================================================

-- ─── 1. products 테이블: 레슨북 상품관리 컬럼 추가 ──────────────

-- 이용 제한 설정 (요일/시간/주중주말 가격)
ALTER TABLE products ADD COLUMN IF NOT EXISTS usage_restrictions jsonb DEFAULT NULL;

-- 홀딩 가능 여부
ALTER TABLE products ADD COLUMN IF NOT EXISTS "holdingEnabled" boolean DEFAULT false;

-- 양도 가능 여부
ALTER TABLE products ADD COLUMN IF NOT EXISTS "transferEnabled" boolean DEFAULT false;

-- 포인트 적립 여부
ALTER TABLE products ADD COLUMN IF NOT EXISTS "pointAccrual" boolean DEFAULT true;

-- 판매유형 (KIOSK, COUNTER, ONLINE, ALL)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "salesChannel" text DEFAULT 'ALL';

-- 종목 (헬스, 필라테스, 요가, 골프 등)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "sportType" text DEFAULT NULL;

-- 상품 타입 (MEMBERSHIP, LESSON, RENTAL, GENERAL)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "productType" text DEFAULT 'GENERAL';

-- 현금가 / 카드가 분리
ALTER TABLE products ADD COLUMN IF NOT EXISTS "cashPrice" numeric DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "cardPrice" numeric DEFAULT NULL;

-- 총 횟수 (PT/GX 등)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "totalCount" integer DEFAULT NULL;

-- 키오스크 노출 여부
ALTER TABLE products ADD COLUMN IF NOT EXISTS "kioskVisible" boolean DEFAULT true;

-- 태그
ALTER TABLE products ADD COLUMN IF NOT EXISTS tag text DEFAULT NULL;

-- 수업 유형 (1:1, 그룹, 혼합)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "classType" text DEFAULT NULL;

-- 차감 방식 (횟수차감, 기간차감, 무제한)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "deductionType" text DEFAULT NULL;

-- 기간정지 제한 일수
ALTER TABLE products ADD COLUMN IF NOT EXISTS "suspendLimit" integer DEFAULT NULL;

-- 일사용 횟수 제한
ALTER TABLE products ADD COLUMN IF NOT EXISTS "dailyUseLimit" integer DEFAULT NULL;

-- 상품 분류 FK
ALTER TABLE products ADD COLUMN IF NOT EXISTS "productGroupId" integer DEFAULT NULL;


-- ─── 2. classes 테이블: 수업 상태/서명/노쇼 컬럼 ────────────────

-- 수업 상태 (scheduled, in_progress, completed, no_show, cancelled)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS lesson_status text DEFAULT 'scheduled';

-- 서명 URL (Supabase Storage)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS signature_url text DEFAULT NULL;

-- 서명 시각
ALTER TABLE classes ADD COLUMN IF NOT EXISTS signature_at timestamptz DEFAULT NULL;

-- 수업 완료 시각
ALTER TABLE classes ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL;

-- 취소 마감 시간 (시간)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS cancel_deadline_hours integer DEFAULT 3;

-- 회원 ID / 이름 (1:1 수업용)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS member_id integer DEFAULT NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS member_name text DEFAULT NULL;


-- ─── 3. clothing 테이블: QR 코드 컬럼 ──────────────────────────

ALTER TABLE clothing ADD COLUMN IF NOT EXISTS "qrCode" text DEFAULT NULL;


-- ─── 4. lesson_schedules 테이블: 예약 자동 오픈 상태 ────────────

-- status에 'PENDING' 상태 추가 (자동 오픈 전 대기)
-- 기존 OPEN 외에 PENDING 상태 사용
-- (enum이 아닌 text 컬럼이므로 별도 ALTER 불필요)


-- ─── 5. lesson_bookings 테이블: 대기열 상태 ────────────────────

-- status에 'WAITLIST' 상태 추가
-- 기존: BOOKED, ATTENDED, CANCELLED, NOSHOW
-- 추가: WAITLIST (대기열)
-- (text 컬럼이므로 별도 ALTER 불필요)

-- 취소 사유
ALTER TABLE lesson_bookings ADD COLUMN IF NOT EXISTS "cancelReason" text DEFAULT NULL;


-- ─── 6. settings 테이블: 정책/설정 저장 확인 ───────────────────

-- settings 테이블에 저장되는 key 목록 (참고용, 별도 DDL 불필요):
-- 'lesson_policy': 노쇼/취소 정책 (JSON)
--   {
--     cancelDeadlineHours: 3,
--     noShowDeductsSession: true,
--     autoCompleteHours: 24,
--     lateCancelPenalty: true,
--     maxNoShowCount: 3,
--     reservationAutoOpenHours: 48,
--     waitlistEnabled: true,
--     waitlistAutoPromote: true
--   }
--
-- 'favorites': 즐겨찾기 회원 ID 배열 [101, 102, ...]
-- 'iot_settings': IoT 기기 + 자동 전원 스케줄 (JSON)
-- 'promotions': 프로모션 목록 (JSON)
-- 'coupons': 쿠폰 목록 (JSON)


-- ─── 7. product_groups 테이블 확인 (동적 카테고리) ──────────────

-- 이미 존재하는 경우 무시
CREATE TABLE IF NOT EXISTS product_groups (
  id serial PRIMARY KEY,
  "branchId" integer NOT NULL,
  name text NOT NULL,
  "sortOrder" integer DEFAULT 0,
  "isActive" boolean DEFAULT true,
  "createdAt" timestamptz DEFAULT now()
);


-- ─── 8. 인덱스 추가 (성능) ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_branch_type ON products ("branchId", "productType");
CREATE INDEX IF NOT EXISTS idx_products_branch_category ON products ("branchId", category);
CREATE INDEX IF NOT EXISTS idx_classes_branch_status ON classes ("branchId", lesson_status);
CREATE INDEX IF NOT EXISTS idx_classes_endtime_status ON classes ("endTime", lesson_status);
CREATE INDEX IF NOT EXISTS idx_lesson_bookings_schedule_status ON lesson_bookings ("scheduleId", status);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_date ON attendance ("branchId", "checkInAt");


-- ============================================================
-- 실행 방법:
-- Supabase Dashboard > SQL Editor에서 위 SQL을 실행하거나
-- supabase db push 명령으로 적용
-- ============================================================
