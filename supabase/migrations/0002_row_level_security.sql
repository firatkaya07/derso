-- Derso — satır düzeyi güvenlik (RLS)
--
-- Derso tek kurumlu (single tenant) bir uygulamadır: giriş yapabilen herkes
-- kurum personelidir ve tüm veriyi görüp düzenleyebilir. Bu yüzden politikalar
-- "authenticated" rolüne tam yetki verir.
--
-- Kritik olan nokta, RLS'in AÇIK olmasıdır: NEXT_PUBLIC_SUPABASE_ANON_KEY
-- tanımı gereği herkese açıktır, dolayısıyla "anon" rolünün hiçbir politikası
-- olmaması tek gerçek korumadır. Aşağıdaki tabloların herhangi birinde RLS
-- kapatılırsa veri anahtarı bilen herkese açılır.
--
-- İleride kullanıcıları rollere ayırmak isterseniz (örn. sadece yönetici
-- yazabilsin), bu dosyadaki politikaları daraltmak yeterlidir.

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'teachers',
    'subjects',
    'classes',
    'class_schedule_days',
    'class_subjects',
    'teacher_subjects',
    'lessons'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_authenticated_all', tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      tbl || '_authenticated_all',
      tbl
    );
  end loop;
end
$$;
