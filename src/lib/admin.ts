import { cache } from "react";
import { getRequestSupabase } from "@/lib/cache/request";
import type {
  AdminSystemHealth,
  AdminUsageReport,
} from "@/lib/admin-metrics";

export type AdminDashboardStats = {
  organizations: number;
  users: number;
  open_conversations: number;
  total_conversations: number;
  messages_today: number;
  awaiting_reply: number;
};

export type AdminOrganizationRow = {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
  teacher_count: number;
  class_count: number;
  has_schedule: boolean;
  lesson_count: number;
  lesson_count_v2: number;
  last_scheduled_at: string | null;
  downloads_30d: number;
  schedule_saves_30d: number;
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

export const getAdminSystemHealth = cache(async () => {
  const supabase = await getRequestSupabase();
  const { data, error } = await supabase.rpc("admin_system_health");
  return {
    health: (data ?? null) as AdminSystemHealth | null,
    error,
  };
});

export async function getAdminUsageReport(days: number) {
  const supabase = await getRequestSupabase();
  const { data, error } = await supabase.rpc("admin_usage_report", {
    p_days: days,
  });
  return {
    report: (data ?? null) as AdminUsageReport | null,
    error,
  };
}
