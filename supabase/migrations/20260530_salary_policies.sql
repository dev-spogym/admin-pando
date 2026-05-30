create table if not exists public.salary_policies (
  id bigserial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  category text not null check (category in ('sales', 'lesson')),
  job text not null check (job in ('FC', 'PT', 'GX', '공통')),
  "payMethod" text not null check ("payMethod" in ('정률제', '고정급제', '시급제', '혼합제')),
  rank text not null,
  "baseSalary" numeric(12, 0) not null default 0,
  "lessonUnitPrice" numeric(12, 0) not null default 0,
  "lessonRate" numeric(5, 2) not null default 0,
  "salesCommission" numeric(5, 2) not null default 0,
  "reRegCommission" numeric(5, 2) not null default 0,
  "refundRule" text,
  scope text,
  "isActive" boolean not null default true,
  "createdAt" timestamp without time zone not null default now(),
  "updatedAt" timestamp without time zone not null default now()
);

create index if not exists salary_policies_branch_category_idx
  on public.salary_policies ("branchId", category, job);

grant select, insert, update, delete on table public.salary_policies to anon, authenticated, service_role;
grant usage, select on sequence public.salary_policies_id_seq to anon, authenticated, service_role;

insert into public.salary_policies
  ("branchId", category, job, "payMethod", rank, "baseSalary", "lessonUnitPrice", "lessonRate", "salesCommission", "reRegCommission", "refundRule", scope)
select *
from (
  values
    (1, 'lesson', 'PT', '혼합제', '트레이너', 1800000, 25000, 40, 5, 0, '환불 확정 시 해당 회차분 차감', '본점 / PT팀'),
    (1, 'lesson', 'PT', '정률제', '수석 트레이너', 0, 35000, 55, 8, 0, '환불 확정 시 차감 없음', '본점 / PT팀'),
    (1, 'sales', 'FC', '혼합제', 'FC 팀장', 2200000, 0, 0, 10, 15, '환불 확정 시 커미션 전액 차감', '본점 / FC팀'),
    (1, 'lesson', 'GX', '시급제', 'GX 강사', 0, 0, 0, 0, 0, '해당 없음', '본점 / GX팀')
) as seed("branchId", category, job, "payMethod", rank, "baseSalary", "lessonUnitPrice", "lessonRate", "salesCommission", "reRegCommission", "refundRule", scope)
where exists (select 1 from public.branches where id = 1)
  and not exists (select 1 from public.salary_policies where "branchId" = 1);

notify pgrst, 'reload schema';
