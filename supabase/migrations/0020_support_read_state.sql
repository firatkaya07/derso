-- Destek yanıtları için kullanıcı tarafı okunma durumu.
--
-- user_last_read_at, kullanıcının konuşmayı en son açtığı an. Bundan sonra
-- gelen destek mesajları okunmamış sayılır. Mevcut konuşmalar okunmuş başlar.
-- Yeni konuşmanın karşılama mesajı aynı işlemde yazıldığı için (now() eşit)
-- okunmamış sayılmaz.

alter table public.support_conversations
  add column if not exists user_last_read_at timestamptz not null default now();

-- Destek yanıtı almış her konuşma bir bildirimdir; okunduktan sonra da listede
-- kalır. unread, son okumadan sonra gelen yanıt sayısı (0 = okunmuş).
-- Karşılama mesajı konuşmayla aynı anda yazılır, bildirim sayılmaz.
create or replace function public.support_notifications()
returns table (
  conversation_id uuid,
  full_name text,
  unread integer,
  last_reply_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.full_name,
    (count(m.id) filter (where m.created_at > c.user_last_read_at))::integer,
    max(m.created_at)
  from public.support_conversations c
  join public.support_messages m
    on m.conversation_id = c.id
   and m.sender = 'support'
   and m.created_at > c.created_at
  where c.user_id = auth.uid()
  group by c.id, c.full_name
  order by max(m.created_at) desc
  limit 50;
$$;

create or replace function public.support_mark_read(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.support_conversations
  set user_last_read_at = now()
  where id = p_conversation_id
    and user_id = auth.uid();
$$;

revoke all on function public.support_notifications() from public, anon;
revoke all on function public.support_mark_read(uuid) from public, anon;

grant execute on function public.support_notifications() to authenticated;
grant execute on function public.support_mark_read(uuid) to authenticated;
