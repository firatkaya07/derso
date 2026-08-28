-- Kullanıcı başına program sürümü tercihi (V1 / V2)

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  schedule_edition text not null default 'v1'
    check (schedule_edition in ('v1', 'v2')),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own
  on public.user_preferences for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own
  on public.user_preferences for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own
  on public.user_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
