/**
 * Genel Tanımlar / çok kurumlu kurulum referansı.
 * Canlı şema `supabase/migrations/0004_multi_tenancy.sql` ile yönetilir.
 */
export const SETTINGS_SETUP_SQL = `-- Derso — kurum ayarları (organization_id PK)
-- Supabase migration 0004 ile uygulanır; elle çalıştırmayın.

-- settings.organization_id → organizations.id (kurum başına bir satır)
-- RLS: organization_id in (select user_organization_ids())
`;
