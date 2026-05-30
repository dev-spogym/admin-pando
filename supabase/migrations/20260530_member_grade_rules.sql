-- SCR-M009 회원 등급 기준/혜택 저장소
-- docs4 기준: 누적 결제 금액, 이용 기간, 방문 횟수 중 하나 또는 조합으로 등급 조건을 설정한다.

CREATE TABLE IF NOT EXISTS public.member_grade_settings (
  "branchId" integer PRIMARY KEY,
  "refreshCycle" text NOT NULL DEFAULT '월간'
    CHECK ("refreshCycle" IN ('월간', '분기', '연간')),
  "downgradeProtection" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_grade_rules (
  id serial PRIMARY KEY,
  "branchId" integer NOT NULL,
  "gradeCode" text NOT NULL,
  "gradeName" text NOT NULL,
  "sortOrder" integer NOT NULL,
  "colorClass" text,
  "minPaymentAmount" numeric(12, 0) NOT NULL DEFAULT 0
    CHECK ("minPaymentAmount" >= 0),
  "minUsageMonths" integer NOT NULL DEFAULT 0
    CHECK ("minUsageMonths" >= 0),
  "minVisitCount" integer NOT NULL DEFAULT 0
    CHECK ("minVisitCount" >= 0),
  "usePaymentAmount" boolean NOT NULL DEFAULT true,
  "useUsageMonths" boolean NOT NULL DEFAULT true,
  "useVisitCount" boolean NOT NULL DEFAULT true,
  "criteriaOperator" text NOT NULL DEFAULT 'AND'
    CHECK ("criteriaOperator" IN ('AND', 'OR')),
  "mileageRate" numeric(5, 2) NOT NULL DEFAULT 0
    CHECK ("mileageRate" >= 0 AND "mileageRate" <= 10),
  "discountRate" numeric(5, 2) NOT NULL DEFAULT 0
    CHECK ("discountRate" >= 0 AND "discountRate" <= 100),
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  "currentMemberCount" integer NOT NULL DEFAULT 0
    CHECK ("currentMemberCount" >= 0),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_grade_rules_branch_grade_key UNIQUE ("branchId", "gradeCode"),
  CONSTRAINT member_grade_rules_at_least_one_criterion CHECK (
    "usePaymentAmount" OR "useUsageMonths" OR "useVisitCount"
  )
);

CREATE INDEX IF NOT EXISTS member_grade_rules_branch_sort_idx
  ON public.member_grade_rules ("branchId", "sortOrder");

CREATE OR REPLACE FUNCTION public.set_member_grade_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_grade_settings_updated_at ON public.member_grade_settings;
CREATE TRIGGER trg_member_grade_settings_updated_at
BEFORE UPDATE ON public.member_grade_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_member_grade_updated_at();

DROP TRIGGER IF EXISTS trg_member_grade_rules_updated_at ON public.member_grade_rules;
CREATE TRIGGER trg_member_grade_rules_updated_at
BEFORE UPDATE ON public.member_grade_rules
FOR EACH ROW
EXECUTE FUNCTION public.set_member_grade_updated_at();

INSERT INTO public.member_grade_settings ("branchId", "refreshCycle", "downgradeProtection")
VALUES (1, '월간', true)
ON CONFLICT ("branchId") DO NOTHING;

INSERT INTO public.member_grade_rules (
  "branchId",
  "gradeCode",
  "gradeName",
  "sortOrder",
  "colorClass",
  "minPaymentAmount",
  "minUsageMonths",
  "minVisitCount",
  "usePaymentAmount",
  "useUsageMonths",
  "useVisitCount",
  "criteriaOperator",
  "mileageRate",
  "discountRate",
  benefits
)
VALUES
  (1, 'diamond', '다이아몬드', 1, 'bg-sky-100 text-sky-700 border-sky-200', 5000000, 12, 200, true, true, true, 'AND', 5, 15, '["전용 라커", "무료 PT 2회/월", "생일 혜택"]'::jsonb),
  (1, 'platinum', '플래티넘', 2, 'bg-purple-100 text-purple-700 border-purple-200', 3000000, 9, 100, true, true, true, 'AND', 3, 10, '["우선 예약", "10% 할인", "생일 혜택"]'::jsonb),
  (1, 'gold', '골드', 3, 'bg-yellow-100 text-yellow-700 border-yellow-200', 1500000, 6, 50, true, true, true, 'AND', 2, 5, '["5% 할인", "생일 혜택"]'::jsonb),
  (1, 'silver', '실버', 4, 'bg-gray-100 text-gray-600 border-gray-200', 500000, 3, 20, true, true, true, 'AND', 1, 0, '["생일 혜택"]'::jsonb),
  (1, 'bronze', '브론즈', 5, 'bg-orange-50 text-orange-600 border-orange-200', 0, 0, 0, true, true, true, 'AND', 0.5, 0, '["기본 서비스"]'::jsonb)
ON CONFLICT ("branchId", "gradeCode") DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.member_grade_settings TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.member_grade_rules TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.member_grade_rules_id_seq TO anon, authenticated, service_role;

COMMENT ON TABLE public.member_grade_settings IS 'SCR-M009 등급 관리 전역 설정. 지점별 갱신 주기와 강등 회피 정책을 저장한다.';
COMMENT ON TABLE public.member_grade_rules IS 'SCR-M009 등급별 산정 기준과 혜택. 누적 결제 금액, 이용 기간, 방문 횟수를 선택 또는 조합해 저장한다.';
COMMENT ON COLUMN public.member_grade_rules."criteriaOperator" IS 'AND=선택한 모든 기준 충족, OR=선택한 기준 중 하나 충족';

NOTIFY pgrst, 'reload schema';
