-- D04 수업관리 운영 화면 원장 보강
-- - SCR-C009 일정 요청 처리
-- - SCR-C013 수업 평가 피드백
-- - SCR-C012 대기열 수동 배정 원자 처리

CREATE TABLE IF NOT EXISTS public.schedule_requests (
  id serial PRIMARY KEY,
  "branchId" integer NOT NULL,
  "requestType" text NOT NULL CHECK ("requestType" IN ('change', 'cancel')),
  "memberId" integer,
  "memberName" text NOT NULL,
  "memberPhone" text,
  "scheduleId" integer,
  "className" text NOT NULL,
  "classTime" text NOT NULL,
  instructor text,
  "desiredTime" text,
  "cancelReason" text,
  "requestedAt" timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'alternative', 'awaiting', 'expired')),
  "alternativeDate" date,
  "alternativeTime" time,
  "alternativeMemo" text,
  "rejectReason" text,
  "processedBy" text,
  "processedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz
);

CREATE INDEX IF NOT EXISTS idx_schedule_requests_branch_status
  ON public.schedule_requests ("branchId", status, "requestedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_schedule_requests_schedule
  ON public.schedule_requests ("scheduleId");

CREATE TABLE IF NOT EXISTS public.class_feedbacks (
  id serial PRIMARY KEY,
  "branchId" integer NOT NULL,
  "scheduleId" integer,
  "memberId" integer,
  "memberName" text NOT NULL,
  anonymous boolean NOT NULL DEFAULT false,
  "className" text NOT NULL,
  "sessionType" text NOT NULL DEFAULT '기타',
  instructor text,
  "classDate" date,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz
);

CREATE INDEX IF NOT EXISTS idx_class_feedbacks_branch_created
  ON public.class_feedbacks ("branchId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_class_feedbacks_schedule
  ON public.class_feedbacks ("scheduleId");

CREATE OR REPLACE FUNCTION public.set_operational_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schedule_requests_updated_at ON public.schedule_requests;
CREATE TRIGGER trg_schedule_requests_updated_at
BEFORE UPDATE ON public.schedule_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_operational_updated_at();

DROP TRIGGER IF EXISTS trg_class_feedbacks_updated_at ON public.class_feedbacks;
CREATE TRIGGER trg_class_feedbacks_updated_at
BEFORE UPDATE ON public.class_feedbacks
FOR EACH ROW
EXECUTE FUNCTION public.set_operational_updated_at();

CREATE OR REPLACE FUNCTION public.promote_waitlist_booking(p_booking_id integer)
RETURNS public.lesson_bookings
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking public.lesson_bookings;
  v_class public.classes;
BEGIN
  SELECT *
    INTO v_booking
    FROM public.lesson_bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF COALESCE(v_booking.status, '') <> 'WAITLIST' THEN
    RAISE EXCEPTION 'booking_is_not_waitlist';
  END IF;

  SELECT *
    INTO v_class
    FROM public.classes
   WHERE id = v_booking."scheduleId"
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  IF COALESCE(v_class.booked, 0) >= COALESCE(v_class.capacity, 0) THEN
    RAISE EXCEPTION 'class_full';
  END IF;

  UPDATE public.lesson_bookings
     SET status = 'BOOKED'
   WHERE id = p_booking_id
   RETURNING * INTO v_booking;

  UPDATE public.classes
     SET booked = COALESCE(booked, 0) + 1,
         "updatedAt" = now()
   WHERE id = v_class.id;

  RETURN v_booking;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.schedule_requests TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.class_feedbacks TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.schedule_requests_id_seq TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.class_feedbacks_id_seq TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.promote_waitlist_booking(integer) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
