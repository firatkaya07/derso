-- Derso — kurum alanları (TM, MF, SAY, …)
-- Sınıf ve ders formlarındaki "Alanlar" listesi bu tablodan gelir.

create table if not exists public.fields (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (length(btrim(name)) > 0),
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  unique (organization_id, name)
);

create unique index if not exists fields_org_name_unique
  on public.fields (organization_id, lower(btrim(name)));

create index if not exists fields_organization_id_idx
  on public.fields (organization_id);

-- Mevcut kurumlara varsayılan alanları ekle
insert into public.fields (organization_id, name, sort_order)
select o.id, f.name, f.sort_order
from public.organizations o
cross join (
  values
    ('TM', 1),
    ('MF', 2),
    ('SAY', 3),
    ('SÖZ', 4),
    ('DİL', 5),
    ('HİBRİT', 6)
) as f(name, sort_order)
on conflict (organization_id, name) do nothing;

alter table public.fields enable row level security;

drop policy if exists fields_org_isolation on public.fields;
create policy fields_org_isolation
  on public.fields for all to authenticated
  using (organization_id in (select public.user_organization_ids()))
  with check (organization_id in (select public.user_organization_ids()));

-- Yeni kurum açılınca varsayılan alanları da oluştur
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

  insert into public.fields (organization_id, name, sort_order)
  values
    (new_id, 'TM', 1),
    (new_id, 'MF', 2),
    (new_id, 'SAY', 3),
    (new_id, 'SÖZ', 4),
    (new_id, 'DİL', 5),
    (new_id, 'HİBRİT', 6);

  return new_id;
end;
$$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;
