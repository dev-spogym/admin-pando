-- D04 수업 운영 정책 저장소
-- - DLG-C007 노쇼 정책
-- - DLG-C015 자동 페널티 정책

CREATE TABLE IF NOT EXISTS public.lesson_policy_settings (
  "branchId" integer PRIMARY KEY,
  "cancelDeadlineHours" integer NOT NULL DEFAULT 3 CHECK ("cancelDeadlineHours" BETWEEN 0 AND 168),
  "noShowDeductsSession" boolean NOT NULL DEFAULT true,
  "autoCompleteHours" integer NOT NULL DEFAULT 24 CHECK ("autoCompleteHours" BETWEEN 1 AND 720),
  "lateCancelPenalty" boolean NOT NULL DEFAULT true,
  "maxNoShowCount" integer NOT NULL DEFAULT 3 CHECK ("maxNoShowCount" BETWEEN 1 AND 50),
  "reservationAutoOpenHours" integer NOT NULL DEFAULT 48 CHECK ("reservationAutoOpenHours" BETWEEN 0 AND 720),
  "waitlistEnabled" boolean NOT NULL DEFAULT true,
  "waitlistAutoPromote" boolean NOT NULL DEFAULT true,
  "noshowAutoDeduct" boolean NOT NULL DEFAULT true,
  "noshowDeductCount" integer NOT NULL DEFAULT 1 CHECK ("noshowDeductCount" BETWEEN 1 AND 10),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_policy_settings
  ADD COLUMN IF NOT EXISTS "cancelDeadlineHours" integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "noShowDeductsSession" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "autoCompleteHours" integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS "lateCancelPenalty" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "maxNoShowCount" integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "reservationAutoOpenHours" integer NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS "waitlistEnabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "waitlistAutoPromote" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "noshowAutoDeduct" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "noshowDeductCount" integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_lesson_policy_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_policy_settings_updated_at ON public.lesson_policy_settings;
CREATE TRIGGER trg_lesson_policy_settings_updated_at
BEFORE UPDATE ON public.lesson_policy_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_lesson_policy_settings_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_policy_settings TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
