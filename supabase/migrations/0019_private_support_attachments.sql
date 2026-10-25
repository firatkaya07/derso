-- Destek ekleri artık herkese açık değil.
-- Okuma ve yükleme yalnızca support-attachment edge fonksiyonunun
-- ürettiği kısa ömürlü imzalı bağlantıyla yapılır. Fonksiyon, konuşma
-- sahibi, misafir jetonu veya platform admin olduğunu doğrular.
-- Bu migration, yeni istemci ve edge fonksiyonu yayındayken uygulanmalıdır.

update storage.buckets
set public = false
where id = 'support-attachments';

drop policy if exists "Support attachments public read" on storage.objects;
drop policy if exists "Support attachments upload" on storage.objects;

create or replace function public.support_attachment_path_ok(
  p_conversation_id uuid,
  p_path text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_path is not null
    and p_conversation_id is not null
    and p_path !~ '\.\.'
    and strpos(p_path, chr(92)) = 0
    and p_path ~ (
      '^support/'
      || p_conversation_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_[A-Za-z0-9._-]{1,80}$'
    );
$$;

revoke all on function public.support_attachment_path_ok(uuid, text) from public;
revoke all on function public.support_attachment_path_ok(uuid, text) from anon;
revoke all on function public.support_attachment_path_ok(uuid, text) from authenticated;

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
    if not public.support_attachment_path_ok(p_conversation_id, p_attachment_path) then
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

revoke all on function public.support_send_message(uuid, text, text, text, text, text, integer) from public;
revoke all on function public.support_send_message(uuid, text, text, text, text, text, integer) from anon;
grant execute on function public.support_send_message(uuid, text, text, text, text, text, integer) to anon, authenticated;

create or replace function public.admin_reply_message(
  p_conversation_id uuid,
  p_body text,
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
  v_row public.support_messages;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if not public.is_platform_admin() then
    raise exception 'Yetkisiz';
  end if;

  if v_body = '' and p_attachment_path is null then
    raise exception 'Mesaj veya dosya gerekli';
  end if;

  if not exists (
    select 1 from public.support_conversations c where c.id = p_conversation_id
  ) then
    raise exception 'Konuşma bulunamadı';
  end if;

  if p_attachment_path is not null then
    if not public.support_attachment_path_ok(p_conversation_id, p_attachment_path) then
      raise exception 'Geçersiz dosya yolu';
    end if;
    if p_attachment_size is null or p_attachment_size <= 0 or p_attachment_size > 8388608 then
      raise exception 'Dosya boyutu geçersiz';
    end if;
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
    'support',
    v_body,
    auth.uid(),
    p_attachment_path,
    p_attachment_name,
    p_attachment_mime,
    p_attachment_size
  )
  returning * into v_row;

  update public.support_conversations
  set status = 'open', updated_at = now()
  where id = p_conversation_id;

  return v_row;
end;
$$;

revoke all on function public.admin_reply_message(uuid, text, text, text, text, integer) from public;
revoke all on function public.admin_reply_message(uuid, text, text, text, text, integer) from anon;
grant execute on function public.admin_reply_message(uuid, text, text, text, text, integer) to authenticated;
