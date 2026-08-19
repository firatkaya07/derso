/** Marketing SEO route list — proxy, sitemap ve nav için tek kaynak. */
export const SEO_SOLUTION_PATHS = [
  "/otomatik-ders-programi",
  "/okul-ders-programi",
  "/kurs-ders-programi",
] as const;

export const SEO_FEATURE_PATHS = [
  "/esnek-ders-programi",
  "/ogretmen-ders-programi",
  "/ders-programi-excel-pdf",
] as const;

export const SEO_STATIC_PATHS = [
  ...SEO_SOLUTION_PATHS,
  ...SEO_FEATURE_PATHS,
  "/blog",
] as const;

export function isPublicMarketingPath(path: string): boolean {
  if (path === "/" || path.startsWith("/login") || path.startsWith("/auth")) {
    return true;
  }
  if (path === "/blog" || path.startsWith("/blog/")) {
    return true;
  }
  return (SEO_STATIC_PATHS as readonly string[]).some(
    (p) => p !== "/blog" && (path === p || path.startsWith(`${p}/`))
  );
}
