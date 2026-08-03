/**
 * Genel Tanımlar için gerekli tablo. İçerik
 * `supabase/migrations/0003_settings.sql` ile aynı tutulmalıdır; uygulama
 * bu metni kopyalanabilir kurulum kutusu olarak gösterir.
 */
export const SETTINGS_SETUP_SQL = `-- Derso — kurum geneli tanımlar
-- Supabase: SQL Editor > New query > yapıştır > Run

create table if not exists public.settings (
  id                      boolean primary key default true check (id),

  province                text,
  district                text,
  institution_name        text,
  principal_name          text,
  vice_principal_name     text,

  logo_data_url           text check (
                            logo_data_url is null
                            or logo_data_url like 'data:image/%'
                          ),

  academic_year           text,

  lesson_duration_minutes smallint not null default 40
                            check (lesson_duration_minutes between 5 and 180),
  break_duration_minutes  smallint not null default 10
                            check (break_duration_minutes between 0 and 60),

  updated_at              timestamptz not null default now()
);

insert into public.settings (id) values (true) on conflict (id) do nothing;

alter table public.settings enable row level security;
drop policy if exists settings_authenticated_all on public.settings;
create policy settings_authenticated_all
  on public.settings
  for all
  to authenticated
  using (true)
  with check (true);
`;
