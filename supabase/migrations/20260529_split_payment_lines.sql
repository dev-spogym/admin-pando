alter type public."PaymentMethod" add value if not exists 'MIXED';

create table if not exists public.sale_payment_lines (
  id bigserial primary key,
  "saleId" integer not null references public.sales(id) on delete cascade,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "memberId" integer not null references public.members(id) on delete cascade,
  "productId" integer references public.products(id) on delete set null,
  "productName" text not null,
  "itemKey" text,
  "lineType" text not null default 'PAYMENT'
    check ("lineType" in ('PAYMENT', 'REFUND')),
  method public."PaymentMethod" not null default 'CARD',
  amount numeric(12, 2) not null default 0
    check (amount >= 0),
  "refundedAmount" numeric(12, 2) not null default 0
    check ("refundedAmount" >= 0),
  "originalLineId" bigint references public.sale_payment_lines(id) on delete set null,
  "approvalNo" text,
  "terminalId" text,
  "externalTransactionId" text,
  "bankPayerName" text,
  "transferConfirmNo" text,
  "cashReceiptIssued" boolean not null default false,
  "cashReceiptType" text,
  "cashReceiptIdentifier" text,
  memo text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create index if not exists sale_payment_lines_sale_idx
  on public.sale_payment_lines ("saleId");

create index if not exists sale_payment_lines_original_line_idx
  on public.sale_payment_lines ("originalLineId");

create index if not exists sale_payment_lines_branch_member_idx
  on public.sale_payment_lines ("branchId", "memberId");

grant select, insert, update, delete on table public.sale_payment_lines to anon, authenticated, service_role;
grant usage, select on sequence public.sale_payment_lines_id_seq to anon, authenticated, service_role;

comment on table public.sale_payment_lines is '상품별 수납 행 및 환불 배분 행. sales는 내부 승인번호 1개 기준 결제그룹이고, 이 테이블은 상품별 카드/현금/계좌이체/포인트 행을 저장한다.';
comment on column public.sale_payment_lines."lineType" is 'PAYMENT=원수납 행, REFUND=환불 배분 행';
comment on column public.sale_payment_lines."originalLineId" is 'REFUND 행이 참조하는 원수납 PAYMENT 행';
