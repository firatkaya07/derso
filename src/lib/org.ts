import type { SupabaseClient } from "@supabase/supabase-js";
import { throwIfDbError } from "./db-error";

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: "owner" | "admin" | "member";
}

/**
 * Giriş yapan kullanıcının kurumunu döner. Birden fazla üyelik varsa
 * en eski kaydı seçer (MVP: kullanıcı başına tipik olarak bir kurum).
 */
export async function getCurrentMembership(
  supabase: SupabaseClient
): Promise<OrganizationMembership | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const result = await supabase
    .from("organization_members")
    .select("organization_id, role, organization:organizations(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (result.error || !result.data) return null;

  const org = result.data.organization as
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;

  const resolved = Array.isArray(org) ? org[0] : org;
  if (!resolved) return null;

  return {
    organizationId: resolved.id,
    organizationName: resolved.name,
    role: result.data.role as OrganizationMembership["role"],
  };
}

/** Yeni kurum oluşturur; çağıran kullanıcı owner olur. */
export async function createOrganization(
  supabase: SupabaseClient,
  name: string
): Promise<string> {
  const result = await supabase.rpc("create_organization", {
    p_name: name.trim(),
  });
  throwIfDbError(result, "Kurum oluşturulamadı");
  return result.data as string;
}
