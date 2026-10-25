"use server";

import { requirePlatformAdmin } from "@/lib/admin";
import { getRequestSupabase } from "@/lib/cache/request";
import { ADMIN_REVOKE_USER_SESSIONS_RPC } from "@/lib/session-revocation";

const USER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function revokeUserSessions(
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requirePlatformAdmin();
  if (!gate.ok || !gate.user) {
    return { ok: false, message: "Yetkisiz" };
  }
  if (!USER_ID.test(userId)) {
    return { ok: false, message: "Kullanıcı gerekli" };
  }
  if (gate.user.id === userId) {
    return { ok: false, message: "Kendi oturumunuzu buradan kapatamazsınız." };
  }

  const supabase = await getRequestSupabase();
  const { error } = await supabase.rpc(ADMIN_REVOKE_USER_SESSIONS_RPC, {
    p_user_id: userId,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
