-- D06 facility core persistence.
-- RFID cards and exercise rooms were previously local/mock only.

alter table public.lockers
  add column if not exists zone text,
  add column if not exists password text,
  add column if not exists memo text;

create table if not exists public.rfid_cards (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "cardNo" text not null,
  "memberId" integer references public.members(id) on delete set null,
  "memberName" text,
  "memberPhone" text,
  "userType" text check ("userType" in ('회원', '직원')),
  status text not null default '활성' check (status in ('활성', '분실', '해제')),
  "registeredAt" timestamp with time zone not null default now(),
  "issuedAt" timestamp with time zone,
  "lockerNo" text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint rfid_cards_branch_card_unique unique ("branchId", "cardNo")
);

create index if not exists rfid_cards_branch_status_idx
  on public.rfid_cards ("branchId", status);

create index if not exists rfid_cards_branch_member_idx
  on public.rfid_cards ("branchId", "memberId");

create table if not exists public.facility_rooms (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  name text not null,
  type text not null default 'GX' check (type in ('GX', 'PT', '스피닝', '필라테스', '기타')),
  capacity integer not null default 1 check (capacity > 0),
  status text not null default '운영중' check (status in ('운영중', '점검중', '고장', '미사용')),
  gate text,
  description text,
  slots jsonb not null default '[]'::jsonb,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create index if not exists facility_rooms_branch_type_idx
  on public.facility_rooms ("branchId", type);

create index if not exists facility_rooms_branch_status_idx
  on public.facility_rooms ("branchId", status);

grant all on table public.rfid_cards to anon, authenticated, service_role;
grant all on table public.facility_rooms to anon, authenticated, service_role;
grant usage, select on sequence public.rfid_cards_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.facility_rooms_id_seq to anon, authenticated, service_role;

comment on table public.rfid_cards is 'RFID wristband/card registration, user mapping, status and locker mapping for D06 SCR-052.';
comment on table public.facility_rooms is 'Exercise room master and operation status for D06 SCR-053.';
