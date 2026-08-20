-- Platform admin allowlist + admin RPCs

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

drop policy if exists "Platform admins can read self" on public.platform_admins;
create policy "Platform admins can read self"
  on public.platform_admins
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- ── Conversations ──

create or replace function public.admin_list_conversations(
  p_status text default null,
  p_limit integer default 100
)
returns setof public.support_conversations
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select c.*
  from public.support_conversations c
  where (p_status is null or c.status = p_status)
  order by c.last_message_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

create or replace function public.admin_list_messages(
  p_conversation_id uuid
)
returns setof public.support_messages
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select m.*
  from public.support_messages m
  where m.conversation_id = p_conversation_id
  order by m.created_at asc;
end;
$$;

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
    if p_attachment_path not like 'support/%' then
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

create or replace function public.admin_set_conversation_status(
  p_conversation_id uuid,
  p_status text
)
returns public.support_conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.support_conversations;
begin
  if not public.is_platform_admin() then
    raise exception 'Yetkisiz';
  end if;

  if p_status not in ('open', 'closed') then
    raise exception 'Geçersiz durum';
  end if;

  update public.support_conversations
  set status = p_status, updated_at = now()
  where id = p_conversation_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Konuşma bulunamadı';
  end if;

  return v_row;
end;
$$;

-- ── Orgs & users ──

create or replace function public.admin_list_organizations()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  member_count bigint,
  teacher_count bigint,
  class_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    o.id,
    o.name,
    o.created_at,
    (select count(*) from public.organization_members om where om.organization_id = o.id) as member_count,
    (select count(*) from public.teachers t where t.organization_id = o.id) as teacher_count,
    (select count(*) from public.classes c where c.organization_id = o.id) as class_count
  from public.organizations o
  order by o.created_at desc;
end;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  organization_name text,
  organization_role text,
  is_platform_admin boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    o.name as organization_name,
    om.role as organization_role,
    exists (
      select 1 from public.platform_admins pa where pa.user_id = u.id
    ) as is_platform_admin
  from auth.users u
  left join lateral (
    select om2.organization_id, om2.role
    from public.organization_members om2
    where om2.user_id = u.id
    order by om2.created_at asc
    limit 1
  ) om on true
  left join public.organizations o on o.id = om.organization_id
  where u.deleted_at is null
  order by u.created_at desc;
end;
$$;

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Yetkisiz';
  end if;

  return jsonb_build_object(
    'organizations', (select count(*) from public.organizations),
    'users', (select count(*) from auth.users where deleted_at is null),
    'open_conversations', (
      select count(*) from public.support_conversations where status = 'open'
    ),
    'total_conversations', (select count(*) from public.support_conversations),
    'messages_today', (
      select count(*) from public.support_messages
      where created_at >= date_trunc('day', now())
    )
  );
end;
$$;

revoke all on function public.admin_list_conversations(text, integer) from public;
revoke all on function public.admin_list_messages(uuid) from public;
revoke all on function public.admin_reply_message(uuid, text, text, text, text, integer) from public;
revoke all on function public.admin_set_conversation_status(uuid, text) from public;
revoke all on function public.admin_list_organizations() from public;
revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_dashboard_stats() from public;

grant execute on function public.admin_list_conversations(text, integer) to authenticated;
grant execute on function public.admin_list_messages(uuid) to authenticated;
grant execute on function public.admin_reply_message(uuid, text, text, text, text, integer) to authenticated;
grant execute on function public.admin_set_conversation_status(uuid, text) to authenticated;
grant execute on function public.admin_list_organizations() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;

grant select on public.platform_admins to authenticated;
