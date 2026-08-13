-- Derso — üyelik self-join ve açık kurum insert kapatma
--
-- Önceki politika, authenticated kullanıcının organization_id bilerek
-- organization_members'a kendini eklemesine izin veriyordu. Üyelik ekleme
-- yalnızca security definer RPC'ler (create_organization) üzerinden olmalı.
-- Kurum oluşturma da aynı şekilde doğrudan INSERT değil RPC ile yapılmalı.

drop policy if exists organization_members_insert_own on public.organization_members;

drop policy if exists organizations_insert_authenticated on public.organizations;

-- create_organization zaten security definer; RLS'i aşar.
-- İleride davet için ayrı bir invite_member RPC eklenebilir.
