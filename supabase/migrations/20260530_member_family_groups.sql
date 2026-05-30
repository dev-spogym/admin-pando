create table if not exists public.member_family_groups (
  id bigserial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  name text not null,
  "representativeMemberId" integer references public.members(id) on delete set null,
  "representativeName" text not null,
  memo text,
  "createdAt" timestamp without time zone not null default now(),
  "updatedAt" timestamp without time zone not null default now()
);

create table if not exists public.member_family_members (
  id bigserial primary key,
  "groupId" bigint not null references public.member_family_groups(id) on delete cascade,
  "memberId" integer references public.members(id) on delete set null,
  "memberName" text not null,
  relationship text not null default '기타',
  "isRepresentative" boolean not null default false,
  "joinedAt" timestamp without time zone not null default now(),
  "createdAt" timestamp without time zone not null default now()
);

create index if not exists member_family_groups_branch_idx
  on public.member_family_groups ("branchId");

create index if not exists member_family_members_group_idx
  on public.member_family_members ("groupId");

grant select, insert, update, delete on table public.member_family_groups to anon, authenticated, service_role;
grant select, insert, update, delete on table public.member_family_members to anon, authenticated, service_role;
grant usage, select on sequence public.member_family_groups_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.member_family_members_id_seq to anon, authenticated, service_role;

notify pgrst, 'reload schema';
