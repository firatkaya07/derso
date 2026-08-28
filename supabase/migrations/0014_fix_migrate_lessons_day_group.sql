-- Fix ambiguous day_group in migrate_lessons_to_v2
-- (PL/pgSQL variable name collided with schedule_profiles_v2.day_group)

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
  v_day_group text;
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
    v_day_group := case when r.day_of_week between 0 and 4 then 'weekday' else 'weekend' end;
    select * into profile
    from public.schedule_profiles_v2 sp
    where sp.organization_id = p_org and sp.day_group = v_day_group;

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
