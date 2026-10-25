-- Platform admin bir kullanıcının oturumlarını işaretleyebilsin.
--
-- auth.sessions silinmez. Mağazadaki mevcut mobil sürüm bu tabloyu okumaz;
-- oturum satırı durduğu sürece token yenilemesi çalışır ve uygulama açık kalır.
-- Güncel web ve mobil, JWT içindeki session_id bu tablodaysa yerel çıkış yapar.
-- Yenileme aynı session_id'yi taşır, yeni giriş yeni bir session_id alır.

create table if not exists public.session_revocations (
  session_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  revoked_at timestamptz not null default now(),
  revoked_by uuid references auth.users (id) on delete set null
);

create index if not exists session_revocations_user_id_idx
  on public.session_revocations (user_id);

alter table public.session_revocations enable row level security;

drop policy if exists session_revocations_select_own on public.session_revocations;
create policy session_revocations_select_own
  on public.session_revocations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.session_revocations from public, anon, authenticated;
grant select on table public.session_revocations to authenticated;

create or replace function public.session_is_revoked()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  begin
    v_session := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  if v_session is null then
    return false;
  end if;

  return exists (
    select 1
    from public.session_revocations r
    where r.user_id = auth.uid()
      and r.session_id = v_session
  );
end;
$$;

create or replace function public.admin_revoke_user_sessions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Yetkisiz';
  end if;

  if p_user_id is null then
    raise exception 'Kullanıcı gerekli';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Kendi oturumunuzu buradan kapatamazsınız';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and u.deleted_at is null
  ) then
    raise exception 'Kullanıcı bulunamadı';
  end if;

  insert into public.session_revocations (session_id, user_id, revoked_at, revoked_by)
  select s.id, s.user_id, now(), auth.uid()
  from auth.sessions s
  where s.user_id = p_user_id
  on conflict (session_id) do update
    set revoked_at = excluded.revoked_at,
        revoked_by = excluded.revoked_by,
        user_id = excluded.user_id;
end;
$$;

revoke all on function public.session_is_revoked() from public, anon;
revoke all on function public.admin_revoke_user_sessions(uuid) from public, anon;

grant execute on function public.session_is_revoked() to authenticated;
grant execute on function public.admin_revoke_user_sessions(uuid) to authenticated;

alter table public.session_revocations replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.session_revocations;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
