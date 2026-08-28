/**
 * V1 / V2 program sürümü — kullanıcı tercihi ve rota eşlemesi.
 */

export type ScheduleEdition = "v1" | "v2";

export const DEFAULT_EDITION: ScheduleEdition = "v1";

/** Uzun path’ler önce (ör. /dagitim/izleme, /dagitim’den önce). */
const VERSIONED_ROUTES: ReadonlyArray<{ v1: string; v2: string }> = [
  { v1: "/dagitim/izleme", v2: "/v2/dagitim/izleme" },
  { v1: "/dagitim", v2: "/v2/dagitim" },
  { v1: "/tanimlar", v2: "/v2/tanimlar" },
  { v1: "/program", v2: "/v2/program" },
  { v1: "/ogretmen-programlari", v2: "/v2/ogretmen-programlari" },
  { v1: "/indirme", v2: "/v2/indirme" },
];

export function parseEdition(value: unknown): ScheduleEdition {
  return value === "v2" ? "v2" : "v1";
}

/** Path bir sürüm rotasıyla eşleşiyorsa o sürümü döner. */
export function editionOfPath(pathname: string): ScheduleEdition | null {
  if (pathname === "/v2" || pathname.startsWith("/v2/")) return "v2";
  for (const route of VERSIONED_ROUTES) {
    if (pathname === route.v1 || pathname.startsWith(`${route.v1}/`)) {
      return "v1";
    }
  }
  return null;
}

/**
 * Tercih edilen sürüme göre path’i çevirir.
 * Değişiklik yoksa aynı path’i döner.
 */
export function pathForEdition(
  pathname: string,
  edition: ScheduleEdition
): string {
  for (const route of VERSIONED_ROUTES) {
    if (pathname === route.v1 || pathname.startsWith(`${route.v1}/`)) {
      const suffix = pathname.slice(route.v1.length);
      return edition === "v2" ? `${route.v2}${suffix}` : `${route.v1}${suffix}`;
    }
    if (pathname === route.v2 || pathname.startsWith(`${route.v2}/`)) {
      const suffix = pathname.slice(route.v2.length);
      return edition === "v2" ? `${route.v2}${suffix}` : `${route.v1}${suffix}`;
    }
  }

  if (pathname === "/v2" || pathname === "/v2/") {
    return edition === "v2" ? "/v2" : "/home";
  }

  if (pathname === "/home" || pathname === "/home/") {
    return edition === "v2" ? "/v2" : "/home";
  }

  return pathname;
}

export function tanimlarHref(edition: ScheduleEdition): string {
  return edition === "v2" ? "/v2/tanimlar" : "/tanimlar";
}

export function homeHref(edition: ScheduleEdition): string {
  return edition === "v2" ? "/v2" : "/home";
}
