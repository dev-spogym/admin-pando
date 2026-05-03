-- 예약 목록 화면 확인용 demo seed
-- - 기존 수업/회원이 있고 lesson_bookings가 비어 있을 때만 예약 데이터를 생성한다.
-- - 실제 예약 데이터가 1건이라도 있으면 아무 작업도 하지 않는다.

WITH seed_classes AS (
  SELECT
    c.id,
    c."branchId",
    c.title,
    c."startTime",
    c.capacity,
    row_number() OVER (ORDER BY c."startTime", c.id) AS class_rank
  FROM public.classes c
  WHERE c."startTime" >= timestamp with time zone '2026-04-27 00:00:00+09'
    AND c."startTime" < timestamp with time zone '2026-05-11 00:00:00+09'
  ORDER BY c."startTime", c.id
  LIMIT 220
),
expanded AS (
  SELECT
    c.*,
    gs.n AS seat_no
  FROM seed_classes c
  CROSS JOIN LATERAL generate_series(1, LEAST(GREATEST(c.capacity, 1), 6)) AS gs(n)
),
matched_members AS (
  SELECT
    e.*,
    m.id AS "memberId",
    m.name AS "memberName",
    row_number() OVER (PARTITION BY e.id, m.id ORDER BY e.seat_no) AS duplicate_rank
  FROM expanded e
  JOIN LATERAL (
    SELECT m.id, m.name
    FROM public.members m
    WHERE m."branchId" = e."branchId"
      AND m."deletedAt" IS NULL
    ORDER BY md5(m.id::text || ':' || e.id::text || ':' || e.seat_no::text)
    LIMIT 1
  ) m ON true
),
deduped AS (
  SELECT *
  FROM matched_members
  WHERE duplicate_rank = 1
),
prepared AS (
  SELECT
    id AS "scheduleId",
    "memberId",
    "memberName",
    "branchId",
    CASE
      WHEN "startTime" >= timestamp with time zone '2026-05-04 00:00:00+09'
        THEN CASE abs(hashtext(id::text || ':' || "memberId"::text || ':' || seat_no::text)) % 8
          WHEN 0 THEN 'WAITLIST'
          WHEN 1 THEN 'CANCELLED'
          ELSE 'BOOKED'
        END
      ELSE CASE abs(hashtext(id::text || ':' || "memberId"::text || ':' || seat_no::text)) % 10
        WHEN 0 THEN 'NOSHOW'
        WHEN 1 THEN 'CANCELLED'
        WHEN 2 THEN 'WAITLIST'
        WHEN 3 THEN 'BOOKED'
        ELSE 'ATTENDED'
      END
    END AS status,
    "startTime" - ((1 + (abs(hashtext("memberId"::text || ':' || id::text)) % 5))::text || ' days')::interval AS "createdAt"
  FROM deduped
)
INSERT INTO public.lesson_bookings
  ("scheduleId", "memberId", "memberName", "branchId", status, "cancelReason", "createdAt")
SELECT
  "scheduleId",
  "memberId",
  "memberName",
  "branchId",
  status,
  CASE WHEN status = 'CANCELLED' THEN '테스트 예약 취소' ELSE NULL END,
  "createdAt"
FROM prepared
WHERE NOT EXISTS (SELECT 1 FROM public.lesson_bookings);

NOTIFY pgrst, 'reload schema';
