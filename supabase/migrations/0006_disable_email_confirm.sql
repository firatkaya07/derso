-- E-posta doğrulamasını fiilen kapatır:
-- 1) Mevcut onaylanmamış kullanıcıları onaylar
-- 2) Yeni kayıtlarda email_confirmed_at anında set edilir
--    (Supabase panelinde "Confirm email" açık kalsa bile giriş çalışır)

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

create or replace function auth.auto_confirm_email()
returns trigger
language plpgsql
security definer
set search_path = auth
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row
  execute function auth.auto_confirm_email();
