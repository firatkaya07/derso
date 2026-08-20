-- Support chat attachments (images + documents)

-- Message attachment columns
alter table public.support_messages
  drop constraint if exists support_messages_body_check;

alter table public.support_messages
  alter column body set default '';

alter table public.support_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size integer;

alter table public.support_messages
  drop constraint if exists support_messages_body_or_attachment_chk;

alter table public.support_messages
  add constraint support_messages_body_or_attachment_chk
  check (
    length(btrim(body)) > 0
    or attachment_path is not null
  );

alter table public.support_messages
  drop constraint if exists support_messages_attachment_size_chk;

alter table public.support_messages
  add constraint support_messages_attachment_size_chk
  check (
    attachment_size is null
    or (attachment_size > 0 and attachment_size <= 8388608)
  );

-- Storage bucket: 8 MB hard cap (client also enforces 5 MB images / 8 MB docs)
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'support-attachments',
  'support-attachments',
  true,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Support attachments public read" on storage.objects;
create policy "Support attachments public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'support-attachments');

drop policy if exists "Support attachments upload" on storage.objects;
create policy "Support attachments upload"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = 'support'
  );

-- Replace send message RPC (single signature with attachment params)
drop function if exists public.support_send_message(uuid, text, text);
drop function if exists public.support_send_message(uuid, text, text, text, text, text, integer);

create or replace function public.support_send_message(
  p_conversation_id uuid,
  p_body text default null,
  p_guest_token text default null,
  p_attachment_path text default null,
  p_attachment_name text default null,
  p_attachment_mime text default null,
  p_attachment_size integer default null
)
returns public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ok boolean := false;
  v_row public.support_messages;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_body = '' and p_attachment_path is null then
    raise exception 'Mesaj veya dosya gerekli';
  end if;

  if p_attachment_path is not null then
    if p_attachment_path not like 'support/%' then
      raise exception 'Geçersiz dosya yolu';
    end if;
    if p_attachment_size is null or p_attachment_size <= 0 or p_attachment_size > 8388608 then
      raise exception 'Dosya boyutu geçersiz (en fazla 8 MB)';
    end if;
    if p_attachment_mime is null or p_attachment_name is null then
      raise exception 'Dosya bilgisi eksik';
    end if;
  end if;

  select exists (
    select 1
    from public.support_conversations c
    where c.id = p_conversation_id
      and c.status = 'open'
      and (
        (v_user_id is not null and c.user_id = v_user_id)
        or (
          p_guest_token is not null
          and c.guest_token is not null
          and c.guest_token = p_guest_token
        )
      )
  )
  into v_ok;

  if not v_ok then
    raise exception 'Konuşma bulunamadı veya erişim yok';
  end if;

  insert into public.support_messages (
    conversation_id,
    sender,
    body,
    created_by,
    attachment_path,
    attachment_name,
    attachment_mime,
    attachment_size
  )
  values (
    p_conversation_id,
    'user',
    v_body,
    v_user_id,
    p_attachment_path,
    p_attachment_name,
    p_attachment_mime,
    p_attachment_size
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.support_send_message(uuid, text, text, text, text, text, integer) to anon, authenticated;
