import type { Metadata } from "next";
import Link from "next/link";
import {
  MarketingFooter,
  MarketingNav,
} from "@/components/landing/MarketingChrome";
import { listPublishedBlogPosts } from "@/lib/blog";
import { SITE_NAME, getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: `Ders Programı Rehberleri | ${SITE_NAME}` },
  description:
    "Ders programı nasıl hazırlanır, Excel ile planlama ve kurs ders programı hakkında adım adım rehberler.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `Ders Programı Rehberleri | ${SITE_NAME}`,
    description:
      "Ders programı hazırlama, Excel planlama ve kurs programı rehberleri.",
    url: `${getSiteUrl()}/blog`,
    type: "website",
    locale: "tr_TR",
  },
};

export default async function BlogIndexPage() {
  const posts = await listPublishedBlogPosts();

  return (
    <div className="landing">
      <MarketingNav activeHref="/blog" />
      <main id="icerik">
        <section className="landing-seo-hero" aria-labelledby="blog-h1">
          <div className="landing-seo-hero__inner">
            <p className="landing-kicker">İçerik merkezi</p>
            <h1 id="blog-h1" className="landing-seo-hero__title">
              Ders programı rehberleri
            </h1>
            <p className="landing-seo-hero__intro">
              Okul ve kurslarda ders programı hazırlama sürecini adım adım
              anlatan rehberler. Organik aramalardan gelen sorulara net cevaplar.
            </p>
          </div>
        </section>

        <section className="landing-section landing-capability">
          <div className="landing-section__inner">
            {posts.length === 0 ? (
              <p className="landing-section__lede">
                Rehberler yakında yayınlanacak.
              </p>
            ) : (
              <ul className="landing-blog-list">
                {posts.map((post) => (
                  <li key={post.slug} className="landing-blog-list__item">
                    <Link href={`/blog/${post.slug}`}>
                      <h2>{post.title}</h2>
                      <p>{post.excerpt}</p>
                      <time dateTime={post.published_at}>
                        {new Date(post.published_at).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
