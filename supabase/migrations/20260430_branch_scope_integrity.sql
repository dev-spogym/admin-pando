do $$
declare
  branch_ids integer[];
begin
  select array_agg(id order by id) into branch_ids
  from public.branches;

  if branch_ids is null or array_length(branch_ids, 1) is null then
    raise notice 'No branches found. branchId backfill skipped.';
    return;
  end if;

  update public.members m
  set "branchId" = branch_ids[(abs(hashtext(m.id::text)) % array_length(branch_ids, 1)) + 1],
      "updatedAt" = now()
  where m."branchId" is null
     or not exists (select 1 from public.branches b where b.id = m."branchId");

  update public.staff s
  set "branchId" = branch_ids[(abs(hashtext(s.id::text)) % array_length(branch_ids, 1)) + 1],
      "updatedAt" = now()
  where s."branchId" is null
     or not exists (select 1 from public.branches b where b.id = s."branchId");

  update public.users u
  set "branchId" = branch_ids[(abs(hashtext(u.id::text)) % array_length(branch_ids, 1)) + 1]
  where coalesce(u."isSuperAdmin", false) = false
    and (
      u."branchId" is null
      or not exists (select 1 from public.branches b where b.id = u."branchId")
    );
end $$;

create index if not exists members_branch_id_idx on public.members ("branchId");
create index if not exists staff_branch_id_idx on public.staff ("branchId");
