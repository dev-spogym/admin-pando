create table if not exists public.installment_contracts (
  id bigserial primary key,
  "contractNo" text not null unique,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "memberId" integer not null references public.members(id) on delete cascade,
  "memberName" text not null,
  "productId" integer references public.products(id) on delete set null,
  "productName" text not null,
  source text not null default '직접 등록'
    check (source in ('현장 결제 연계', '미수금 전환', '직접 등록')),
  "sourceSaleId" integer references public.sales(id) on delete set null,
  "internalApprovalNo" text not null,
  "prepaidAmount" numeric(12, 2) not null default 0 check ("prepaidAmount" >= 0),
  "totalAmount" numeric(12, 2) not null check ("totalAmount" > 0),
  "roundCount" integer not null check ("roundCount" between 1 and 24),
  status text not null default '진행중'
    check (status in ('진행중', '완납', '미납', '취소')),
  "startDueDate" date not null,
  "refundInProgress" boolean not null default false,
  memo text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create table if not exists public.installment_rounds (
  id bigserial primary key,
  "contractId" bigint not null references public.installment_contracts(id) on delete cascade,
  "roundNo" integer not null check ("roundNo" > 0),
  "dueDate" date not null,
  amount numeric(12, 2) not null check (amount > 0),
  "paidAmount" numeric(12, 2) not null default 0 check ("paidAmount" >= 0),
  status text not null default '예정'
    check (status in ('예정', '완료', '미납')),
  "paidAt" timestamp with time zone,
  method public."PaymentMethod",
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
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  unique ("contractId", "roundNo")
);

create index if not exists installment_contracts_branch_member_idx
  on public.installment_contracts ("branchId", "memberId");

create index if not exists installment_contracts_source_sale_idx
  on public.installment_contracts ("sourceSaleId");

create index if not exists installment_rounds_contract_idx
  on public.installment_rounds ("contractId");

create index if not exists installment_rounds_due_status_idx
  on public.installment_rounds ("dueDate", status);

grant select, insert, update, delete on table public.installment_contracts to anon, authenticated, service_role;
grant usage, select on sequence public.installment_contracts_id_seq to anon, authenticated, service_role;
grant select, insert, update, delete on table public.installment_rounds to anon, authenticated, service_role;
grant usage, select on sequence public.installment_rounds_id_seq to anon, authenticated, service_role;

comment on table public.installment_contracts is '할부결제 계약. 선납금을 제외한 잔액 기준 정기 분납 계획을 저장한다.';
comment on column public.installment_contracts."internalApprovalNo" is '할부 계약을 추적하는 CRM 내부 승인번호. 원 결제 연계 시 원 결제 승인번호를 유지한다.';
comment on table public.installment_rounds is '할부계약 회차별 납입 예정/완료/미납 상태와 결제 증빙.';

create or replace function public.process_installment_round_payment(
  p_round_id bigint,
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
  "contractId" bigint,
  "roundId" bigint,
  "remainingAmount" numeric,
  "contractStatus" text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.installment_rounds%rowtype;
  v_contract public.installment_contracts%rowtype;
  v_remaining numeric;
  v_status text;
  v_line_id bigint;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception '납입액은 0원보다 커야 합니다.';
  end if;

  if p_method = 'CARD'::public."PaymentMethod" and nullif(trim(coalesce(p_approval_no, '')), '') is null then
    raise exception '카드 납입은 카드 승인번호가 필요합니다.';
  end if;

  if p_method = 'TRANSFER'::public."PaymentMethod"
    and (
      nullif(trim(coalesce(p_bank_payer_name, '')), '') is null
      or nullif(trim(coalesce(p_transfer_confirm_no, '')), '') is null
    ) then
    raise exception '계좌이체 납입은 입금자명과 이체확인번호가 필요합니다.';
  end if;

  if coalesce(p_cash_receipt_issued, false)
    and nullif(trim(coalesce(p_cash_receipt_identifier, '')), '') is null then
    raise exception '현금영수증 처리 시 식별번호가 필요합니다.';
  end if;

  select *
    into v_round
  from public.installment_rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception '할부 회차를 찾을 수 없습니다.';
  end if;

  select *
    into v_contract
  from public.installment_contracts
  where id = v_round."contractId"
  for update;

  if not found then
    raise exception '할부 계약을 찾을 수 없습니다.';
  end if;

  if v_contract."refundInProgress" then
    raise exception '환불 진행 중인 계약은 납입 처리할 수 없습니다.';
  end if;

  if v_contract.status = '취소' then
    raise exception '취소된 할부 계약입니다.';
  end if;

  if v_round.status = '완료' then
    raise exception '이미 납입 완료된 회차입니다.';
  end if;

  if p_amount <> v_round.amount then
    raise exception '납입액은 회차 금액과 일치해야 합니다.';
  end if;

  update public.installment_rounds
  set "paidAmount" = p_amount,
      status = '완료',
      "paidAt" = coalesce(p_paid_at, now()),
      method = p_method,
      "approvalNo" = nullif(trim(coalesce(p_approval_no, '')), ''),
      "terminalId" = nullif(trim(coalesce(p_terminal_id, '')), ''),
      "externalTransactionId" = nullif(trim(coalesce(p_external_transaction_id, '')), ''),
      "bankPayerName" = nullif(trim(coalesce(p_bank_payer_name, '')), ''),
      "transferConfirmNo" = nullif(trim(coalesce(p_transfer_confirm_no, '')), ''),
      "cashReceiptIssued" = coalesce(p_cash_receipt_issued, false),
      "cashReceiptType" = case when coalesce(p_cash_receipt_issued, false) then p_cash_receipt_type else null end,
      "cashReceiptIdentifier" = case when coalesce(p_cash_receipt_issued, false) then nullif(trim(coalesce(p_cash_receipt_identifier, '')), '') else null end,
      memo = nullif(trim(coalesce(p_memo, '')), ''),
      "processedBy" = nullif(trim(coalesce(p_processed_by, '')), ''),
      "updatedAt" = now()
  where id = v_round.id;

  if v_contract."sourceSaleId" is not null then
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
      v_contract."sourceSaleId",
      v_contract."branchId",
      v_contract."memberId",
      v_contract."productId",
      v_contract."productName",
      concat(v_contract."internalApprovalNo", '-installment-', v_round."roundNo"),
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
      concat(v_contract."internalApprovalNo", ' / 할부 ', v_round."roundNo", '회차 납입'),
      coalesce(p_paid_at, now()),
      now()
    )
    returning id into v_line_id;

    update public.sales
    set unpaid = greatest(coalesce(unpaid, 0) - p_amount, 0),
        status = case
          when greatest(coalesce(unpaid, 0) - p_amount, 0) = 0 then 'COMPLETED'::public."SaleStatus"
          else 'UNPAID'::public."SaleStatus"
        end,
        card = coalesce(card, 0) + case when p_method = 'CARD'::public."PaymentMethod" then p_amount else 0 end,
        cash = coalesce(cash, 0) + case when p_method in ('CASH'::public."PaymentMethod", 'TRANSFER'::public."PaymentMethod") then p_amount else 0 end,
        "paymentMethod" = case
          when "paymentMethod" = p_method then p_method
          else 'MIXED'::public."PaymentMethod"
        end,
        "updatedAt" = now()
    where id = v_contract."sourceSaleId";
  end if;

  select coalesce(sum(amount - "paidAmount"), 0)
    into v_remaining
  from public.installment_rounds ir
  where ir."contractId" = v_contract.id;

  if v_remaining = 0 then
    v_status := '완납';
  elsif exists (
    select 1
    from public.installment_rounds ir
    where ir."contractId" = v_contract.id
      and ir.status <> '완료'
      and ir."dueDate" < current_date
  ) then
    v_status := '미납';
  else
    v_status := '진행중';
  end if;

  update public.installment_contracts
  set status = v_status,
      "updatedAt" = now()
  where id = v_contract.id;

  return query
  select v_contract.id, v_round.id, v_remaining, v_status;
end;
$$;

grant execute on function public.process_installment_round_payment(
  bigint,
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
