-- KPI Center daily sample snapshots.
-- The preview screen reads these rows from Supabase. API seeds one row per board per day.

create table if not exists public.kpi_center_daily_snapshots (
  id bigserial primary key,
  "snapshotDate" date not null,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "boardKey" text not null check ("boardKey" in ('hq', 'branch', 'fc', 'trainer', 'operations')),
  content jsonb not null,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint kpi_center_daily_snapshots_unique unique ("snapshotDate", "branchId", "boardKey")
);

create index if not exists kpi_center_daily_snapshots_branch_date_idx
  on public.kpi_center_daily_snapshots ("branchId", "snapshotDate" desc);

comment on table public.kpi_center_daily_snapshots is 'Daily Supabase-backed seed snapshots for KPI Center preview boards.';
