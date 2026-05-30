-- D04 수업 출석/완료 확인 원장 보강
-- - SCR-C014 수업 출석/완료 확인
-- - DLG-C006 완료 확인/서명 누락 처리
-- - 수강권 차감 이력 단일화(lesson_count_logs)

CREATE TABLE IF NOT EXISTS public.lesson_count_logs (
  id serial PRIMARY KEY,
  "lessonCountId" integer NOT NULL,
  "memberId" integer NOT NULL,
  "scheduleId" integer,
  "bookingId" integer,
  "branchId" integer,
  "deductedAt" timestamptz NOT NULL DEFAULT now(),
  "lessonName" text,
  delta integer NOT NULL DEFAULT 1,
  reason text NOT NULL DEFAULT 'manual',
  note text,
  "processedBy" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_count_logs_lesson_count
  ON public.lesson_count_logs ("lessonCountId", "deductedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_count_logs_member
  ON public.lesson_count_logs ("memberId", "deductedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_count_logs_schedule
  ON public.lesson_count_logs ("scheduleId", "bookingId");

ALTER TABLE public.lesson_bookings
  ADD COLUMN IF NOT EXISTS "attendedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "noShowAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "completedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "pushSentAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "processedBy" text,
  ADD COLUMN IF NOT EXISTS "lessonCountId" integer,
  ADD COLUMN IF NOT EXISTS "lessonCountDelta" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "attendanceNote" text;

CREATE INDEX IF NOT EXISTS idx_lesson_bookings_completion
  ON public.lesson_bookings ("scheduleId", status, "completedAt");

CREATE OR REPLACE FUNCTION public.process_lesson_attendance(
  p_booking_id integer,
  p_action text,
  p_processed_by text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_deduct boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking public.lesson_bookings;
  v_class public.classes;
  v_count public.lesson_counts;
  v_delta integer := 0;
  v_now timestamptz := now();
  v_active_count integer := 0;
  v_done_count integer := 0;
BEGIN
  IF p_action NOT IN ('attended', 'completed', 'noshow', 'push') THEN
    RAISE EXCEPTION 'invalid_attendance_action';
  END IF;

  SELECT *
    INTO v_booking
    FROM public.lesson_bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  SELECT *
    INTO v_class
    FROM public.classes
   WHERE id = v_booking."scheduleId"
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  IF p_action IN ('completed', 'noshow') AND p_deduct AND COALESCE(v_booking."lessonCountDelta", 0) = 0 THEN
    SELECT *
      INTO v_count
      FROM public.lesson_counts
     WHERE "memberId" = v_booking."memberId"
       AND COALESCE("branchId", v_booking."branchId", v_class."branchId") = COALESCE(v_booking."branchId", v_class."branchId")
       AND COALESCE("usedCount", 0) < COALESCE("totalCount", 0)
       AND ("startDate" IS NULL OR "startDate" <= current_date)
       AND ("endDate" IS NULL OR "endDate" >= current_date)
     ORDER BY COALESCE("endDate", DATE '9999-12-31') ASC, id ASC
     LIMIT 1
     FOR UPDATE;

    IF FOUND THEN
      UPDATE public.lesson_counts
         SET "usedCount" = COALESCE("usedCount", 0) + 1,
             "updatedAt" = v_now
       WHERE id = v_count.id;

      INSERT INTO public.lesson_count_logs (
        "lessonCountId",
        "memberId",
        "scheduleId",
        "bookingId",
        "branchId",
        "deductedAt",
        "lessonName",
        delta,
        reason,
        note,
        "processedBy"
      )
      VALUES (
        v_count.id,
        v_booking."memberId",
        v_booking."scheduleId",
        v_booking.id,
        COALESCE(v_booking."branchId", v_class."branchId"),
        v_now,
        v_class.title,
        1,
        CASE WHEN p_action = 'noshow' THEN 'noshow' ELSE 'completion' END,
        p_note,
        p_processed_by
      );

      v_delta := 1;
    END IF;
  END IF;

  IF p_action = 'attended' THEN
    UPDATE public.lesson_bookings
       SET status = 'ATTENDED',
           "attendedAt" = COALESCE("attendedAt", v_now),
           "processedBy" = p_processed_by,
           "attendanceNote" = COALESCE(p_note, "attendanceNote"),
           "updatedAt" = v_now
     WHERE id = p_booking_id
     RETURNING * INTO v_booking;

    UPDATE public.classes
       SET lesson_status = CASE WHEN lesson_status = 'scheduled' THEN 'in_progress' ELSE lesson_status END,
           "updatedAt" = v_now
     WHERE id = v_class.id;
  ELSIF p_action = 'completed' THEN
    UPDATE public.lesson_bookings
       SET status = 'ATTENDED',
           "attendedAt" = COALESCE("attendedAt", v_now),
           "completedAt" = COALESCE("completedAt", v_now),
           "processedBy" = p_processed_by,
           "lessonCountId" = COALESCE("lessonCountId", v_count.id),
           "lessonCountDelta" = COALESCE("lessonCountDelta", 0) + v_delta,
           "attendanceNote" = COALESCE(p_note, "attendanceNote"),
           "updatedAt" = v_now
     WHERE id = p_booking_id
     RETURNING * INTO v_booking;
  ELSIF p_action = 'noshow' THEN
    UPDATE public.lesson_bookings
       SET status = 'NOSHOW',
           "noShowAt" = COALESCE("noShowAt", v_now),
           "processedBy" = p_processed_by,
           "lessonCountId" = COALESCE("lessonCountId", v_count.id),
           "lessonCountDelta" = COALESCE("lessonCountDelta", 0) + v_delta,
           "attendanceNote" = COALESCE(p_note, "attendanceNote"),
           "updatedAt" = v_now
     WHERE id = p_booking_id
     RETURNING * INTO v_booking;
  ELSE
    UPDATE public.lesson_bookings
       SET "pushSentAt" = v_now,
           "processedBy" = p_processed_by,
           "attendanceNote" = COALESCE(p_note, "attendanceNote"),
           "updatedAt" = v_now
     WHERE id = p_booking_id
     RETURNING * INTO v_booking;
  END IF;

  SELECT COUNT(*),
         COUNT(*) FILTER (
           WHERE status IN ('NOSHOW', 'CANCELLED')
              OR ("completedAt" IS NOT NULL AND status = 'ATTENDED')
         )
    INTO v_active_count, v_done_count
    FROM public.lesson_bookings
   WHERE "scheduleId" = v_class.id
     AND status NOT IN ('WAITLIST');

  IF v_active_count > 0 AND v_active_count = v_done_count THEN
    UPDATE public.classes
       SET lesson_status = 'completed',
           completed_at = COALESCE(completed_at, v_now),
           "updatedAt" = v_now
     WHERE id = v_class.id;
  ELSIF p_action = 'noshow' THEN
    UPDATE public.classes
       SET lesson_status = CASE WHEN lesson_status = 'scheduled' THEN 'in_progress' ELSE lesson_status END,
           "updatedAt" = v_now
     WHERE id = v_class.id;
  END IF;

  RETURN jsonb_build_object(
    'bookingId', v_booking.id,
    'status', v_booking.status,
    'deducted', v_delta,
    'lessonCountId', COALESCE(v_count.id, v_booking."lessonCountId"),
    'action', p_action
  );
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_count_logs TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.lesson_count_logs_id_seq TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_lesson_attendance(integer, text, text, text, boolean) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
