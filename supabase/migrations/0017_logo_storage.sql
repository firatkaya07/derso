-- Kurum logosu için depolama alanı; logo_data_url artık data URL veya public URL kabul eder

alter table public.settings
  drop constraint if exists settings_logo_data_url_check;

alter table public.settings
  add constraint settings_logo_data_url_check check (
    logo_data_url is null
    or logo_data_url like 'data:image/%'
    or logo_data_url ~ '^https?://'
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'institution-logos',
  'institution-logos',
  true,
  524288,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Institution logos public read" on storage.objects;
create policy "Institution logos public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'institution-logos');

drop policy if exists "Institution logos upload" on storage.objects;
create policy "Institution logos upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'institution-logos'
    and (storage.foldername(name))[1]::uuid in (
      select public.user_organization_ids()
    )
  );

drop policy if exists "Institution logos update" on storage.objects;
create policy "Institution logos update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'institution-logos'
    and (storage.foldername(name))[1]::uuid in (
      select public.user_organization_ids()
    )
  )
  with check (
    bucket_id = 'institution-logos'
    and (storage.foldername(name))[1]::uuid in (
      select public.user_organization_ids()
    )
  );
