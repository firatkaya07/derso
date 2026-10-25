-- Platform admin bir kullanıcının tüm oturumlarını kapatabilsin.
--
-- Access token süresi dolana kadar geçerli kalır. Bu yüzden iki şey birden
-- yapılır: auth.sessions silinir (yenileme biter) ve session_revocations
-- satırı yazılır (açık uygulama, token süresi dolmadan giriş ekranına döner).
-- Yeni giriş, revoked_at sonrasında üretildiği için etkilenmez.

create table if not exists public.session_revocations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revoked_at timestamptz not null,
  revoked_by uuid references auth.users (id) on delete set null
);

alter table public.session_revocations enable row level security;

drop policy if exists session_revocations_select_own on public.session_revocations;
create policy session_revocations_select_own
  on public.session_revocations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.session_revocations from public, anon, authenticated;
grant select on table public.session_revocations to authenticated;

create or replace function public.session_revoked_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select r.revoked_at
  from public.session_revocations r
  where r.user_id = auth.uid();
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

  insert into public.session_revocations (user_id, revoked_at, revoked_by)
  values (p_user_id, now(), auth.uid())
  on conflict (user_id) do update
    set revoked_at = excluded.revoked_at,
        revoked_by = excluded.revoked_by;

  if to_regclass('auth.mfa_amr_claims') is not null then
    delete from auth.mfa_amr_claims
    where session_id in (
      select s.id from auth.sessions s where s.user_id = p_user_id
    );
  end if;

  delete from auth.refresh_tokens
  where user_id::text = p_user_id::text
     or session_id in (
       select s.id from auth.sessions s where s.user_id = p_user_id
     );

  delete from auth.sessions
  where user_id = p_user_id;
end;
$$;

revoke all on function public.session_revoked_at() from public, anon;
revoke all on function public.admin_revoke_user_sessions(uuid) from public, anon;

grant execute on function public.session_revoked_at() to authenticated;
grant execute on function public.admin_revoke_user_sessions(uuid) to authenticated;

alter table public.session_revocations replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.session_revocations;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
