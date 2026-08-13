import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Derso — Kurs ve okul ders programı",
  description:
    "Haftalık ders programını otomatik oluşturun. Öğretmen, sınıf ve dersleri yönetin; çakışmasız dağıtın, yazdırın.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${sans.variable}`}>{children}</div>
  );
}
