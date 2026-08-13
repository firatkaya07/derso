/**
 * Canonical site adresi (sitemap, Open Graph, JSON-LD).
 * Üretim varsayılanı dersomatik.com; gerekirse NEXT_PUBLIC_SITE_URL ile override.
 */
export const PRODUCTION_SITE_URL = "https://dersomatik.com";

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    || process.env.VERCEL_URL?.trim();
  // Preview deploy'larda Vercel URL kullanılabilir; production'da sabit domain.
  if (vercel && !process.env.VERCEL_ENV?.includes("production")) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return PRODUCTION_SITE_URL;
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
  "Dersomatik",
] as const;
