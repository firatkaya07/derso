import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/site";

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
    q: "Çıktılar nasıl alınır?",
    a: "Sınıf ve öğretmen programları ile çarşaf listeleri yazdırılabilir HTML olarak açılır; tarayıcıdan PDF kaydedebilirsiniz.",
  },
];

/** Landing için SoftwareApplication + WebSite + FAQPage JSON-LD. */
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
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "TRY",
        },
        featureList: [
          "Otomatik ders dağıtımı",
          "Excel ile toplu aktarım",
          "Sınıf ve öğretmen programları",
          "Yazdırılabilir çıktılar",
        ],
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
