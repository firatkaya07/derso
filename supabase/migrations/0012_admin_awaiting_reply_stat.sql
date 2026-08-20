-- Add awaiting_reply to admin dashboard stats

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
    ),
    'awaiting_reply', (
      select count(*)::int
      from public.support_conversations c
      where c.status = 'open'
        and (
          select m.sender
          from public.support_messages m
          where m.conversation_id = c.id
          order by m.created_at desc
          limit 1
        ) = 'user'
    )
  );
end;
$$;
