insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'files',
    'files',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'profiles',
    'profiles',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'fitgenie_public_storage_read'
  ) then
    create policy fitgenie_public_storage_read
      on storage.objects
      for select
      using (bucket_id in ('files', 'profiles'));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'fitgenie_public_storage_insert'
  ) then
    create policy fitgenie_public_storage_insert
      on storage.objects
      for insert
      with check (bucket_id in ('files', 'profiles'));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'fitgenie_public_storage_update'
  ) then
    create policy fitgenie_public_storage_update
      on storage.objects
      for update
      using (bucket_id in ('files', 'profiles'))
      with check (bucket_id in ('files', 'profiles'));
  end if;
end $$;
