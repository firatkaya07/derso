import Link from "next/link";
import TrackedLink from "@/components/TrackedLink";
import type { ReactNode } from "react";
import ScheduleHeroVisual from "./ScheduleHeroVisual";
import PricingSection from "./PricingSection";
import { MarketingFooter, MarketingNav } from "./MarketingChrome";

const STEPS = [
  {
    num: "01",
    title: "Tanımları girin",
    text: "Dersler, öğretmenler ve sınıfları ekleyin; Excel şablonuyla toplu aktarın.",
  },
  {
    num: "02",
    title: "Otomatik dağıtın",
    text: "Kurallara uyan haftalık programı saniyeler içinde oluşturun; açıkta kalanları görün.",
  },
  {
    num: "03",
    title: "Düzenleyip yazdırın",
    text: "Sınıf ve öğretmen ızgarasında ince ayar yapın, Excel veya PDF çıktı alın.",
  },
];

type Capability = {
  id: string;
  kicker: string;
  title: string;
  paragraphs: ReactNode[];
};

const CAPABILITIES: Capability[] = [
  {
    id: "esnek",
    kicker: "Esnek planlama",
    title: "Esnek ders programlarını kolayca yönetin",
    paragraphs: [
      <>
        Her eğitim kurumunun ders planlama ihtiyaçları aynı değildir. Derso ile
        standart haftalık programların yanı sıra kurumunuza özel{" "}
        <Link href="/esnek-ders-programi">esnek ders programları</Link>{" "}
        oluşturabilir ve yönetebilirsiniz.
      </>,
      "Öğretmenlerin uygunluklarını, farklı ders saatlerini, sınıf ihtiyaçlarını ve kurumunuza özel planlama kurallarını tanımlayarak ders programınızı kendi çalışma düzeninize göre şekillendirebilirsiniz.",
      "Program oluşturulduktan sonra gerekli değişiklikleri kolayca yapabilir, derslerin gün ve saatlerini ihtiyacınıza göre düzenleyebilirsiniz.",
    ],
  },
  {
    id: "hafta-sonu",
    kicker: "7 gün planlama",
    title: "Hafta sonunu da kapsayan ders programları oluşturun",
    paragraphs: [
      <>
        Eğitim yalnızca hafta içiyle sınırlı değil. Özellikle{" "}
        <Link href="/kurs-ders-programi">kurs merkezleri</Link>, özel öğretim
        kurumları ve etüt merkezleri için Cumartesi ve Pazar günlerini kapsayan
        ders programları oluşturabilirsiniz.
      </>,
      "Derso ile haftanın 7 günü için ders planlaması yapabilir; hafta içi ve hafta sonu derslerini aynı program üzerinden yönetebilirsiniz.",
      "Böylece farklı çalışma günlerine ve saatlerine sahip kurumlar için çok daha esnek bir ders planlama süreci oluşturabilirsiniz.",
    ],
  },
  {
    id: "disa-aktarim",
    kicker: "Dışa aktarım",
    title: "Ders programınızı Excel ve PDF olarak dışa aktarın",
    paragraphs: [
      <>
        Hazırladığınız ders programlarını yalnızca sistem üzerinden görüntülemekle
        kalmaz, ihtiyaç duyduğunuzda{" "}
        <Link href="/ders-programi-excel-pdf">Excel ve PDF</Link> formatında dışa
        aktarabilirsiniz.
      </>,
      "Sınıf ve öğretmen programlarını Excel veya PDF olarak indirerek kurum yönetimiyle paylaşabilir, öğretmenlere iletebilir veya çıktı alarak kurum içerisinde kullanabilirsiniz.",
      "Bu sayede hazırladığınız programları farklı platformlarda kullanabilir ve arşivleyebilirsiniz.",
    ],
  },
];

const REASONS: { text: string; href?: string }[] = [
  { text: "Otomatik ders programı oluşturma", href: "/otomatik-ders-programi" },
  { text: "Öğretmen ve sınıf çakışma kontrolü" },
  { text: "Öğretmen uygunluklarını tanımlama", href: "/ogretmen-ders-programi" },
  { text: "Haftalık ders saatlerini otomatik dağıtma" },
  { text: "Haftanın 7 günü ders programı oluşturma", href: "/esnek-ders-programi" },
  { text: "Cumartesi ve Pazar derslerini planlama" },
  {
    text: "Esnek ders programları oluşturma ve yönetme",
    href: "/esnek-ders-programi",
  },
  { text: "Excel ile toplu veri aktarımı" },
  {
    text: "Ders programını Excel olarak dışa aktarma",
    href: "/ders-programi-excel-pdf",
  },
  {
    text: "Ders programını PDF olarak dışa aktarma",
    href: "/ders-programi-excel-pdf",
  },
  { text: "Sınıf bazlı ders programı görüntüleme" },
  {
    text: "Öğretmen bazlı ders programı görüntüleme",
    href: "/ogretmen-ders-programi",
  },
  { text: "Program üzerinde manuel düzenleme" },
  { text: "Yazdırılabilir ders programları ve çarşaf listeleri" },
  {
    text: "Okul, kurs merkezi ve çok şubeli eğitim kurumları için kullanım",
    href: "/okul-ders-programi",
  },
];

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

