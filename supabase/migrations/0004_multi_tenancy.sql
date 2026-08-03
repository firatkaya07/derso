-- Derso — çok kurumlu (multi-tenant) yapı
--
-- Her satır bir kuruma aittir. Kullanıcı auth.users üzerinden
-- organization_members ile kuruma bağlanır. RLS, auth.uid() üyesinin
-- kurumlarına ait satırları gösterir; diğer kurumlar görünmez.

-- ---------------------------------------------------------------------------
-- 1. Kurum ve üyelik
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'owner'
                    check (role in ('owner', 'admin', 'member')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- Bir kullanıcının üye olduğu kurum kimlikleri (RLS için).
create or replace function public.user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid();
$$;

revoke all on function public.user_organization_ids() from public;
grant execute on function public.user_organization_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Mevcut veriyi tek bir kuruma taşı
-- ---------------------------------------------------------------------------

do $$
declare
  org_id uuid;
  org_name text;
begin
  select coalesce(
    nullif(btrim(institution_name), ''),
    'Varsayılan Kurum'
  )
  into org_name
  from public.settings
  where id = true
  limit 1;

  if org_name is null then
    org_name := 'Varsayılan Kurum';
  end if;

  select id into org_id from public.organizations limit 1;
  if org_id is null then
    insert into public.organizations (name)
    values (org_name)
    returning id into org_id;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  select org_id, u.id, 'owner'
  from auth.users u
  on conflict (organization_id, user_id) do nothing;

  alter table public.teachers
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
  alter table public.subjects
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
  alter table public.classes
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
  alter table public.class_schedule_days
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
  alter table public.class_subjects
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
  alter table public.teacher_subjects
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
  alter table public.lessons
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
  alter table public.settings
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

  update public.teachers set organization_id = org_id where organization_id is null;
  update public.subjects set organization_id = org_id where organization_id is null;
  update public.classes set organization_id = org_id where organization_id is null;
  update public.class_schedule_days set organization_id = org_id where organization_id is null;
  update public.class_subjects set organization_id = org_id where organization_id is null;
  update public.teacher_subjects set organization_id = org_id where organization_id is null;
  update public.lessons set organization_id = org_id where organization_id is null;
  update public.settings set organization_id = org_id where organization_id is null;

  insert into public.settings (organization_id, institution_name)
  select org_id, org_name
  where not exists (select 1 from public.settings where organization_id = org_id);
end $$;

alter table public.teachers alter column organization_id set not null;
alter table public.subjects alter column organization_id set not null;
alter table public.classes alter column organization_id set not null;
alter table public.class_schedule_days alter column organization_id set not null;
alter table public.class_subjects alter column organization_id set not null;
alter table public.teacher_subjects alter column organization_id set not null;
alter table public.lessons alter column organization_id set not null;
alter table public.settings alter column organization_id set not null;

-- Eski ada-göre unique indeksler → kurum + ad
drop index if exists public.teachers_name_unique;
drop index if exists public.subjects_name_unique;
drop index if exists public.classes_name_unique;

create unique index if not exists teachers_org_name_unique
  on public.teachers (organization_id, lower(btrim(name)));
create unique index if not exists subjects_org_name_unique
  on public.subjects (organization_id, lower(btrim(name)));
create unique index if not exists classes_org_name_unique
  on public.classes (organization_id, lower(btrim(name)));

-- settings: tek satırlı boolean PK → kurum başına bir satır
alter table public.settings drop constraint if exists settings_pkey;
alter table public.settings drop constraint if exists settings_id_check;
alter table public.settings drop column if exists id;
alter table public.settings
  drop constraint if exists settings_pkey;
alter table public.settings
  add constraint settings_pkey primary key (organization_id);

create index if not exists teachers_organization_id_idx on public.teachers (organization_id);
create index if not exists subjects_organization_id_idx on public.subjects (organization_id);
create index if not exists classes_organization_id_idx on public.classes (organization_id);
create index if not exists lessons_organization_id_idx on public.lessons (organization_id);
create index if not exists organization_members_user_id_idx on public.organization_members (user_id);

-- Alt tablolarda organization_id unutulursa üst kayıttan miras al.
create or replace function public.inherit_org_from_class()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.classes where id = new.class_id;
  end if;
  return new;
end;
$$;

create or replace function public.inherit_org_from_teacher()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.teachers where id = new.teacher_id;
  end if;
  return new;
end;
$$;

drop trigger if exists class_schedule_days_inherit_org on public.class_schedule_days;
create trigger class_schedule_days_inherit_org
  before insert on public.class_schedule_days
  for each row execute function public.inherit_org_from_class();

drop trigger if exists class_subjects_inherit_org on public.class_subjects;
create trigger class_subjects_inherit_org
  before insert on public.class_subjects
  for each row execute function public.inherit_org_from_class();

drop trigger if exists lessons_inherit_org on public.lessons;
create trigger lessons_inherit_org
  before insert on public.lessons
  for each row execute function public.inherit_org_from_class();

drop trigger if exists teacher_subjects_inherit_org on public.teacher_subjects;
create trigger teacher_subjects_inherit_org
  before insert on public.teacher_subjects
  for each row execute function public.inherit_org_from_teacher();

-- ---------------------------------------------------------------------------
-- 3. RLS — kurum izolasyonu
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
  on public.organizations for select to authenticated
  using (id in (select public.user_organization_ids()));

drop policy if exists organizations_update_member on public.organizations;
create policy organizations_update_member
  on public.organizations for update to authenticated
  using (id in (select public.user_organization_ids()))
  with check (id in (select public.user_organization_ids()));

drop policy if exists organizations_insert_authenticated on public.organizations;
create policy organizations_insert_authenticated
  on public.organizations for insert to authenticated
  with check (true);

drop policy if exists organization_members_select_own on public.organization_members;
create policy organization_members_select_own
  on public.organization_members for select to authenticated
  using (
    user_id = auth.uid()
    or organization_id in (select public.user_organization_ids())
  );

drop policy if exists organization_members_insert_own on public.organization_members;
create policy organization_members_insert_own
  on public.organization_members for insert to authenticated
  with check (user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'teachers',
    'subjects',
    'classes',
    'class_schedule_days',
    'class_subjects',
    'teacher_subjects',
    'lessons',
    'settings'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_org_isolation', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (organization_id in (select public.user_organization_ids()))
         with check (organization_id in (select public.user_organization_ids()))',
      t || '_org_isolation',
      t
    );
  end loop;
end $$;

-- Yeni kurum + üyelik + boş ayarlar (tek işlem; RLS select sorununu önler).
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  clean_name text := btrim(p_name);
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;
  if clean_name is null or length(clean_name) = 0 then
    raise exception 'Kurum adı gerekli';
  end if;

  insert into public.organizations (name)
  values (clean_name)
  returning id into new_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  insert into public.settings (organization_id, institution_name)
  values (new_id, clean_name)
  on conflict (organization_id) do nothing;

  return new_id;
end;
$$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;
