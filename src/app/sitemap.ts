import type { MetadataRoute } from "next";
import { listPublishedBlogPosts } from "@/lib/blog";
import { SEO_STATIC_PATHS } from "@/lib/marketing-routes";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: site,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...SEO_STATIC_PATHS.map((path) => ({
      url: `${site}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "/blog" ? 0.8 : 0.85,
    })),
  ];

  const posts = await listPublishedBlogPosts();
  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${site}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at || post.published_at),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...blogEntries];
}