export default function LandingPage() {
  return (
    <div className="landing">
      <MarketingNav />

      <main id="icerik">
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-hero__atmosphere" aria-hidden="true" />
          <div className="landing-hero__inner">
            <div className="landing-hero__copy">
              <p className="landing-hero__brand">Derso</p>
              <h1 id="landing-hero-title" className="landing-hero__title">
                Ders Programı Hazırlamanın
                <span> En Kolay Yolu</span>
              </h1>
              <p className="landing-hero__lede">
                Derso ile{" "}
                <Link href="/otomatik-ders-programi">otomatik ders programı</Link>{" "}
                oluşturarak öğretmen ve sınıf çakışmalarını önleyebilirsiniz.{" "}
                <Link href="/okul-ders-programi">Okul</Link> ve{" "}
                <Link href="/kurs-ders-programi">kurs merkezleri</Link> için{" "}
                <Link href="/esnek-ders-programi">esnek ders programları</Link>{" "}
                hazırlayın;{" "}
                <Link href="/ders-programi-excel-pdf">Excel ve PDF</Link> çıktısı
                alın.
              </p>
              <div className="landing-hero__cta">
                <TrackedLink
                  href="/login"
                  className="landing-btn landing-btn--accent"
                  trackLocation="hero"
                  trackLead
                  trackLabel="hemen_deneyin"
                >
                  Hemen deneyin
                </TrackedLink>
                <a href="#ucretlendirme" className="landing-btn landing-btn--line">
                  Paketleri gör
                </a>
              </div>
            </div>

            <div className="landing-hero__stage">
              <ScheduleHeroVisual />
            </div>
          </div>
        </section>

        <section id="nasil" className="landing-section landing-steps">
          <div className="landing-section__inner">
            <p className="landing-kicker">Üç adım</p>
            <h2 className="landing-section__title">Kurulumdan çıktıya net akış</h2>
            <p className="landing-section__lede">
              Veriyi bir kez tanımlayın; ders dağıtımı ve program çıktısı aynı
              sistemde kalsın.
            </p>

            <ol className="landing-steps__list">
              {STEPS.map((step) => (
                <li key={step.num} className="landing-steps__item">
                  <span className="landing-steps__num">{step.num}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {CAPABILITIES.map((item, index) => (
          <section
            key={item.id}
            id={item.id}
            className={`landing-section landing-capability${
              index % 2 === 1 ? " landing-capability--alt" : ""
            }`}
          >
            <div className="landing-section__inner">
              <p className="landing-kicker">{item.kicker}</p>
              <h2 className="landing-section__title landing-section__title--wide">
                {item.title}
              </h2>
              <div className="landing-capability__body">
                {item.paragraphs.map((text, i) => (
                  <p key={i}>{text}</p>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section id="ozellikler" className="landing-section landing-features">
          <div className="landing-section__inner">
            <p className="landing-kicker">Neden Derso</p>
            <h2 className="landing-section__title landing-section__title--wide">
              Neden Derso ders programı hazırlama programı?
            </h2>
            <p className="landing-section__lede">
              Derso, eğitim kurumlarının karmaşık ders dağıtım süreçlerini daha
              hızlı ve kolay yönetebilmesi için geliştirilmiştir.{" "}
              <Link href="/blog/ders-programi-nasil-hazirlanir">
                Ders programı nasıl hazırlanır?
              </Link>{" "}
              rehberine de göz atabilirsiniz.
            </p>

            <ul className="landing-reasons">
              {REASONS.map((reason) => (
                <li key={reason.text}>
                  {reason.href ? (
                    <Link href={reason.href}>{reason.text}</Link>
                  ) : (
                    reason.text
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <PricingSection />

        <section id="sss" className="landing-section landing-faq">
          <div className="landing-section__inner">
            <p className="landing-kicker">SSS</p>
            <h2 className="landing-section__title">Sıkça sorulan sorular</h2>
            <p className="landing-section__lede">
              Ders programı yazılımı hakkında kısa cevaplar.
            </p>

            <div className="landing-faq__list">
              {FAQS.map((item) => (
                <details key={item.q} className="landing-faq__item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="landing-cta-title">
          <div className="landing-cta__inner">
            <h2 id="landing-cta-title">Bu dönem programı hazır olsun</h2>
            <p>
              Kurumunuzu oluşturun, verilerinizi yükleyin; ilk ders dağıtımını
              aynı gün alın.
            </p>
            <TrackedLink
              href="/login"
              className="landing-btn landing-btn--accent"
              trackLocation="landing_footer"
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
