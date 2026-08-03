-- Derso — kurum geneli tanımlar
--
-- Tablo tek satırlıdır: `id` sütunu yalnızca true değerini kabul eder, bu
-- yüzden ikinci bir satır eklenemez. Böylece uygulama "ayarlar kaydı hangisi"
-- sorusuyla uğraşmaz.

create table if not exists public.settings (
  id                      boolean primary key default true check (id),

  -- Resmî yazışma başlığında kullanılır.
  province                text,
  district                text,
  institution_name        text,
  principal_name          text,
  vice_principal_name     text,

  -- 100x100 piksele ölçeklenmiş logo, data URL olarak saklanır.
  -- Ayrı bir depolama alanı kurmaya gerek kalmaz ve yazdırma penceresi
  -- görseli ağa çıkmadan gösterebilir.
  logo_data_url           text check (
                            logo_data_url is null
                            or logo_data_url like 'data:image/%'
                          ),

  -- Örnek: "2025-2026". Boşsa çıktılarda içinde bulunulan yıla göre üretilir.
  academic_year           text,

  -- Ders saati ızgarası bu iki değerden üretilir.
  lesson_duration_minutes smallint not null default 40
                            check (lesson_duration_minutes between 5 and 180),
  break_duration_minutes  smallint not null default 10
                            check (break_duration_minutes between 0 and 60),

  updated_at              timestamptz not null default now()
);

-- Uygulamanın her zaman okuyacak bir satır bulması için varsayılan kayıt.
insert into public.settings (id) values (true) on conflict (id) do nothing;

alter table public.settings enable row level security;
drop policy if exists settings_authenticated_all on public.settings;
create policy settings_authenticated_all
  on public.settings
  for all
  to authenticated
  using (true)
  with check (true);
