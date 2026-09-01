-- Kullanım olayları (indirme + ders dağıtımı) ve admin rapor/sağlık RPC'leri

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null
    check (event_type in (
      'download',
      'schedule_start',
      'schedule_complete',
      'schedule_save'
    )),
  edition text not null default 'v1'
    check (edition in ('v1', 'v2')),
  artifact text,
  format text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint usage_events_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint usage_events_artifact_len
    check (artifact is null or char_length(artifact) between 1 and 64),
  constraint usage_events_format_len
    check (format is null or char_length(format) between 1 and 16)
);

create index if not exists usage_events_org_created_idx
  on public.usage_events (organization_id, created_at desc);
create index if not exists usage_events_type_created_idx
  on public.usage_events (event_type, created_at desc);

alter table public.usage_events enable row level security;

-- Üyeler kendi kurumları için yazabilir; okuma yalnızca admin RPC üzerinden.
revoke all on public.usage_events from public;
revoke all on public.usage_events from anon;
grant insert on public.usage_events to authenticated;

drop policy if exists usage_events_insert_own_org on public.usage_events;
create policy usage_events_insert_own_org
  on public.usage_events
  for insert
  to authenticated
  with check (
    organization_id in (select public.user_organization_ids())
    and user_id = auth.uid()
  );

