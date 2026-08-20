import { createClient } from "@/lib/supabase/client";

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

function safeFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

export async function uploadSupportAttachment(
  conversationId: string,
  file: File
): Promise<{
  path: string;
  name: string;
  mime: string;
  size: number;
  publicUrl: string;
}> {
  const validated = validateSupportFile(file);
  if ("error" in validated) {
    throw new Error(validated.error);
  }

  const supabase = createClient();
  const ext = safeFileName(file.name);
  const path = `support/${conversationId}/${crypto.randomUUID()}_${ext}`;

  const { error } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    throw new Error(error.message || "Dosya yüklenemedi.");
  }

  const { data } = supabase.storage.from(SUPPORT_BUCKET).getPublicUrl(path);

  return {
    path,
    name: file.name,
    mime: file.type,
    size: file.size,
    publicUrl: data.publicUrl,
  };
}

export function publicUrlForAttachment(path: string): string {
  const supabase = createClient();
  return supabase.storage.from(SUPPORT_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function isImageMime(mime: string | null | undefined): boolean {
  return !!mime && IMAGE_TYPES.has(mime);
}
