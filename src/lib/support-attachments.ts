import { createClient } from "@/lib/supabase/client";
import { isSupportAttachmentPath } from "@/lib/support-attachment-path";

export const SUPPORT_BUCKET = "support-attachments";

/** Görseller: 5 MB */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Belgeler: 8 MB */
export const MAX_DOC_BYTES = 8 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const DOC_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export const ACCEPT_ATTR = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
].join(",");

export type ValidatedAttachment = {
  file: File;
  kind: "image" | "document";
  maxBytes: number;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateSupportFile(file: File): ValidatedAttachment | { error: string } {
  const mime = file.type || "application/octet-stream";

  if (IMAGE_TYPES.has(mime)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return {
        error: `Görsel en fazla ${formatBytes(MAX_IMAGE_BYTES)} olabilir (seçilen: ${formatBytes(file.size)}).`,
      };
    }
    return { file, kind: "image", maxBytes: MAX_IMAGE_BYTES };
  }

  if (DOC_TYPES.has(mime)) {
    if (file.size > MAX_DOC_BYTES) {
      return {
        error: `Belge en fazla ${formatBytes(MAX_DOC_BYTES)} olabilir (seçilen: ${formatBytes(file.size)}).`,
      };
    }
    return { file, kind: "document", maxBytes: MAX_DOC_BYTES };
  }

  return {
    error:
      "Desteklenen türler: JPG, PNG, WEBP, GIF, PDF, Word, Excel veya TXT.",
  };
}

type InvokeError = { message?: string; context?: Response };

async function invokeAttachment<T>(body: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("support-attachment", {
    body,
  });
  if (error) {
    throw new Error(await readInvokeError(error as InvokeError));
  }
  return data as T;
}

async function readInvokeError(error: InvokeError): Promise<string> {
  try {
    const body = (await error.context?.json()) as { error?: string } | null;
    if (body && typeof body.error === "string" && body.error.length > 0) {
      return body.error;
    }
  } catch {
    // Fonksiyon gövdesi JSON değilse genel metne düş.
  }
  return "Dosya işlemi başarısız.";
}

export async function uploadSupportAttachment(
  conversationId: string,
  file: File,
  guestToken: string | null
): Promise<{
  path: string;
  name: string;
  mime: string;
  size: number;
}> {
  const validated = validateSupportFile(file);
  if ("error" in validated) {
    throw new Error(validated.error);
  }

  const supabase = createClient();
  const ticket = await invokeAttachment<{ path?: string; token?: string }>({
    action: "upload",
    conversationId,
    fileName: file.name,
    contentType: file.type,
    guestToken,
  });
  if (!ticket.path || !ticket.token || !isSupportAttachmentPath(conversationId, ticket.path)) {
    throw new Error("Dosya yüklenemedi.");
  }

  const { error } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || "Dosya yüklenemedi.");
  }

  return {
    path: ticket.path,
    name: file.name,
    mime: file.type,
    size: file.size,
  };
}

export async function downloadSupportAttachment(
  conversationId: string,
  path: string,
  guestToken: string | null
): Promise<Blob> {
  if (!isSupportAttachmentPath(conversationId, path)) {
    throw new Error("Geçersiz dosya yolu.");
  }
  const ticket = await invokeAttachment<{ signedUrl?: string }>({
    action: "download",
    conversationId,
    path,
    guestToken,
  });
  if (!ticket.signedUrl) {
    throw new Error("Dosya açılamadı.");
  }
  const response = await fetch(ticket.signedUrl);
  if (!response.ok) {
    throw new Error("Dosya açılamadı.");
  }
  return response.blob();
}

export function isImageMime(mime: string | null | undefined): boolean {
  return !!mime && IMAGE_TYPES.has(mime);
}
