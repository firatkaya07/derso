import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MarketingFooter,
  MarketingNav,
} from "@/components/landing/MarketingChrome";
import { getBlogPostBySlug, listBlogSlugs } from "@/lib/blog";
import { renderBlogMarkdown } from "@/lib/blog-markdown";
import { SITE_NAME, getSiteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await listBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: "Yazı bulunamadı" };

  const url = `${getSiteUrl()}/blog/${post.slug}`;
  return {
    title: { absolute: post.meta_title },
    description: post.meta_description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.meta_title,
      description: post.meta_description,
      url,
      type: "article",
      locale: "tr_TR",
      siteName: SITE_NAME,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta_title,
      description: post.meta_description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const html = renderBlogMarkdown(post.content_md);

  return (
    <div className="landing">
      <MarketingNav activeHref="/blog" />
      <main id="icerik">
        <article className="landing-blog-article">
          <header className="landing-seo-hero landing-seo-hero--article">
            <div className="landing-seo-hero__inner">
              <p className="landing-kicker">
                <Link href="/blog">Rehberler</Link>
              </p>
              <h1 className="landing-seo-hero__title">{post.h1}</h1>
              <p className="landing-seo-hero__intro">{post.excerpt}</p>
              <time dateTime={post.published_at}>
                {new Date(post.published_at).toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>
          </header>

          <div
            className="landing-blog-prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <section className="landing-cta" aria-labelledby="blog-cta">
            <div className="landing-cta__inner">
              <h2 id="blog-cta">
                Tüm bu işlemleri tek tek yapmak yerine Derso ile ders
                programınızı otomatik oluşturabilirsiniz.
              </h2>
              <p>
                Öğretmen, sınıf ve derslerinizi tanımlayın; çakışmasız programı
                dakikalar içinde alın.
              </p>
              <Link href="/login" className="landing-btn landing-btn--accent">
                Ücretsiz deneyin
              </Link>
            </div>
          </section>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
