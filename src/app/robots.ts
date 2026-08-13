import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: [
        "/home",
        "/dersler",
        "/ogretmenler",
        "/siniflar",
        "/aktarim",
        "/dagitim",
        "/program",
        "/ogretmen-programlari",
        "/indirme",
        "/tanimlar",
        "/onboarding",
        "/auth/",
      ],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
