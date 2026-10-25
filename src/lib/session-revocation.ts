/** Çağıran oturumun session_id'si iptal listesindeyse true. */
export const SESSION_IS_REVOKED_RPC = "session_is_revoked";

/** Platform admin, kullanıcının o anki oturumlarını iptal listesine yazar. */
export const ADMIN_REVOKE_USER_SESSIONS_RPC = "admin_revoke_user_sessions";

export function rpcFlag(data: unknown): boolean {
  return data === true;
}

/** İmzayı doğrulamaz; yalnızca eldeki token'ın session_id değerini okur. */
export function accessTokenSessionId(
  accessToken: string | null | undefined
): string | null {
  if (!accessToken) return null;
  const segment = accessToken.split(".")[1];
  if (!segment) return null;
  try {
    const json = JSON.parse(decodeBase64Url(segment)) as { session_id?: unknown };
    return typeof json.session_id === "string" && json.session_id.length > 0
      ? json.session_id
      : null;
  } catch {
    return null;
  }
}

/** Realtime olayı bu cihazın oturumuna aitse düşürülmeli. */
export function sessionIdMatches(
  accessToken: string | null | undefined,
  sessionId: unknown
): boolean {
  const current = accessTokenSessionId(accessToken);
  return current != null && typeof sessionId === "string" && current === sessionId;
}

function decodeBase64Url(segment: string): string {
  const padded = segment
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(segment.length / 4) * 4, "=");
  return globalThis.atob(padded);
}
