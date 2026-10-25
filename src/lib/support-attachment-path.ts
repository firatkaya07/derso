/**
 * Destek dosyası yolu. Edge fonksiyonundaki kontrol ile aynı kalmalı:
 * supabase/functions/support-attachment/index.ts
 *
 * support/<konuşma-uuid>/<dosya-uuid>_<güvenli-ad>
 */

const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const PATH_RE = new RegExp(
  `^support/${UUID}/${UUID}_[A-Za-z0-9._-]{1,80}$`,
  "i"
);

export function isSupportAttachmentPath(
  conversationId: string,
  path: string
): boolean {
  if (!new RegExp(`^${UUID}$`, "i").test(conversationId)) return false;
  if (path.includes("..") || path.includes("\\") || path.includes("\0")) {
    return false;
  }
  const prefix = `support/${conversationId}/`;
  if (!path.toLowerCase().startsWith(prefix.toLowerCase())) return false;
  return PATH_RE.test(path);
}
