/** Kullanıcının kendi iptal anını okur. Satır yoksa null. */
export const SESSION_REVOKED_AT_RPC = "session_revoked_at";

/** Platform admin tüm cihazlardaki oturumu kapatır. */
export const ADMIN_REVOKE_USER_SESSIONS_RPC = "admin_revoke_user_sessions";

/**
 * Access token'ın `iat` değeri bu andan önceyse oturum düşürülmüştür.
 * Yeni giriş daha sonraki bir `iat` aldığı için açık kalır.
 */
export function isSessionRevoked(
  issuedAtSeconds: number | null,
  revokedAtIso: string | null
): boolean {
  if (revokedAtIso == null || issuedAtSeconds == null) return false;
  if (!Number.isFinite(issuedAtSeconds)) return false;
  const revokedMs = Date.parse(revokedAtIso);
  if (Number.isNaN(revokedMs)) return false;
  return issuedAtSeconds * 1000 < revokedMs;
}

export function revokedAtValue(data: unknown): string | null {
  return typeof data === "string" && data.trim().length > 0 ? data : null;
}

/** İmzayı doğrulamaz; yalnızca istemcinin elindeki token'ın üretim anını okur. */
export function accessTokenIssuedAt(
  accessToken: string | null | undefined
): number | null {
  if (!accessToken) return null;
  const segment = accessToken.split(".")[1];
  if (!segment) return null;
  try {
    const json = JSON.parse(decodeBase64Url(segment)) as { iat?: unknown };
    return typeof json.iat === "number" && Number.isFinite(json.iat)
      ? json.iat
      : null;
  } catch {
    return null;
  }
}

export function sessionAccessRevoked(
  accessToken: string | null | undefined,
  revokedAt: unknown
): boolean {
  return isSessionRevoked(accessTokenIssuedAt(accessToken), revokedAtValue(revokedAt));
}

function decodeBase64Url(segment: string): string {
  const padded = segment
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(segment.length / 4) * 4, "=");
  return globalThis.atob(padded);
}
