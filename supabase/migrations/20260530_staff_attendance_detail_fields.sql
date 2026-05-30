alter table public.staff_attendance
  alter column "clockIn" drop not null;

alter table public.staff_attendance
  add column if not exists "date" date,
  add column if not exists "workMinutes" integer,
  add column if not exists "source" text not null default '키오스크',
  add column if not exists "corrections" jsonb not null default '[]'::jsonb,
  add column if not exists "memo" text;

update public.staff_attendance
set
  "date" = coalesce("date", "clockIn"::date, "createdAt"::date),
  "workMinutes" = coalesce("workMinutes", round(coalesce("workHours", 0) * 60)::integer),
  "memo" = coalesce("memo", "notes"),
  "status" = case "status"
    when 'normal' then '정상'
    when 'late' then '지각'
    when 'early_leave' then '조퇴'
    when 'absent' then '결근'
    else "status"
  end
where "date" is null
   or "workMinutes" is null
   or "memo" is null
   or "status" in ('normal', 'late', 'early_leave', 'absent');

alter table public.staff_attendance
  alter column "date" set not null;

create index if not exists staff_attendance_branch_date_idx
  on public.staff_attendance ("branchId", "date");

notify pgrst, 'reload schema';
