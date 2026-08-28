import { createClient } from "@/lib/supabase/client";
import { resizeImageToSquareWebpBlob } from "@/lib/image";
import { LOGO_SIZE } from "@/lib/settings";

export const LOGO_BUCKET = "institution-logos";

/**
 * Kurum logosunu depolamaya yükler ve public URL döndürür.
 * Mevcut data URL'ler olduğu gibi kalabilir; yeni yüklemeler depolamaya gider.
 */
export async function uploadInstitutionLogo(
  organizationId: string,
  file: File
): Promise<string> {
  const blob = await resizeImageToSquareWebpBlob(file, LOGO_SIZE);
  const path = `${organizationId}/logo.webp`;
  const supabase = createClient();

  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: true,
    contentType: "image/webp",
  });

  if (error) {
    throw new Error(error.message || "Logo yüklenemedi.");
  }

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
