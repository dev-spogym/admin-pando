create table if not exists public.tax_invoices (
  id bigserial primary key,
  "invoiceNo" text not null unique,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "saleId" integer not null references public.sales(id) on delete cascade,
  "memberId" integer not null references public.members(id) on delete cascade,
  "memberName" text not null,
  recipient text not null,
  "bizNo" text not null,
  email text not null,
  "issueDate" date not null default current_date,
  "supplyAmount" numeric(12, 2) not null default 0 check ("supplyAmount" >= 0),
  "vatAmount" numeric(12, 2) not null default 0 check ("vatAmount" >= 0),
  "totalAmount" numeric(12, 2) not null default 0 check ("totalAmount" >= 0),
  status text not null default '발행 완료'
    check (status in ('발행 완료', '전송 완료', '오류', '취소 발행')),
  "emailSentAt" timestamp with time zone,
  memo text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create table if not exists public.tax_invoice_items (
  id bigserial primary key,
  "invoiceId" bigint not null references public.tax_invoices(id) on delete cascade,
  "productName" text not null,
  qty integer not null default 1 check (qty > 0),
  "unitPrice" numeric(12, 2) not null default 0 check ("unitPrice" >= 0),
  "supplyAmount" numeric(12, 2) not null default 0 check ("supplyAmount" >= 0),
  "vatAmount" numeric(12, 2) not null default 0 check ("vatAmount" >= 0),
  "taxFree" boolean not null default false,
  "createdAt" timestamp with time zone not null default now()
);

create unique index if not exists tax_invoices_sale_unique_idx
  on public.tax_invoices ("saleId")
  where status <> '취소 발행';

create index if not exists tax_invoices_branch_issue_idx
  on public.tax_invoices ("branchId", "issueDate" desc);

create index if not exists tax_invoice_items_invoice_idx
  on public.tax_invoice_items ("invoiceId");

grant select, insert, update, delete on table public.tax_invoices to anon, authenticated, service_role;
grant usage, select on sequence public.tax_invoices_id_seq to anon, authenticated, service_role;
grant select, insert, update, delete on table public.tax_invoice_items to anon, authenticated, service_role;
grant usage, select on sequence public.tax_invoice_items_id_seq to anon, authenticated, service_role;

comment on table public.tax_invoices is '법인·사업자 회원 대상 세금계산서 발행 이력.';
comment on table public.tax_invoice_items is '세금계산서 공급 품목.';

notify pgrst, 'reload schema';
