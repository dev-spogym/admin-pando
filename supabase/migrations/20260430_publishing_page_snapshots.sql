create table if not exists public.publishing_page_snapshots (
  id bigserial primary key,
  "snapshotDate" date not null,
  "branchId" integer not null references public.branches(id) on delete cascade,
  route text not null,
  payload jsonb not null,
  "seedVersion" text not null default 'v1',
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint publishing_page_snapshots_unique unique ("snapshotDate", "branchId", route)
);

create index if not exists publishing_page_snapshots_route_branch_date_idx
  on public.publishing_page_snapshots (route, "branchId", "snapshotDate" desc);
