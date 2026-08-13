import Image from "next/image";
import Link from "next/link";
import ScheduleHeroVisual from "./ScheduleHeroVisual";

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
    text: "Sınıf ve öğretmen ızgarasında ince ayar yapın, resmî formatta çıktı alın.",
  },
];

const HIGHLIGHTS = [
  {
    title: "Çakışmasız çizelge",
    text: "Sınıf ve öğretmen aynı anda tek yerde. İzin günleri ve günlük ders limiti korunur.",
  },
  {
    title: "Excel ile hızlı kurulum",
    text: "Şablonu doldurun; doğrulama satır satır hata gösterir, aynı dosyayı tekrar aktarabilirsiniz.",
  },
  {
    title: "Resmî çıktılar",
    text: "Çarşaf listeleri ve sınıf/öğretmen programları yazdırılabilir formatta hazır.",
  },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav__inner">
          <Link href="/" className="landing-brand">
            <Image
              src="/logo.png"
              alt=""
              width={40}
              height={40}
              className="landing-brand__mark"
              priority
            />
            <span className="landing-brand__name">Derso</span>
          </Link>

          <nav className="landing-nav__links" aria-label="Sayfa bölümleri">
            <a href="#nasil">Nasıl çalışır</a>
            <a href="#ozellikler">Özellikler</a>
          </nav>

          <div className="landing-nav__actions">
            <Link href="/login" className="landing-btn landing-btn--ghost">
              Giriş Yap
            </Link>
            <Link href="/login" className="landing-btn landing-btn--solid">
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-hero__atmosphere" aria-hidden="true" />
          <div className="landing-hero__inner">
            <div className="landing-hero__copy">
              <p className="landing-hero__brand">Derso</p>
              <h1 id="landing-hero-title" className="landing-hero__title">
                Haftalık ders programını
                <span> dakikalar içinde kurun</span>
              </h1>
              <p className="landing-hero__lede">
                Kurs merkezleri ve okullar için: öğretmen, sınıf ve dersleri
                yönetin; otomatik dağıtın, elle ince ayar yapın, yazdırın.
              </p>
              <div className="landing-hero__cta">
                <Link href="/login" className="landing-btn landing-btn--accent">
                  Hemen deneyin
                </Link>
                <a href="#nasil" className="landing-btn landing-btn--line">
                  Nasıl çalışır?
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
              Veriyi bir kez tanımlayın; dağıtım ve çıktı aynı sistemde kalsın.
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

        <section id="ozellikler" className="landing-section landing-features">
          <div className="landing-section__inner">
            <p className="landing-kicker">Neden Derso</p>
            <h2 className="landing-section__title">Program işi için tasarlandı</h2>
            <p className="landing-section__lede">
              Genel tablolar değil; çakışma, izin ve müfredat saatlerini bilen bir
              çizelgeleme aracı.
            </p>

            <div className="landing-features__list">
              {HIGHLIGHTS.map((item) => (
                <article key={item.title} className="landing-features__item">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="landing-cta-title">
          <div className="landing-cta__inner">
            <h2 id="landing-cta-title">Bu dönem programı hazır olsun</h2>
            <p>
              Kurumunuzu oluşturun, verilerinizi yükleyin; ilk dağıtımı aynı gün
              alın.
            </p>
            <Link href="/login" className="landing-btn landing-btn--accent">
              Ücretsiz hesap aç
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <Link href="/" className="landing-brand landing-brand--footer">
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="landing-brand__mark"
            />
            <span className="landing-brand__name">Derso</span>
          </Link>
          <p>Kurs ve okul ders programı yönetimi</p>
        </div>
      </footer>
    </div>
  );
}