create or replace function public.record_usage_event(
  p_organization_id uuid,
  p_event_type text,
  p_edition text default 'v1',
  p_artifact text default null,
  p_format text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_meta jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_edition text := coalesce(nullif(btrim(p_edition), ''), 'v1');
  v_artifact text := nullif(btrim(p_artifact), '');
  v_format text := nullif(btrim(p_format), '');
begin
  if auth.uid() is null then
    raise exception 'Yetkisiz';
  end if;

  if p_organization_id is null
     or p_organization_id not in (select public.user_organization_ids()) then
    raise exception 'Yetkisiz';
  end if;

  if p_event_type not in (
    'download',
    'schedule_start',
    'schedule_complete',
    'schedule_save'
  ) then
    raise exception 'Geçersiz olay';
  end if;

  if v_edition not in ('v1', 'v2') then
    raise exception 'Geçersiz sürüm';
  end if;

  if jsonb_typeof(v_meta) <> 'object' then
    raise exception 'Geçersiz metadata';
  end if;

  if pg_column_size(v_meta) > 2048 then
    raise exception 'Metadata çok büyük';
  end if;

  if p_event_type = 'download' then
    if v_artifact is null or v_format is null then
      raise exception 'İndirme için çıktı türü gerekli';
    end if;
    if v_format not in ('pdf', 'xlsx', 'html') then
      raise exception 'Geçersiz dosya biçimi';
    end if;
  end if;

  insert into public.usage_events (
    organization_id,
    user_id,
    event_type,
    edition,
    artifact,
    format,
    metadata
  )
  values (
    p_organization_id,
    auth.uid(),
    p_event_type,
    v_edition,
    v_artifact,
    v_format,
    v_meta
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_usage_event(uuid, text, text, text, text, jsonb) from public;
revoke all on function public.record_usage_event(uuid, text, text, text, text, jsonb) from anon;
grant execute on function public.record_usage_event(uuid, text, text, text, text, jsonb) to authenticated;

-- ── Kurum listesi: dağıtılmış program durumu ──

drop function if exists public.admin_list_organizations();

create or replace function public.admin_list_organizations()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  member_count bigint,
  teacher_count bigint,
  class_count bigint,
  has_schedule boolean,
  lesson_count bigint,
  lesson_count_v2 bigint,
  last_scheduled_at timestamptz,
  downloads_30d bigint,
  schedule_saves_30d bigint
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
    (select count(*) from public.classes c where c.organization_id = o.id) as class_count,
    (
      exists (select 1 from public.lessons l where l.organization_id = o.id)
      or exists (select 1 from public.lessons_v2 l2 where l2.organization_id = o.id)
    ) as has_schedule,
    (select count(*) from public.lessons l where l.organization_id = o.id) as lesson_count,
    (select count(*) from public.lessons_v2 l2 where l2.organization_id = o.id) as lesson_count_v2,
    (
      select max(ts)
      from (
        select max(l.created_at) as ts
        from public.lessons l
        where l.organization_id = o.id
        union all
        select max(l2.created_at)
        from public.lessons_v2 l2
        where l2.organization_id = o.id
      ) schedule_ts
    ) as last_scheduled_at,
    (
      select count(*)
      from public.usage_events ue
      where ue.organization_id = o.id
        and ue.event_type = 'download'
        and ue.created_at >= now() - interval '30 days'
    ) as downloads_30d,
    (
      select count(*)
      from public.usage_events ue
      where ue.organization_id = o.id
        and ue.event_type = 'schedule_save'
        and ue.created_at >= now() - interval '30 days'
    ) as schedule_saves_30d
  from public.organizations o
  order by o.created_at desc;
end;
$$;

revoke all on function public.admin_list_organizations() from public;
revoke all on function public.admin_list_organizations() from anon;
grant execute on function public.admin_list_organizations() to authenticated;

-- ── Sistem sağlığı ──

create or replace function public.admin_system_health()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orgs int;
  v_with_schedule int;
  v_ready_no_schedule int;
  v_users int;
  v_users_7d int;
  v_users_30d int;
  v_orgs_active_7d int;
  v_orgs_stale_30d int;
  v_completes int;
  v_complete_ok int;
begin
  if not public.is_platform_admin() then
    raise exception 'Yetkisiz';
  end if;

  select count(*)::int into v_orgs from public.organizations;
  select count(*)::int into v_users from auth.users where deleted_at is null;

  select count(*)::int into v_with_schedule
  from public.organizations o
  where exists (select 1 from public.lessons l where l.organization_id = o.id)
     or exists (select 1 from public.lessons_v2 l2 where l2.organization_id = o.id);

  select count(*)::int into v_ready_no_schedule
  from public.organizations o
  where exists (select 1 from public.teachers t where t.organization_id = o.id)
    and exists (select 1 from public.classes c where c.organization_id = o.id)
    and not exists (select 1 from public.lessons l where l.organization_id = o.id)
    and not exists (select 1 from public.lessons_v2 l2 where l2.organization_id = o.id);

  select count(*)::int into v_users_7d
  from auth.users u
  where u.deleted_at is null
    and u.last_sign_in_at >= now() - interval '7 days';

  select count(*)::int into v_users_30d
  from auth.users u
  where u.deleted_at is null
    and u.last_sign_in_at >= now() - interval '30 days';

  select count(*)::int into v_orgs_active_7d
  from public.organizations o
  where exists (
    select 1
    from public.organization_members om
    join auth.users u on u.id = om.user_id
    where om.organization_id = o.id
      and u.deleted_at is null
      and u.last_sign_in_at >= now() - interval '7 days'
  );

  select count(*)::int into v_orgs_stale_30d
  from public.organizations o
  where not exists (
    select 1
    from public.organization_members om
    join auth.users u on u.id = om.user_id
    where om.organization_id = o.id
      and u.deleted_at is null
      and u.last_sign_in_at >= now() - interval '30 days'
  );

  select
    count(*)::int,
    count(*) filter (
      where coalesce((ue.metadata ->> 'success')::boolean, false)
    )::int
  into v_completes, v_complete_ok
  from public.usage_events ue
  where ue.event_type = 'schedule_complete'
    and ue.created_at >= now() - interval '30 days';

  return jsonb_build_object(
    'organizations', v_orgs,
    'orgs_with_schedule', v_with_schedule,
    'orgs_without_schedule', greatest(v_orgs - v_with_schedule, 0),
    'schedule_adoption_pct', case
      when v_orgs = 0 then 0
      else round((v_with_schedule::numeric * 100) / v_orgs)::int
    end,
    'orgs_ready_without_schedule', v_ready_no_schedule,
    'orgs_empty', greatest(v_orgs - v_with_schedule - v_ready_no_schedule, 0),
    'users', v_users,
    'users_active_7d', v_users_7d,
    'users_active_30d', v_users_30d,
    'orgs_active_7d', v_orgs_active_7d,
    'orgs_stale_30d', v_orgs_stale_30d,
    'open_conversations', (
      select count(*)::int from public.support_conversations where status = 'open'
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
    ),
    'messages_today', (
      select count(*)::int from public.support_messages
      where created_at >= date_trunc('day', now())
    ),
    'new_orgs_7d', (
      select count(*)::int from public.organizations
      where created_at >= now() - interval '7 days'
    ),
    'new_users_7d', (
      select count(*)::int from auth.users
      where deleted_at is null
        and created_at >= now() - interval '7 days'
    ),
    'downloads_7d', (
      select count(*)::int from public.usage_events
      where event_type = 'download'
        and created_at >= now() - interval '7 days'
    ),
    'downloads_30d', (
      select count(*)::int from public.usage_events
      where event_type = 'download'
        and created_at >= now() - interval '30 days'
    ),
    'schedule_starts_7d', (
      select count(*)::int from public.usage_events
      where event_type = 'schedule_start'
        and created_at >= now() - interval '7 days'
    ),
    'schedule_starts_30d', (
      select count(*)::int from public.usage_events
      where event_type = 'schedule_start'
        and created_at >= now() - interval '30 days'
    ),
    'schedule_saves_30d', (
      select count(*)::int from public.usage_events
      where event_type = 'schedule_save'
        and created_at >= now() - interval '30 days'
    ),
    'schedule_completes_30d', v_completes,
    'schedule_success_rate_30d', case
      when v_completes = 0 then null
      else round((v_complete_ok::numeric * 100) / v_completes)::int
    end,
    'lessons_total', (select count(*)::int from public.lessons),
    'lessons_v2_total', (select count(*)::int from public.lessons_v2)
  );
end;
$$;

revoke all on function public.admin_system_health() from public;
revoke all on function public.admin_system_health() from anon;
grant execute on function public.admin_system_health() to authenticated;

-- ── Kullanım raporu (platform + kurum) ──

create or replace function public.admin_usage_report(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 90));
  v_since timestamptz := now() - make_interval(days => v_days);
  v_platform jsonb;
  v_orgs jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Yetkisiz';
  end if;

  select jsonb_build_object(
    'downloads', (
      select count(*)::int from public.usage_events
      where event_type = 'download' and created_at >= v_since
    ),
    'schedule_starts', (
      select count(*)::int from public.usage_events
      where event_type = 'schedule_start' and created_at >= v_since
    ),
    'schedule_completes', (
      select count(*)::int from public.usage_events
      where event_type = 'schedule_complete' and created_at >= v_since
    ),
    'schedule_complete_success', (
      select count(*)::int from public.usage_events
      where event_type = 'schedule_complete'
        and created_at >= v_since
        and coalesce((metadata ->> 'success')::boolean, false)
    ),
    'schedule_saves', (
      select count(*)::int from public.usage_events
      where event_type = 'schedule_save' and created_at >= v_since
    ),
    'downloads_by_artifact', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'artifact', t.artifact,
            'format', t.format,
            'edition', t.edition,
            'count', t.count
          )
          order by t.count desc
        ),
        '[]'::jsonb
      )
      from (
        select
          coalesce(artifact, 'diger') as artifact,
          coalesce(format, 'diger') as format,
          edition,
          count(*)::int as count
        from public.usage_events
        where event_type = 'download' and created_at >= v_since
        group by 1, 2, 3
      ) t
    ),
    'daily', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'day', to_char(d.day, 'YYYY-MM-DD'),
            'downloads', coalesce(a.downloads, 0),
            'schedule_starts', coalesce(a.schedule_starts, 0),
            'schedule_completes', coalesce(a.schedule_completes, 0),
            'schedule_saves', coalesce(a.schedule_saves, 0)
          )
          order by d.day
        ),
        '[]'::jsonb
      )
      from (
        select generate_series(
          date_trunc('day', timezone('Europe/Istanbul', v_since)),
          date_trunc('day', timezone('Europe/Istanbul', now())),
          interval '1 day'
        )::date as day
      ) d
      left join (
        select
          (timezone('Europe/Istanbul', created_at))::date as day,
          count(*) filter (where event_type = 'download')::int as downloads,
          count(*) filter (where event_type = 'schedule_start')::int as schedule_starts,
          count(*) filter (where event_type = 'schedule_complete')::int as schedule_completes,
          count(*) filter (where event_type = 'schedule_save')::int as schedule_saves
        from public.usage_events
        where created_at >= v_since
        group by 1
      ) a on a.day = d.day
    )
  )
  into v_platform;

  select coalesce(
    jsonb_agg(t.row order by t.created_at desc),
    '[]'::jsonb
  )
  into v_orgs
  from (
    select
      o.created_at,
      jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'created_at', o.created_at,
        'has_schedule', (
          exists (select 1 from public.lessons l where l.organization_id = o.id)
          or exists (select 1 from public.lessons_v2 l2 where l2.organization_id = o.id)
        ),
        'lesson_count', (select count(*)::int from public.lessons l where l.organization_id = o.id),
        'lesson_count_v2', (select count(*)::int from public.lessons_v2 l2 where l2.organization_id = o.id),
        'last_scheduled_at', (
          select max(ts)
          from (
            select max(l.created_at) as ts
            from public.lessons l
            where l.organization_id = o.id
            union all
            select max(l2.created_at)
            from public.lessons_v2 l2
            where l2.organization_id = o.id
          ) schedule_ts
        ),
        'downloads', (
          select count(*)::int from public.usage_events ue
          where ue.organization_id = o.id
            and ue.event_type = 'download'
            and ue.created_at >= v_since
        ),
        'schedule_starts', (
          select count(*)::int from public.usage_events ue
          where ue.organization_id = o.id
            and ue.event_type = 'schedule_start'
            and ue.created_at >= v_since
        ),
        'schedule_completes', (
          select count(*)::int from public.usage_events ue
          where ue.organization_id = o.id
            and ue.event_type = 'schedule_complete'
            and ue.created_at >= v_since
        ),
        'schedule_saves', (
          select count(*)::int from public.usage_events ue
          where ue.organization_id = o.id
            and ue.event_type = 'schedule_save'
            and ue.created_at >= v_since
        ),
        'last_download_at', (
          select max(ue.created_at) from public.usage_events ue
          where ue.organization_id = o.id
            and ue.event_type = 'download'
            and ue.created_at >= v_since
        ),
        'last_schedule_event_at', (
          select max(ue.created_at) from public.usage_events ue
          where ue.organization_id = o.id
            and ue.event_type in ('schedule_start', 'schedule_complete', 'schedule_save')
            and ue.created_at >= v_since
        )
      ) as row
    from public.organizations o
  ) t;

  return jsonb_build_object(
    'period_days', v_days,
    'platform', v_platform,
    'organizations', v_orgs
  );
end;
$$;

revoke all on function public.admin_usage_report(integer) from public;
revoke all on function public.admin_usage_report(integer) from anon;
grant execute on function public.admin_usage_report(integer) to authenticated;
