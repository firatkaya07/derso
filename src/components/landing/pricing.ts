/** Landing ücret paketleri — tek kaynak. */
export interface PricingPlan {
  id: string;
  name: string;
  blurb: string;
  /** Aylık fiyat (TRY, KDV hariç gösterim). */
  priceMonthly: number;
  /** Yıllık toplam (TRY); aylık × 10 gibi indirimli. */
  priceYearly: number;
  cta: string;
  featured?: boolean;
  features: string[];
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "baslangic",
    name: "Başlangıç",
    blurb: "Küçük kurslar ve ilk dönem kurulumları için.",
    priceMonthly: 490,
    priceYearly: 4_900,
    cta: "Başlangıç ile başla",
    features: [
      "1 kurum",
      "En fazla 12 sınıf",
      "2 kullanıcı",
      "Otomatik dağıtım",
      "Excel içe aktarma",
      "Yazdırılabilir çıktılar",
    ],
  },
  {
    id: "profesyonel",
    name: "Profesyonel",
    blurb: "Yoğun dönemlerde çalışan kurs merkezleri için.",
    priceMonthly: 990,
    priceYearly: 9_900,
    cta: "Profesyonel’i seç",
    featured: true,
    features: [
      "1 kurum",
      "En fazla 40 sınıf",
      "8 kullanıcı",
      "Otomatik dağıtım + izleme",
      "Excel içe aktarma",
      "Sınıf ve öğretmen programları",
      "Öncelikli e-posta destek",
    ],
  },
  {
    id: "kurumsal",
    name: "Kurumsal",
    blurb: "Okul ve çok şubeli yapılar için tam kapasite.",
    priceMonthly: 1_990,
    priceYearly: 19_900,
    cta: "Kurumsal’a geç",
    features: [
      "Sınırsız sınıf",
      "Sınırsız kullanıcı",
      "Çok kurum (şube) desteği",
      "Tüm Profesyonel özellikler",
      "Özel onboarding",
      "Telefon / öncelikli destek",
    ],
  },
];

export function formatTry(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}
