-- D07 payroll statement delivery persistence.

create table if not exists public.payroll_statement_deliveries (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "payrollId" integer not null references public.payroll(id) on delete cascade,
  "staffId" integer not null references public.staff(id) on delete cascade,
  "sendStatus" text not null default 'NOT_SENT'
    check ("sendStatus" in ('NOT_SENT', 'SENT', 'VOID')),
  "receiptStatus" text not null default 'NONE'
    check ("receiptStatus" in ('NONE', 'UNREAD', 'READ', 'UNAVAILABLE')),
  "sentAt" timestamp with time zone,
  "voidedAt" timestamp with time zone,
  history jsonb not null default '[]'::jsonb,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint payroll_statement_deliveries_payroll_unique unique ("payrollId")
);

create index if not exists payroll_statement_deliveries_branch_status_idx
  on public.payroll_statement_deliveries ("branchId", "sendStatus");

create index if not exists payroll_statement_deliveries_staff_idx
  on public.payroll_statement_deliveries ("staffId");

grant all on table public.payroll_statement_deliveries to anon, authenticated, service_role;
grant usage, select on sequence public.payroll_statement_deliveries_id_seq to anon, authenticated, service_role;

comment on table public.payroll_statement_deliveries is 'Payroll statement send, resend, void and delivery history for D07 SCR-065.';
