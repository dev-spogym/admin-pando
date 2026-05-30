create table if not exists public.member_merge_logs (
  id bigserial primary key,
  "primaryMemberId" integer not null references public.members(id) on delete cascade,
  "secondaryMemberId" integer not null,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "mergedBy" text,
  "mergedAt" timestamp without time zone not null default now(),
  detail jsonb not null default '{}'::jsonb
);

create index if not exists member_merge_logs_primary_idx
  on public.member_merge_logs ("primaryMemberId");

create index if not exists member_merge_logs_secondary_idx
  on public.member_merge_logs ("secondaryMemberId");

grant select, insert, update, delete on table public.member_merge_logs to anon, authenticated, service_role;
grant usage, select on sequence public.member_merge_logs_id_seq to anon, authenticated, service_role;

notify pgrst, 'reload schema';
