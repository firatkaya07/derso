-- Derso — temel şema
--
-- Gün numaralandırması tüm tablolarda aynıdır: 0 = Pazartesi ... 6 = Pazar
-- (bkz. src/lib/types.ts içindeki DAY_NAMES).
--
-- Ders saatleri 40 dakika + 10 dakika teneffüs olarak hesaplanır; bir "lessons"
-- satırı tek bir 40 dakikalık ders saatini temsil eder.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- teachers
-- ---------------------------------------------------------------------------
create table if not exists public.teachers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(btrim(name)) > 0),
  phone          text,
  email          text,
  -- Öğretmenin ders veremeyeceği günler.
  off_days       smallint[] not null default '{}'::smallint[]
                   check (off_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  specialization text,
  created_at     timestamptz not null default now()
);

create unique index if not exists teachers_name_unique
  on public.teachers (lower(btrim(name)));

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  -- Programlarda ve PDF çıktılarında kullanılan kısaltma.
  short_name text check (short_name is null or length(short_name) <= 5),
  color      text not null default '#3B82F6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Virgülle ayrılmış sınıf düzeyleri, örn. '9,10,11,12' veya 'Mezun'.
  level      text,
  -- Virgülle ayrılmış alan kodları, örn. 'TM,MF'. Boşsa tüm alanlara uygulanır.
  subgroups  text,
  created_at timestamptz not null default now()
);

create unique index if not exists subjects_name_unique
  on public.subjects (lower(btrim(name)));

-- ---------------------------------------------------------------------------
-- classes
-- ---------------------------------------------------------------------------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  description text,
  level       text,
  subgroup    text,
  created_at  timestamptz not null default now()
);

create unique index if not exists classes_name_unique
  on public.classes (lower(btrim(name)));

-- ---------------------------------------------------------------------------
-- class_schedule_days — bir sınıfın hangi gün, hangi saat aralığında ders gördüğü
-- ---------------------------------------------------------------------------
create table if not exists public.class_schedule_days (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  constraint class_schedule_days_time_order check (end_time > start_time),
  constraint class_schedule_days_unique_day unique (class_id, day_of_week)
);

create index if not exists class_schedule_days_class_idx
  on public.class_schedule_days (class_id);

-- ---------------------------------------------------------------------------
-- class_subjects — sınıf müfredatı: hangi ders, haftada kaç saat, kim veriyor
-- ---------------------------------------------------------------------------
create table if not exists public.class_subjects (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes (id) on delete cascade,
  subject_id   uuid not null references public.subjects (id) on delete cascade,
  weekly_hours smallint not null default 0 check (weekly_hours between 0 and 40),
  -- Sabit öğretmen ataması. Boşsa otomatik atama algoritması karar verir.
  teacher_id   uuid references public.teachers (id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint class_subjects_unique unique (class_id, subject_id)
);

create index if not exists class_subjects_class_idx
  on public.class_subjects (class_id);
create index if not exists class_subjects_subject_idx
  on public.class_subjects (subject_id);
create index if not exists class_subjects_teacher_idx
  on public.class_subjects (teacher_id);

-- ---------------------------------------------------------------------------
-- teacher_subjects — bir öğretmenin verebildiği dersler
-- ---------------------------------------------------------------------------
create table if not exists public.teacher_subjects (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint teacher_subjects_unique unique (teacher_id, subject_id)
);

create index if not exists teacher_subjects_teacher_idx
  on public.teacher_subjects (teacher_id);
create index if not exists teacher_subjects_subject_idx
  on public.teacher_subjects (subject_id);

-- ---------------------------------------------------------------------------
-- lessons — yerleşmiş program. Bir satır = bir ders saati.
--
-- İki tekillik kısıtı çakışmayı veritabanı düzeyinde engeller: bir sınıf aynı
-- anda tek ders görebilir, bir öğretmen aynı anda tek sınıfta olabilir.
-- ---------------------------------------------------------------------------
create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete restrict,
  teacher_id  uuid not null references public.teachers (id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  constraint lessons_time_order check (end_time > start_time),
  constraint lessons_class_slot_unique unique (class_id, day_of_week, start_time),
  constraint lessons_teacher_slot_unique unique (teacher_id, day_of_week, start_time)
);

create index if not exists lessons_class_idx on public.lessons (class_id);
create index if not exists lessons_teacher_idx on public.lessons (teacher_id);
create index if not exists lessons_subject_idx on public.lessons (subject_id);
