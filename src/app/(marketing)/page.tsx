import type { Metadata } from "next";
import LandingJsonLd from "@/components/landing/LandingJsonLd";
import LandingPage from "@/components/landing/LandingPage";
import {
  HOME_SEO_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  getSiteUrl,
} from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: {
    absolute: HOME_SEO_TITLE,
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_SEO_TITLE,
    description: SITE_DESCRIPTION,
    url: siteUrl,
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_SEO_TITLE,
    description: SITE_DESCRIPTION,
  },
};

/** Oturum açmış kullanıcılar proxy ile /home’a yönlendirilir. */
export default function MarketingHomePage() {
  return (
    <>
      <LandingJsonLd />
      <LandingPage />
    </>
  );
}
