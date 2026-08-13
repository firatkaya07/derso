/**
 * Mutlak site adresi (canonical, sitemap, Open Graph).
 * Üretimde NEXT_PUBLIC_SITE_URL tanımlayın (örn. https://derso.app).
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    || process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}

export const SITE_NAME = "Derso";

export const SITE_TAGLINE =
  "Kurs ve okul ders programı yönetimi";

export const SITE_DESCRIPTION =
  "Haftalık ders programını otomatik oluşturun. Öğretmen, sınıf ve dersleri yönetin; çakışmasız dağıtın, yazdırılabilir çıktı alın.";

export const SITE_KEYWORDS = [
  "ders programı",
  "ders dağıtım",
  "okul programı",
  "kurs merkezi",
  "otomatik çizelgeleme",
  "öğretmen programı",
  "sınıf programı",
  "Derso",
] as const;
