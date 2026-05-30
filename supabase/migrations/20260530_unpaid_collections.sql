create table if not exists public.unpaid_collections (
  id bigserial primary key,
  "saleId" integer not null references public.sales(id) on delete cascade,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "memberId" integer not null references public.members(id) on delete cascade,
  "internalApprovalNo" text not null,
  method public."PaymentMethod" not null,
  amount numeric(12, 2) not null check (amount > 0),
  "previousUnpaid" numeric(12, 2) not null default 0 check ("previousUnpaid" >= 0),
  "remainingUnpaid" numeric(12, 2) not null default 0 check ("remainingUnpaid" >= 0),
  "paidAt" timestamp with time zone not null default now(),
  "approvalNo" text,
  "terminalId" text,
  "externalTransactionId" text,
  "bankPayerName" text,
  "transferConfirmNo" text,
  "cashReceiptIssued" boolean not null default false,
  "cashReceiptType" text,
  "cashReceiptIdentifier" text,
  memo text,
  "processedBy" text,
  "createdAt" timestamp with time zone not null default now()
);

create index if not exists unpaid_collections_sale_idx
  on public.unpaid_collections ("saleId");

create index if not exists unpaid_collections_branch_member_idx
  on public.unpaid_collections ("branchId", "memberId");

create index if not exists unpaid_collections_paid_at_idx
  on public.unpaid_collections ("paidAt");

grant select, insert, update, delete on table public.unpaid_collections to anon, authenticated, service_role;
grant usage, select on sequence public.unpaid_collections_id_seq to anon, authenticated, service_role;

comment on table public.unpaid_collections is '미수금 납부 이력. 원 결제의 CRM 내부 승인번호를 유지하고, 납부 증빙과 납부 전후 미수 잔액을 기록한다.';
comment on column public.unpaid_collections."internalApprovalNo" is '원 결제의 CRM 내부 승인번호. 미수 납부 시 새 내부 승인번호를 만들지 않는다.';
comment on column public.unpaid_collections.method is '미수금 납부 수단: CARD/CASH/TRANSFER.';

