import Image from "next/image";
import Link from "next/link";

type MarketingNavProps = {
  activeHref?: string;
};

const NAV_LINKS = [
  { href: "/otomatik-ders-programi", label: "Otomatik program" },
  { href: "/okul-ders-programi", label: "Okul" },
  { href: "/kurs-ders-programi", label: "Kurs" },
  { href: "/blog", label: "Rehberler" },
] as const;

export function MarketingNav({ activeHref }: MarketingNavProps) {
  return (
    <header className="landing-nav">
      <div className="landing-nav__inner">
        <Link href="/" className="landing-brand" aria-label="Derso ana sayfa">
          <Image
            src="/logo.webp"
            alt="Derso logosu"
            width={40}
            height={40}
            className="landing-brand__mark"
            priority
          />
          <span className="landing-brand__name">Derso</span>
        </Link>

        <nav className="landing-nav__links" aria-label="Sayfa bölümleri">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={activeHref === link.href ? "is-active" : undefined}
            >
              {link.label}
            </Link>
          ))}
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
  );
}

export function MarketingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <Link href="/" className="landing-brand landing-brand--footer">
          <Image
            src="/logo.webp"
            alt="Derso logosu"
            width={28}
            height={28}
            className="landing-brand__mark"
          />
          <span className="landing-brand__name">Derso</span>
        </Link>
        <nav className="landing-footer__nav" aria-label="Alt bilgi">
          <Link href="/otomatik-ders-programi">Otomatik ders programı</Link>
          <Link href="/okul-ders-programi">Okul</Link>
          <Link href="/kurs-ders-programi">Kurs</Link>
          <Link href="/esnek-ders-programi">Esnek program</Link>
          <Link href="/ders-programi-excel-pdf">Excel / PDF</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/login">Giriş</Link>
        </nav>
        <p>Kurs ve okul ders programı yönetimi</p>
        <p className="landing-footer__copy">
          © {new Date().getFullYear()} Derso. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
