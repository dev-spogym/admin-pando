-- D09 settings core persistence.
-- Stores branch-scoped settings that were previously mock/localStorage-only.

create table if not exists public.branch_settings (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  "updatedBy" text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint branch_settings_branch_key_unique unique ("branchId", key)
);

create index if not exists branch_settings_branch_idx
  on public.branch_settings ("branchId");

alter table public.notices
  add column if not exists "targetRoles" text[] not null default '{all}',
  add column if not exists "publishStart" timestamp with time zone,
  add column if not exists "publishEnd" timestamp with time zone;

alter table public.notices
  alter column "authorId" drop not null;

create table if not exists public.notice_read_receipts (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "noticeId" integer not null references public.notices(id) on delete cascade,
  "userId" integer,
  "userName" text,
  "readAt" timestamp with time zone not null default now(),
  constraint notice_read_receipts_unique unique ("noticeId", "userId")
);

create index if not exists notice_read_receipts_branch_notice_idx
  on public.notice_read_receipts ("branchId", "noticeId");

grant all on table public.branch_settings to anon, authenticated, service_role;
grant all on table public.notice_read_receipts to anon, authenticated, service_role;
grant usage, select on sequence public.branch_settings_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.notice_read_receipts_id_seq to anon, authenticated, service_role;

comment on table public.branch_settings is 'Branch-scoped JSON settings for D09 settings screens such as kiosk, IoT, attendance, automation, backup and role settings.';
comment on table public.notice_read_receipts is 'Notice read receipts for D09 SCR-085.';
