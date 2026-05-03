-- 예약 목록 화면 Supabase 원장 지원
-- - lesson_bookings를 예약 1건 원장으로 조회할 수 있도록 공통 컬럼과 인덱스를 보장한다.

CREATE TABLE IF NOT EXISTS public.lesson_bookings (
  id serial PRIMARY KEY,
  "scheduleId" integer,
  "memberId" integer,
  "memberName" text,
  status text NOT NULL DEFAULT 'BOOKED',
  "cancelReason" text DEFAULT NULL,
  "branchId" integer,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT NULL
);

ALTER TABLE public.lesson_bookings
  ADD COLUMN IF NOT EXISTS "scheduleId" integer,
  ADD COLUMN IF NOT EXISTS "memberId" integer,
  ADD COLUMN IF NOT EXISTS "memberName" text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'BOOKED',
  ADD COLUMN IF NOT EXISTS "cancelReason" text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "branchId" integer,
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT NULL;

UPDATE public.lesson_bookings lb
SET "branchId" = COALESCE(
  (SELECT c."branchId" FROM public.classes c WHERE c.id = lb."scheduleId" LIMIT 1),
  (SELECT m."branchId" FROM public.members m WHERE m.id = lb."memberId" LIMIT 1)
)
WHERE lb."branchId" IS NULL;

CREATE INDEX IF NOT EXISTS idx_lesson_bookings_branch_created
  ON public.lesson_bookings ("branchId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_bookings_schedule_status
  ON public.lesson_bookings ("scheduleId", status);

CREATE INDEX IF NOT EXISTS idx_lesson_bookings_member_created
  ON public.lesson_bookings ("memberId", "createdAt" DESC);

CREATE OR REPLACE FUNCTION public.set_lesson_bookings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_bookings_updated_at ON public.lesson_bookings;
CREATE TRIGGER trg_lesson_bookings_updated_at
BEFORE UPDATE ON public.lesson_bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_lesson_bookings_updated_at();

NOTIFY pgrst, 'reload schema';
