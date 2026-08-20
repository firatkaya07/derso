import { createClient } from "@/lib/supabase/server";

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) {
    console.error("is_platform_admin:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, user: null };
  }
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error || !data) {
    return { ok: false as const, user };
  }
  return { ok: true as const, user };
}
