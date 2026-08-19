import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/site";
import { PRICING_PLANS } from "./pricing";

const FAQS = [
  {
    q: "Derso kimler için?",
    a: "Kurs merkezleri, özel okullar ve haftalık ders programı hazırlayan eğitim kurumları için tasarlandı.",
  },
  {
    q: "Programı nasıl oluştururum?",
    a: "Ders, öğretmen ve sınıf tanımlarını girin veya Excel ile aktarın; otomatik dağıtım kurallara göre yerleştirir, dilerseniz elle düzeltirsiniz.",
  },
  {
    q: "Paketler nasıl faturalanır?",
    a: "Aylık veya yıllık ödeme seçebilirsiniz. Yıllık planda 2 ay indirim uygulanır (12 ay yerine 10 ay tutarı). Fiyatlara KDV dahil değildir.",
  },
  {
    q: "Çıktılar nasıl alınır?",
    a: "Sınıf ve öğretmen programlarını Excel ve PDF olarak dışa aktarabilir; çarşaf listelerini yazdırılabilir formatta kullanabilirsiniz.",
  },
];

/** Landing için SoftwareApplication + WebSite + FAQPage + Offer JSON-LD. */
export default function LandingJsonLd() {
  const site = getSiteUrl();

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        url: site,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "tr-TR",
        publisher: { "@id": `${site}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${site}/#organization`,
        name: SITE_NAME,
        url: site,
        logo: `${site}/logo-192.png`,
        description: SITE_TAGLINE,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site}/#app`,
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: site,
        description: SITE_DESCRIPTION,
        inLanguage: "tr-TR",
        offers: PRICING_PLANS.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          price: String(plan.priceMonthly),
          priceCurrency: "TRY",
          description: plan.blurb,
          url: `${site}/#ucretlendirme`,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${site}/#faq`,
        mainEntity: FAQS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
