-- D08 marketing core persistence.
-- Replaces mock/localStorage-only marketing screens with branch-scoped database records.

alter table public.leads
  add column if not exists "inquiryType" text not null default '전화문의';

alter table public.coupons
  add column if not exists code text,
  add column if not exists "maxUsage" integer,
  add column if not exists conditions text,
  add column if not exists memo text,
  add column if not exists "validityType" text not null default 'period',
  add column if not exists "validDays" integer;

alter table public.coupons
  alter column "validFrom" drop not null,
  alter column "validUntil" drop not null;

update public.coupons
set code = 'CP-' || lpad(id::text, 6, '0')
where code is null;

create unique index if not exists coupons_branch_code_unique
  on public.coupons ("branchId", code)
  where code is not null;

create table if not exists public.coupon_issuance_logs (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "couponId" integer not null references public.coupons(id) on delete cascade,
  "couponName" text not null,
  "memberId" integer references public.members(id) on delete set null,
  "memberName" text not null,
  "memberNo" text,
  "issuedDate" date not null default current_date,
  "expiryDate" date,
  "usedDate" date,
  status text not null default 'unused' check (status in ('unused', 'used', 'expired')),
  "usedProduct" text,
  code text,
  "createdAt" timestamp with time zone not null default now()
);

create index if not exists coupon_issuance_logs_branch_coupon_idx
  on public.coupon_issuance_logs ("branchId", "couponId");

create index if not exists coupon_issuance_logs_branch_member_idx
  on public.coupon_issuance_logs ("branchId", "memberId");

