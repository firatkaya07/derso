import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "support-attachments";
const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(
  `^support/${UUID}/${UUID}_[A-Za-z0-9._-]{1,80}$`,
  "i"
);
const SIGNED_URL_SECONDS = 120;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

type Access =
  | { ok: true; isAdmin: boolean; status: string }
  | { ok: false };

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function authenticatedUserId(
  admin: ReturnType<typeof createClient>,
  req: Request
): Promise<string | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

function tokensMatch(stored: string | null, given: string | null): boolean {
  if (!stored || !given) return false;
  const a = new TextEncoder().encode(stored);
  const b = new TextEncoder().encode(given);
  if (a.length !== b.length || a.length < 32) return false;
  return timingSafeEqual(a, b);
}

function isSafePath(conversationId: string, path: string): boolean {
  if (!new RegExp(`^${UUID}$`, "i").test(conversationId)) return false;
  if (path.includes("..") || path.includes("\\") || path.includes("\0")) {
    return false;
  }
  const prefix = `support/${conversationId}/`;
  if (!path.toLowerCase().startsWith(prefix.toLowerCase())) return false;
  return PATH_RE.test(path);
}

function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);
  return cleaned || "dosya";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json(405, { error: "Yöntem desteklenmiyor." });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return json(500, { error: "Dosya servisi yapılandırılmamış." });
  }

  let body: {
    action?: string;
    conversationId?: string;
    path?: string;
    fileName?: string;
    contentType?: string;
    guestToken?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Geçersiz istek." });
  }

  const conversationId = body.conversationId?.trim() ?? "";
  if (!new RegExp(`^${UUID}$`, "i").test(conversationId)) {
    return json(400, { error: "Geçersiz konuşma." });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = await authenticatedUserId(admin, req);
  const access = await canAccess(
    admin,
    userId,
    conversationId,
    body.guestToken ?? null
  );
  if (!access.ok) {
    return json(403, { error: "Bu konuşmaya erişiminiz yok." });
  }

  if (body.action === "upload") {
    if (!access.isAdmin && access.status !== "open") {
      return json(403, { error: "Konuşma kapalı." });
    }
    const contentType = body.contentType?.trim() ?? "";
    if (!ALLOWED_MIME.has(contentType)) {
      return json(400, { error: "Dosya türü desteklenmiyor." });
    }
    const fileName = safeFileName(body.fileName?.trim() || "dosya");
    const path = `support/${conversationId}/${crypto.randomUUID()}_${fileName}`;
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.token) {
      return json(500, { error: "Yükleme bağlantısı oluşturulamadı." });
    }
    return json(200, { path, token: data.token });
  }

  if (body.action === "download") {
    const path = body.path?.trim() ?? "";
    if (!isSafePath(conversationId, path)) {
      return json(400, { error: "Geçersiz dosya yolu." });
    }
    const { data: message, error } = await admin
      .from("support_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("attachment_path", path)
      .limit(1)
      .maybeSingle();
    if (error || !message) {
      return json(404, { error: "Dosya bulunamadı." });
    }
    const { data, error: signError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (signError || !data?.signedUrl) {
      return json(500, { error: "Dosya açılamadı." });
    }
    return json(200, { signedUrl: data.signedUrl });
  }

  return json(400, { error: "Geçersiz işlem." });
});

async function canAccess(
  admin: ReturnType<typeof createClient>,
  userId: string | null,
  conversationId: string,
  guestToken: string | null
): Promise<Access> {
  const conversationQuery = admin
    .from("support_conversations")
    .select("user_id, status, guest_token")
    .eq("id", conversationId)
    .maybeSingle();

  const adminQuery = userId
    ? admin
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [conversationResult, adminResult] = await Promise.all([
    conversationQuery,
    adminQuery,
  ]);

  if (conversationResult.error || !conversationResult.data) return { ok: false };

  const conversation = conversationResult.data;
  if (userId && adminResult.data) {
    return { ok: true, isAdmin: true, status: conversation.status };
  }
  if (userId && conversation.user_id === userId) {
    return { ok: true, isAdmin: false, status: conversation.status };
  }
  if (tokensMatch(conversation.guest_token, guestToken)) {
    return { ok: true, isAdmin: false, status: conversation.status };
  }
  return { ok: false };
}
