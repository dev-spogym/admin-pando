create table if not exists public.sales_forecast_targets (
  id bigserial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  period text not null check (period in ('다음 달', '다음 분기', '연간')),
  "targetMonth" text not null,
  "targetAmount" numeric(12, 2) not null default 0 check ("targetAmount" >= 0),
  "approvalStatus" text not null default 'APPROVED'
    check ("approvalStatus" in ('APPROVED', 'PENDING')),
  "requestedBy" text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  unique ("branchId", period, "targetMonth")
);

create index if not exists sales_forecast_targets_branch_period_idx
  on public.sales_forecast_targets ("branchId", period, "targetMonth");

grant select, insert, update, delete on table public.sales_forecast_targets to anon, authenticated, service_role;
grant usage, select on sequence public.sales_forecast_targets_id_seq to anon, authenticated, service_role;

comment on table public.sales_forecast_targets is '매출 예측 화면의 기간별 목표 매출 설정 이력.';
comment on column public.sales_forecast_targets."approvalStatus" is '1억원 이상 목표는 PENDING으로 저장해 본사 승인 대기 상태로 표시한다.';

notify pgrst, 'reload schema';
