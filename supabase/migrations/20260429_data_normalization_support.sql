-- Data normalization support for publishing widgets.
-- Non-destructive: adds nullable refund linkage columns and creates golf bay tables.

alter table public.sales
  add column if not exists "originalSaleId" integer,
  add column if not exists "refundReason" text,
  add column if not exists "refundProcessedBy" text,
  add column if not exists "refundProcessedAt" timestamp with time zone;

do $$
begin
  alter table public.sales
    add constraint sales_original_sale_id_fkey
    foreign key ("originalSaleId") references public.sales(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create index if not exists sales_original_sale_id_idx
  on public.sales ("originalSaleId");

create table if not exists public.golf_bays (
  id bigserial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "bayNumber" integer not null,
  name text not null,
  status text not null default 'AVAILABLE'
    check (status in ('AVAILABLE', 'IN_USE', 'RESERVED', 'MAINTENANCE', 'CLOSED')),
  "currentMemberId" integer references public.members(id) on delete set null,
  "currentMemberName" text,
  "currentStaffName" text,
  "startedAt" timestamp with time zone,
  "expectedEndedAt" timestamp with time zone,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint golf_bays_branch_number_unique unique ("branchId", "bayNumber")
);

create index if not exists golf_bays_branch_status_idx
  on public.golf_bays ("branchId", status);

create table if not exists public.golf_bay_sessions (
  id bigserial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "bayId" bigint not null references public.golf_bays(id) on delete cascade,
  "memberId" integer references public.members(id) on delete set null,
  "memberName" text,
  "staffName" text,
  status text not null default 'IN_USE'
    check (status in ('RESERVED', 'IN_USE', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  "startedAt" timestamp with time zone,
  "endedAt" timestamp with time zone,
  "durationMinutes" integer,
  "sourceType" text,
  "sourceId" integer,
  note text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create index if not exists golf_bay_sessions_branch_started_idx
  on public.golf_bay_sessions ("branchId", "startedAt" desc);

create index if not exists golf_bay_sessions_bay_status_idx
  on public.golf_bay_sessions ("bayId", status);

create table if not exists public.golf_waitlist (
  id bigserial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "memberId" integer references public.members(id) on delete set null,
  "memberName" text not null,
  phone text,
  "preferredBayId" bigint references public.golf_bays(id) on delete set null,
  status text not null default 'WAITING'
    check (status in ('WAITING', 'CALLED', 'SEATED', 'CANCELLED')),
  "requestedAt" timestamp with time zone not null default now(),
  "calledAt" timestamp with time zone,
  "seatedAt" timestamp with time zone,
  note text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create index if not exists golf_waitlist_branch_status_requested_idx
  on public.golf_waitlist ("branchId", status, "requestedAt");

comment on column public.sales."originalSaleId" is 'Refund row link to the original completed sale. Required for reliable refund responsibility attribution.';
comment on table public.golf_bays is 'Golf bay master data for realtime bay status widgets.';
comment on table public.golf_bay_sessions is 'Golf bay usage/reservation sessions.';
comment on table public.golf_waitlist is 'Golf bay waiting queue.';