create table if not exists public.auto_alarm_settings (
  "branchId" integer primary key references public.branches(id) on delete cascade,
  steps jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  "masterEnabled" boolean not null default true,
  "senderNumber" text not null default '02-1234-5678',
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create table if not exists public.marketing_campaigns (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  name text not null,
  goal text not null check (goal in ('신규유치', '재등록', '인지도', '온보딩', '이벤트')),
  segment text not null,
  "segmentSize" integer not null default 0,
  "startDate" date not null,
  "endDate" date not null,
  status text not null default '준비' check (status in ('준비', '진행', '종료')),
  channels text[] not null default '{}',
  budget numeric(12, 0) not null default 0,
  reach integer not null default 0,
  clicks integer not null default 0,
  conversions integer not null default 0,
  cost numeric(12, 0) not null default 0,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create index if not exists marketing_campaigns_branch_status_idx
  on public.marketing_campaigns ("branchId", status);

create table if not exists public.referral_events (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  name text not null,
  "referrerReward" text not null,
  "refereeReward" text not null default '-',
  "startDate" date not null,
  "endDate" date not null,
  status text not null default '준비' check (status in ('준비', '진행', '종료')),
  participants integer not null default 0,
  active boolean not null default true,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create index if not exists referral_events_branch_status_idx
  on public.referral_events ("branchId", status);

create table if not exists public.referral_records (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "eventId" integer references public.referral_events(id) on delete set null,
  "eventName" text not null,
  referrer text not null,
  referee text not null,
  date date not null default current_date,
  reward text not null,
  status text not null default '지급대기' check (status in ('지급완료', '지급대기', '미전환', '취소')),
  "createdAt" timestamp with time zone not null default now()
);

create index if not exists referral_records_branch_event_idx
  on public.referral_records ("branchId", "eventId");

create table if not exists public.sms_templates (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  name text not null,
  channel text not null check (channel in ('SMS', '카카오')),
  content text not null,
  approved boolean not null default false,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create index if not exists sms_templates_branch_channel_idx
  on public.sms_templates ("branchId", channel);

create table if not exists public.bulk_send_histories (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  channel text not null check (channel in ('SMS', 'LMS', 'MMS', '카카오')),
  title text not null,
  target text not null,
  "sentAt" timestamp with time zone not null,
  recipients integer not null default 0,
  success integer not null default 0,
  failed integer not null default 0,
  excluded integer not null default 0,
  cost numeric(12, 0) not null default 0,
  status text not null check (status in ('완료', '예약', '발송중', '부분실패')),
  "failReason" text,
  content text,
  "createdAt" timestamp with time zone not null default now()
);

create index if not exists bulk_send_histories_branch_sent_idx
  on public.bulk_send_histories ("branchId", "sentAt" desc);

create table if not exists public.ab_tests (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  name text not null,
  status text not null default '진행' check (status in ('진행', '완료')),
  "variantA" jsonb not null default '{"name":"A안","sent":0,"open":0,"click":0}'::jsonb,
  "variantB" jsonb not null default '{"name":"B안","sent":0,"open":0,"click":0}'::jsonb,
  winner text check (winner in ('A', 'B')),
  "startDate" date not null,
  "endDate" date not null,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create index if not exists ab_tests_branch_status_idx
  on public.ab_tests ("branchId", status);

create table if not exists public.electronic_contracts (
  id serial primary key,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "contractNo" text not null unique,
  "contractCategory" text not null check ("contractCategory" in ('member', 'staff')),
  "contractType" text not null,
  "targetId" integer,
  "targetName" text not null,
  "targetPhone" text,
  "targetSub" text,
  "startDate" date not null,
  "endDate" date not null,
  amount numeric(12, 0) not null default 0,
  terms text,
  "signMode" text not null default 'onsite' check ("signMode" in ('onsite', 'remote')),
  status text not null default '임시 저장' check (status in ('서명 완료', '원격 서명 대기', '임시 저장')),
  "signedAt" timestamp with time zone,
  "remoteLinkSentAt" timestamp with time zone,
  history jsonb not null default '[]'::jsonb,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create index if not exists electronic_contracts_branch_created_idx
  on public.electronic_contracts ("branchId", "createdAt" desc);

create table if not exists public.mileage_policy_settings (
  "branchId" integer primary key references public.branches(id) on delete cascade,
  "earnRate" numeric(5, 2) not null default 3,
  "expiryMonths" integer not null default 12,
  "minUsage" integer not null default 1000,
  "maxUsagePerTx" integer not null default 50000,
  "productScopes" jsonb not null default '[]'::jsonb,
  "excludedProductScopes" jsonb not null default '[]'::jsonb,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

grant all on table public.coupon_issuance_logs to anon, authenticated, service_role;
grant all on table public.auto_alarm_settings to anon, authenticated, service_role;
grant all on table public.marketing_campaigns to anon, authenticated, service_role;
grant all on table public.referral_events to anon, authenticated, service_role;
grant all on table public.referral_records to anon, authenticated, service_role;
grant all on table public.sms_templates to anon, authenticated, service_role;
grant all on table public.bulk_send_histories to anon, authenticated, service_role;
grant all on table public.ab_tests to anon, authenticated, service_role;
grant all on table public.electronic_contracts to anon, authenticated, service_role;
grant all on table public.mileage_policy_settings to anon, authenticated, service_role;

grant usage, select on sequence public.coupon_issuance_logs_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.marketing_campaigns_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.referral_events_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.referral_records_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.sms_templates_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.bulk_send_histories_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.ab_tests_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.electronic_contracts_id_seq to anon, authenticated, service_role;

comment on table public.coupon_issuance_logs is 'Coupon issue history for D08 SCR-073.';
comment on table public.auto_alarm_settings is 'Branch auto alarm settings for D08 SCR-072 and SCR-072A.';
comment on table public.marketing_campaigns is 'Marketing campaign master and performance records for D08 SCR-076.';
comment on table public.referral_events is 'Referral event master records for D08 SCR-077.';
comment on table public.referral_records is 'Referral match and reward history for D08 SCR-077.';
comment on table public.sms_templates is 'SMS/Kakao message templates for D08 SCR-078.';
comment on table public.bulk_send_histories is 'Bulk SMS/Kakao send history for D08 SCR-078.';
comment on table public.ab_tests is 'A/B test publication and follow-up records for D08 SCR-079.';
comment on table public.electronic_contracts is 'Member and staff electronic contract records for D08 SCR-075.';
comment on table public.mileage_policy_settings is 'Mileage earning, expiry and usage policy settings for D08 SCR-074.';
