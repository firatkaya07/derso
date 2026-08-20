import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getRequestSupabase } from "@/lib/cache/request";

export type AdminDashboardStats = {
  organizations: number;
  users: number;
  open_conversations: number;
  total_conversations: number;
  messages_today: number;
  awaiting_reply: number;
};

/** Platform admin kontrolü — aynı RSC isteğinde tek round-trip. */
export const requirePlatformAdmin = cache(async () => {
  const supabase = await getRequestSupabase();
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
});

export async function isPlatformAdmin(): Promise<boolean> {
  const gate = await requirePlatformAdmin();
  return gate.ok;
}

/** Admin istatistikleri — layout + sayfa aynı isteğinde paylaşılır. */
export const getAdminDashboardStats = cache(async () => {
  const supabase = await getRequestSupabase();
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  return {
    stats: (data ?? {}) as AdminDashboardStats,
    error,
  };
});
