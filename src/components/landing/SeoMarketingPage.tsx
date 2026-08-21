import type { Metadata } from "next";
import Link from "next/link";
import TrackedLink from "@/components/TrackedLink";
import {
  MarketingFooter,
  MarketingNav,
} from "@/components/landing/MarketingChrome";
import type { SeoPageDef } from "@/lib/seo-pages";
import { SITE_NAME, getSiteUrl } from "@/lib/site";

export function buildSeoMetadata(page: SeoPageDef): Metadata {
  const site = getSiteUrl();
  const url = `${site}${page.path}`;
  return {
    title: { absolute: page.title },
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: page.path },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      type: "website",
      locale: "tr_TR",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
  };
}

export default function SeoMarketingPage({ page }: { page: SeoPageDef }) {
  return (
    <div className="landing">
      <MarketingNav activeHref={page.path} />

      <main>
        <section className="landing-seo-hero" aria-labelledby="seo-h1">
          <div className="landing-seo-hero__inner">
            <p className="landing-kicker">{page.kicker}</p>
            <h1 id="seo-h1" className="landing-seo-hero__title">
              {page.h1}
            </h1>
            <div className="landing-seo-hero__intro">
              {page.intro.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <div className="landing-hero__cta">
              <TrackedLink
                href="/login"
                className="landing-btn landing-btn--accent"
                trackLocation="seo_hero"
                trackLead
                trackLabel="ucretsiz_deneyin"
              >
                Ücretsiz deneyin
              </TrackedLink>
              <Link href="/#ucretlendirme" className="landing-btn landing-btn--line">
                Paketleri gör
              </Link>
            </div>
          </div>
        </section>

        {page.sections.map((section) => (
          <section
            key={section.heading}
            className="landing-section landing-capability"
          >
            <div className="landing-section__inner">
              <h2 className="landing-section__title landing-section__title--wide">
                {section.heading}
              </h2>
              <div className="landing-capability__body">
                {section.paragraphs.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </div>
            </div>
          </section>
        ))}

        {page.related && page.related.length > 0 ? (
          <section className="landing-section landing-capability landing-capability--alt">
            <div className="landing-section__inner">
              <p className="landing-kicker">İlgili sayfalar</p>
              <h2 className="landing-section__title">Daha fazla keşfedin</h2>
              <ul className="landing-related">
                {page.related.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section className="landing-cta" aria-labelledby="seo-cta-title">
          <div className="landing-cta__inner">
            <h2 id="seo-cta-title">Ders programınızı otomatik oluşturun</h2>
            <p>
              Öğretmen, sınıf ve derslerinizi tanımlayın; Derso ile dakikalar
              içinde çakışmasız program alın.
            </p>
            <TrackedLink
              href="/login"
              className="landing-btn landing-btn--accent"
              trackLocation="seo_footer"
              trackLead
              trackLabel="ucretsiz_hesap_ac"
            >
              Ücretsiz hesap aç
            </TrackedLink>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
