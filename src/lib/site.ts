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
  "Ders programı hazırlama programı — otomatik ders programı";

export const SITE_DESCRIPTION =
  "Derso ile okul ve kurslar için otomatik ders programı oluşturun. Öğretmen ve sınıf çakışmalarını önleyin, esnek programlar hazırlayın, Excel ve PDF çıktısı alın.";

/** Ana sayfa SEO title (absolute). */
export const HOME_SEO_TITLE =
  "Ders Programı Hazırlama Programı | Otomatik Ders Programı | Derso";

export const SITE_KEYWORDS = [
  "ders programı hazırlama programı",
  "ders programı hazırlama",
  "ders programı oluşturma",
  "otomatik ders programı",
  "ders dağıtım programı",
  "haftalık ders programı",
  "öğretmen ders programı",
  "okul ders programı",
  "kurs ders programı",
  "esnek ders programı",
  "Excel ders programı",
  "PDF ders programı",
  "Derso",
  "Dersomatik",
] as const;
