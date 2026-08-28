-- V2: kurum bazlı hafta içi / hafta sonu zaman çizelgeleri + bağımsız dersler
-- V1 (settings.lesson_duration / lessons) olduğu gibi kalır.

-- ---------------------------------------------------------------------------
-- schedule_profiles_v2
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_profiles_v2 (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  day_group text not null check (day_group in ('weekday', 'weekend')),
  start_time time not null default '08:00',
  lesson_duration_minutes integer not null default 40
    check (lesson_duration_minutes between 5 and 180),
  slot_count integer not null default 8
    check (slot_count between 1 and 20),
  -- N slot için N-1 teneffüs süresi (dakika). Örn. 8 slot → 7 değer.
  break_minutes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, day_group),
  constraint schedule_profiles_v2_breaks_is_array check (jsonb_typeof(break_minutes) = 'array')
);

create index if not exists schedule_profiles_v2_org_idx
  on public.schedule_profiles_v2 (organization_id);

alter table public.schedule_profiles_v2 enable row level security;

drop policy if exists schedule_profiles_v2_org_isolation on public.schedule_profiles_v2;
create policy schedule_profiles_v2_org_isolation
  on public.schedule_profiles_v2 for all to authenticated
  using (organization_id in (select public.user_organization_ids()))
  with check (organization_id in (select public.user_organization_ids()));

-- ---------------------------------------------------------------------------
-- lessons_v2 — V1 lessons ile aynı yapı; V2 programı burada yaşar
-- ---------------------------------------------------------------------------
create table if not exists public.lessons_v2 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  teacher_id uuid not null references public.teachers (id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint lessons_v2_time_order check (end_time > start_time),
  constraint lessons_v2_class_slot_unique unique (class_id, day_of_week, start_time),
  constraint lessons_v2_teacher_slot_unique unique (teacher_id, day_of_week, start_time)
);

create index if not exists lessons_v2_organization_id_idx on public.lessons_v2 (organization_id);
create index if not exists lessons_v2_class_idx on public.lessons_v2 (class_id);
create index if not exists lessons_v2_teacher_idx on public.lessons_v2 (teacher_id);
create index if not exists lessons_v2_subject_idx on public.lessons_v2 (subject_id);

alter table public.lessons_v2 enable row level security;

drop policy if exists lessons_v2_org_isolation on public.lessons_v2;
create policy lessons_v2_org_isolation
  on public.lessons_v2 for all to authenticated
  using (organization_id in (select public.user_organization_ids()))
  with check (organization_id in (select public.user_organization_ids()));

-- organization_id otomatik doldurma (V1 lessons ile aynı pattern)
create or replace function public.lessons_v2_inherit_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.classes
    where id = new.class_id;
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_v2_inherit_org on public.lessons_v2;
create trigger lessons_v2_inherit_org
  before insert on public.lessons_v2
  for each row execute function public.lessons_v2_inherit_org();

-- ---------------------------------------------------------------------------
-- Varsayılan V2 profilleri: V1 ayarlarından türet
-- ---------------------------------------------------------------------------
create or replace function public.ensure_schedule_profiles_v2(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  lesson_mins int := 40;
  break_mins int := 10;
  breaks jsonb;
  i int;
begin
  if p_org is null then
    raise exception 'organization gerekli';
  end if;
  if not (p_org in (select public.user_organization_ids())) then
    raise exception 'Yetkisiz';
  end if;

  select coalesce(lesson_duration_minutes, 40), coalesce(break_duration_minutes, 10)
    into lesson_mins, break_mins
  from public.settings
  where organization_id = p_org;

  breaks := '[]'::jsonb;
  for i in 1..7 loop
    breaks := breaks || to_jsonb(break_mins);
  end loop;

  insert into public.schedule_profiles_v2 as sp (
    organization_id, day_group, start_time, lesson_duration_minutes, slot_count, break_minutes
  ) values
    (p_org, 'weekday', '08:00', lesson_mins, 8, breaks),
    (p_org, 'weekend', '09:00', lesson_mins, 6,
      (select jsonb_agg(x) from (
         select to_jsonb(break_mins) as x from generate_series(1, 5)
       ) s))
  on conflict (organization_id, day_group) do nothing;
end;
$$;

revoke all on function public.ensure_schedule_profiles_v2(uuid) from public;
grant execute on function public.ensure_schedule_profiles_v2(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- V1 lessons → lessons_v2 kopyalama (saatleri V2 slotlarına en yakın eşle)
-- ---------------------------------------------------------------------------
create or replace function public.migrate_lessons_to_v2(p_org uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  copied int := 0;
  skipped int := 0;
  r record;
  slot_start time;
  slot_end time;
  day_group text;
  profile public.schedule_profiles_v2%rowtype;
  breaks int[];
  cur int;
  lesson_mins int;
  i int;
  best_idx int;
  best_diff int;
  candidate_start int;
  lesson_start_mins int;
  n int;
begin
  if not (p_org in (select public.user_organization_ids())) then
    raise exception 'Yetkisiz';
  end if;

  perform public.ensure_schedule_profiles_v2(p_org);

  -- Mevcut V2 derslerini silip yeniden doldur (idempotent migration)
  delete from public.lessons_v2 where organization_id = p_org;

  for r in
    select * from public.lessons where organization_id = p_org
  loop
    day_group := case when r.day_of_week between 0 and 4 then 'weekday' else 'weekend' end;
    select * into profile
    from public.schedule_profiles_v2
    where organization_id = p_org and day_group = day_group;

    if not found then
      skipped := skipped + 1;
      continue;
    end if;

    lesson_mins := profile.lesson_duration_minutes;
    select coalesce(array_agg(value::int order by ordinality), '{}')
      into breaks
    from jsonb_array_elements_text(profile.break_minutes) with ordinality;

    -- Slot başlangıçlarını üret, V1 start_time'a en yakın olanı seç
    cur := extract(hour from profile.start_time)::int * 60
         + extract(minute from profile.start_time)::int;
    lesson_start_mins := extract(hour from r.start_time)::int * 60
                       + extract(minute from r.start_time)::int;
    best_idx := 0;
    best_diff := 24 * 60;
    n := profile.slot_count;

    for i in 0..n-1 loop
      candidate_start := cur;
      if abs(candidate_start - lesson_start_mins) < best_diff then
        best_diff := abs(candidate_start - lesson_start_mins);
        best_idx := i;
        slot_start := make_time(candidate_start / 60, candidate_start % 60, 0);
        slot_end := make_time(
          (candidate_start + lesson_mins) / 60,
          (candidate_start + lesson_mins) % 60,
          0
        );
      end if;
      if i < n - 1 then
        cur := cur + lesson_mins + coalesce(breaks[i + 1], 10);
      end if;
    end loop;

    begin
      insert into public.lessons_v2 (
        organization_id, class_id, subject_id, teacher_id,
        day_of_week, start_time, end_time
      ) values (
        p_org, r.class_id, r.subject_id, r.teacher_id,
        r.day_of_week, slot_start, slot_end
      );
      copied := copied + 1;
    exception when unique_violation then
      skipped := skipped + 1;
    end;
  end loop;

  return jsonb_build_object('copied', copied, 'skipped', skipped);
end;
$$;

revoke all on function public.migrate_lessons_to_v2(uuid) from public;
grant execute on function public.migrate_lessons_to_v2(uuid) to authenticated;
