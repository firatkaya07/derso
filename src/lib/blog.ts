import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type BlogPostListItem = {
  slug: string;
  title: string;
  h1: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  published_at: string;
  updated_at: string;
};

export type BlogPost = BlogPostListItem & {
  content_md: string;
};

const LIST_COLUMNS =
  "slug, title, h1, excerpt, meta_title, meta_description, keywords, published_at, updated_at";

async function fetchPublishedBlogPosts(): Promise<BlogPostListItem[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(LIST_COLUMNS)
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("blog_posts list error:", error.message);
    return [];
  }

  return (data ?? []) as BlogPostListItem[];
}

export const listPublishedBlogPosts = unstable_cache(
  fetchPublishedBlogPosts,
  ["blog-posts-list"],
  { revalidate: 3600, tags: ["blog"] }
);

export const getBlogPostBySlug = unstable_cache(
  async (slug: string): Promise<BlogPost | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(`${LIST_COLUMNS}, content_md`)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      console.error("blog_posts get error:", error.message);
      return null;
    }

    return data as BlogPost | null;
  },
  ["blog-post-by-slug"],
  { revalidate: 3600, tags: ["blog"] }
);

export async function listBlogSlugs(): Promise<string[]> {
  const posts = await listPublishedBlogPosts();
  return posts.map((p) => p.slug);
}
