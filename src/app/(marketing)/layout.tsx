import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import SkipToContent from "@/components/SkipToContent";
import { APP_STORE_ID } from "@/lib/site";
import "./landing.css";

const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-landing-display",
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-landing-sans",
  display: "swap",
});

/** Alt sayfalar kendi metadata'sını override eder; layout sadece font/CSS sağlar. */
export const metadata: Metadata = {
  robots: { index: true, follow: true },
  // iOS Safari'de üstte "App Store'da aç" akıllı banner'ı
  itunes: { appId: APP_STORE_ID },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${sans.variable}`}>
      <SkipToContent />
      {children}
    </div>
  );
}
