create table if not exists public.staff_documents (
  id bigserial primary key,
  "staffId" integer not null references public.staff(id) on delete cascade,
  "branchId" integer not null references public.branches(id) on delete cascade,
  "docType" text not null default 'employment_contract'
    check ("docType" in ('employment_contract', 'certificate', 'other')),
  "fileName" text not null,
  "filePath" text not null,
  "fileUrl" text not null,
  "mimeType" text,
  "fileSize" integer,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'signed', 'void')),
  memo text,
  "uploadedBy" text,
  "uploadedAt" timestamp with time zone not null default now(),
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create index if not exists staff_documents_staff_idx
  on public.staff_documents ("staffId");

create index if not exists staff_documents_branch_type_idx
  on public.staff_documents ("branchId", "docType");

grant select, insert, update, delete on table public.staff_documents to anon, authenticated, service_role;
grant usage, select on sequence public.staff_documents_id_seq to anon, authenticated, service_role;

comment on table public.staff_documents is '직원 인사 파일 첨부 이력. 근로계약서 이미지/PDF 등 직원별 문서를 보관한다.';
comment on column public.staff_documents."docType" is 'employment_contract=근로계약서, certificate=증빙서류, other=기타';

notify pgrst, 'reload schema';