create or replace function public.process_unpaid_collection(
  p_sale_id integer,
  p_branch_id integer,
  p_member_id integer,
  p_internal_approval_no text,
  p_method public."PaymentMethod",
  p_amount numeric,
  p_paid_at timestamp with time zone default now(),
  p_approval_no text default null,
  p_terminal_id text default null,
  p_external_transaction_id text default null,
  p_bank_payer_name text default null,
  p_transfer_confirm_no text default null,
  p_cash_receipt_issued boolean default false,
  p_cash_receipt_type text default null,
  p_cash_receipt_identifier text default null,
  p_memo text default null,
  p_processed_by text default null
)
returns table (
  "saleId" integer,
  "paymentLineId" bigint,
  "collectionId" bigint,
  "previousUnpaid" numeric,
  "remainingUnpaid" numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_previous_unpaid numeric;
  v_remaining_unpaid numeric;
  v_payment_line_id bigint;
  v_collection_id bigint;
  v_next_method public."PaymentMethod";
  v_memo_line text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception '미수금 납부액은 0원보다 커야 합니다.';
  end if;

  if nullif(trim(coalesce(p_internal_approval_no, '')), '') is null then
    raise exception '원 결제의 CRM 내부 승인번호가 필요합니다.';
  end if;

  if p_method = 'CARD'::public."PaymentMethod" and nullif(trim(coalesce(p_approval_no, '')), '') is null then
    raise exception '카드 납부는 카드 승인번호가 필요합니다.';
  end if;

  if p_method = 'TRANSFER'::public."PaymentMethod"
    and (
      nullif(trim(coalesce(p_bank_payer_name, '')), '') is null
      or nullif(trim(coalesce(p_transfer_confirm_no, '')), '') is null
    ) then
    raise exception '계좌이체 납부는 입금자명과 이체확인번호가 필요합니다.';
  end if;

  if coalesce(p_cash_receipt_issued, false)
    and nullif(trim(coalesce(p_cash_receipt_identifier, '')), '') is null then
    raise exception '현금영수증 처리 시 식별번호가 필요합니다.';
  end if;

  select *
    into v_sale
  from public.sales
  where id = p_sale_id
    and "branchId" = p_branch_id
    and "memberId" = p_member_id
  for update;

  if not found then
    raise exception '미수금 원 결제를 찾을 수 없습니다.';
  end if;

  v_previous_unpaid := coalesce(v_sale.unpaid, 0);

  if v_previous_unpaid <= 0 then
    raise exception '이미 완납된 결제입니다.';
  end if;

  if p_amount > v_previous_unpaid then
    raise exception '납부액은 현재 미수 잔액을 초과할 수 없습니다.';
  end if;

  v_remaining_unpaid := v_previous_unpaid - p_amount;

  insert into public.sale_payment_lines (
    "saleId",
    "branchId",
    "memberId",
    "productId",
    "productName",
    "itemKey",
    "lineType",
    method,
    amount,
    "refundedAmount",
    "approvalNo",
    "terminalId",
    "externalTransactionId",
    "bankPayerName",
    "transferConfirmNo",
    "cashReceiptIssued",
    "cashReceiptType",
    "cashReceiptIdentifier",
    memo,
    "createdAt",
    "updatedAt"
  )
  values (
    v_sale.id,
    v_sale."branchId",
    v_sale."memberId",
    v_sale."productId",
    coalesce(v_sale."productName", '미수금 납부'),
    concat(p_internal_approval_no, '-unpaid-', floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
    'PAYMENT',
    p_method,
    p_amount,
    0,
    nullif(trim(coalesce(p_approval_no, '')), ''),
    nullif(trim(coalesce(p_terminal_id, '')), ''),
    nullif(trim(coalesce(p_external_transaction_id, '')), ''),
    nullif(trim(coalesce(p_bank_payer_name, '')), ''),
    nullif(trim(coalesce(p_transfer_confirm_no, '')), ''),
    coalesce(p_cash_receipt_issued, false),
    case when coalesce(p_cash_receipt_issued, false) then p_cash_receipt_type else null end,
    case when coalesce(p_cash_receipt_issued, false) then nullif(trim(coalesce(p_cash_receipt_identifier, '')), '') else null end,
    concat(p_internal_approval_no, ' / 미수금 납부'),
    coalesce(p_paid_at, now()),
    now()
  )
  returning id into v_payment_line_id;

  insert into public.unpaid_collections (
    "saleId",
    "branchId",
    "memberId",
    "internalApprovalNo",
    method,
    amount,
    "previousUnpaid",
    "remainingUnpaid",
    "paidAt",
    "approvalNo",
    "terminalId",
    "externalTransactionId",
    "bankPayerName",
    "transferConfirmNo",
    "cashReceiptIssued",
    "cashReceiptType",
    "cashReceiptIdentifier",
    memo,
    "processedBy"
  )
  values (
    v_sale.id,
    v_sale."branchId",
    v_sale."memberId",
    p_internal_approval_no,
    p_method,
    p_amount,
    v_previous_unpaid,
    v_remaining_unpaid,
    coalesce(p_paid_at, now()),
    nullif(trim(coalesce(p_approval_no, '')), ''),
    nullif(trim(coalesce(p_terminal_id, '')), ''),
    nullif(trim(coalesce(p_external_transaction_id, '')), ''),
    nullif(trim(coalesce(p_bank_payer_name, '')), ''),
    nullif(trim(coalesce(p_transfer_confirm_no, '')), ''),
    coalesce(p_cash_receipt_issued, false),
    case when coalesce(p_cash_receipt_issued, false) then p_cash_receipt_type else null end,
    case when coalesce(p_cash_receipt_issued, false) then nullif(trim(coalesce(p_cash_receipt_identifier, '')), '') else null end,
    nullif(trim(coalesce(p_memo, '')), ''),
    nullif(trim(coalesce(p_processed_by, '')), '')
  )
  returning id into v_collection_id;

  if v_sale."paymentMethod" = p_method then
    v_next_method := p_method;
  else
    v_next_method := 'MIXED'::public."PaymentMethod";
  end if;

  v_memo_line := concat(
    '[미수금 납부] ',
    to_char(coalesce(p_paid_at, now()) at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'),
    ' / ',
    p_method::text,
    ' / ',
    to_char(p_amount, 'FM999,999,999,999'),
    '원 / 잔액 ',
    to_char(v_remaining_unpaid, 'FM999,999,999,999'),
    '원',
    case when nullif(trim(coalesce(p_memo, '')), '') is not null then concat(' / ', trim(p_memo)) else '' end
  );

  update public.sales
  set unpaid = v_remaining_unpaid,
      status = case
        when v_remaining_unpaid = 0 then 'COMPLETED'::public."SaleStatus"
        else 'UNPAID'::public."SaleStatus"
      end,
      card = coalesce(card, 0) + case when p_method = 'CARD'::public."PaymentMethod" then p_amount else 0 end,
      cash = coalesce(cash, 0) + case when p_method in ('CASH'::public."PaymentMethod", 'TRANSFER'::public."PaymentMethod") then p_amount else 0 end,
      "paymentMethod" = v_next_method,
      "receiptIssued" = coalesce("receiptIssued", false) or coalesce(p_cash_receipt_issued, false),
      memo = concat_ws(E'\n', nullif(memo, ''), v_memo_line),
      "updatedAt" = now()
  where id = v_sale.id;

  return query
  select v_sale.id, v_payment_line_id, v_collection_id, v_previous_unpaid, v_remaining_unpaid;
end;
$$;

grant execute on function public.process_unpaid_collection(
  integer,
  integer,
  integer,
  text,
  public."PaymentMethod",
  numeric,
  timestamp with time zone,
  text,
  text,
  text,
  text,
  text,
  boolean,
  text,
  text,
  text,
  text
) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
