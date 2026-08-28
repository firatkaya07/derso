-- Eşli ders çiftleri (kurum başına özelleştirilebilir; null → uygulama varsayılanları)

alter table public.settings
  add column if not exists paired_subject_pairs jsonb default null;

comment on column public.settings.paired_subject_pairs is
  'Optional [["A","B"],...] paired subject names; null uses built-in defaults';
