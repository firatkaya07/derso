-- Support conversations (two-way contact chat)

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  guest_token text unique,
  full_name text not null check (length(btrim(full_name)) > 0),
  phone text not null check (length(btrim(phone)) > 0),
  email text,
  organization_name text,
  page text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint support_conversations_owner_chk check (
    user_id is not null or guest_token is not null
  )
);

create index if not exists support_conversations_user_id_idx
  on public.support_conversations (user_id, last_message_at desc);

create index if not exists support_conversations_last_message_idx
  on public.support_conversations (last_message_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.support_conversations (id) on delete cascade,
  sender text not null check (sender in ('user', 'support')),
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists support_messages_conversation_created_idx
  on public.support_messages (conversation_id, created_at);

create or replace function public.touch_support_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_conversations
  set
    last_message_at = coalesce(new.created_at, now()),
    updated_at = now(),
    status = case when new.sender = 'user' then 'open' else status end
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists support_messages_touch_conversation on public.support_messages;
create trigger support_messages_touch_conversation
  after insert on public.support_messages
  for each row
  execute function public.touch_support_conversation();

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

-- Authenticated users: own conversations
drop policy if exists "Users read own support conversations" on public.support_conversations;
create policy "Users read own support conversations"
  on public.support_conversations
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users insert own support conversations" on public.support_conversations;
create policy "Users insert own support conversations"
  on public.support_conversations
  for insert
  to authenticated
  with check (user_id = auth.uid() and guest_token is null);

drop policy if exists "Users update own support conversations" on public.support_conversations;
create policy "Users update own support conversations"
  on public.support_conversations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users read own support messages" on public.support_messages;
create policy "Users read own support messages"
  on public.support_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.support_conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert own user support messages" on public.support_messages;
create policy "Users insert own user support messages"
  on public.support_messages
  for insert
  to authenticated
  with check (
    sender = 'user'
    and created_by = auth.uid()
    and exists (
      select 1
      from public.support_conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

-- Guest / shared RPCs (security definer)
create or replace function public.support_start_conversation(
  p_full_name text,
  p_phone text,
  p_message text,
  p_page text default null,
  p_email text default null,
  p_organization_name text default null,
  p_guest_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_guest_token text;
  v_conversation_id uuid;
  v_welcome text :=
    'Merhaba! Mesajınızı aldık. Ekibimiz en kısa sürede yanıtlayacak. Bu pencereden konuşmayı takip edebilirsiniz.';
begin
  if length(btrim(coalesce(p_full_name, ''))) = 0 then
    raise exception 'Ad soyad gerekli';
  end if;
  if length(btrim(coalesce(p_phone, ''))) = 0 then
    raise exception 'Telefon gerekli';
  end if;
  if length(btrim(coalesce(p_message, ''))) = 0 then
    raise exception 'Mesaj gerekli';
  end if;

  if v_user_id is null then
    v_guest_token := coalesce(
      nullif(btrim(p_guest_token), ''),
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
    );
  else
    v_guest_token := null;
  end if;

  insert into public.support_conversations (
    user_id,
    guest_token,
    full_name,
    phone,
    email,
    organization_name,
    page
  )
  values (
    v_user_id,
    v_guest_token,
    btrim(p_full_name),
    btrim(p_phone),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_organization_name, '')), ''),
    nullif(btrim(coalesce(p_page, '')), '')
  )
  returning id into v_conversation_id;

  insert into public.support_messages (conversation_id, sender, body, created_by)
  values (v_conversation_id, 'user', btrim(p_message), v_user_id);

  insert into public.support_messages (conversation_id, sender, body, created_by)
  values (v_conversation_id, 'support', v_welcome, null);

  return jsonb_build_object(
    'conversation_id', v_conversation_id,
    'guest_token', v_guest_token
  );
end;
$$;

create or replace function public.support_list_messages(
  p_conversation_id uuid,
  p_guest_token text default null
)
returns setof public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ok boolean := false;
begin
  select exists (
    select 1
    from public.support_conversations c
    where c.id = p_conversation_id
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

  return query
  select m.*
  from public.support_messages m
  where m.conversation_id = p_conversation_id
  order by m.created_at asc;
end;
$$;

create or replace function public.support_send_message(
  p_conversation_id uuid,
  p_body text,
  p_guest_token text default null
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
begin
  if length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'Mesaj boş olamaz';
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
    created_by
  )
  values (
    p_conversation_id,
    'user',
    btrim(p_body),
    v_user_id
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.support_list_conversations(
  p_guest_token text default null
)
returns setof public.support_conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is not null then
    return query
    select c.*
    from public.support_conversations c
    where c.user_id = v_user_id
    order by c.last_message_at desc;
  elsif p_guest_token is not null and length(btrim(p_guest_token)) > 0 then
    return query
    select c.*
    from public.support_conversations c
    where c.guest_token = btrim(p_guest_token)
    order by c.last_message_at desc;
  else
    return;
  end if;
end;
$$;

revoke all on function public.support_start_conversation(text, text, text, text, text, text, text) from public;
revoke all on function public.support_list_messages(uuid, text) from public;
revoke all on function public.support_send_message(uuid, text, text) from public;
revoke all on function public.support_list_conversations(text) from public;

grant execute on function public.support_start_conversation(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.support_list_messages(uuid, text) to anon, authenticated;
grant execute on function public.support_send_message(uuid, text, text) to anon, authenticated;
grant execute on function public.support_list_conversations(text) to anon, authenticated;

-- Realtime for live replies
do $$
begin
  alter publication supabase_realtime add table public.support_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
