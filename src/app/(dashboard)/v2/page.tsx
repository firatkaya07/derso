import Link from "next/link";

const cards = [
  {
    href: "/v2/tanimlar",
    title: "Genel Tanımlar (V2)",
    description: "Hafta içi / hafta sonu zaman çizelgesi ve teneffüsler",
  },
  {
    href: "/dersler",
    title: "Dersler",
    description: "Ortak ders tanımları (V1 ile paylaşılır)",
  },
  {
    href: "/ogretmenler",
    title: "Öğretmenler",
    description: "Ortak öğretmen kayıtları",
  },
  {
    href: "/siniflar",
    title: "Sınıflar",
    description: "Sınıf pencereleri V2 slotlarına göre filtrelenir",
  },
  {
    href: "/aktarim",
    title: "Excel İçe Aktarma",
    description: "Ortak veri aktarımı",
  },
  {
    href: "/v2/dagitim",
    title: "Otomatik Dağıtım (V2)",
    description: "V2 zaman çizelgesine göre program üret",
  },
  {
    href: "/v2/program",
    title: "Sınıf Programları (V2)",
    description: "Hafta içi / hafta sonu legend’li ızgara",
  },
  {
    href: "/v2/ogretmen-programlari",
    title: "Öğretmen Programları (V2)",
    description: "V2 ders yerleşimleri",
  },
  {
    href: "/v2/indirme",
    title: "Program İndir (V2)",
    description: "Hafta içi ve hafta sonu ayrı PDF/Excel tabloları",
  },
];

export default function V2HomePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Derso V2
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Hafta içi ve hafta sonu için ayrı ders saatleri, teneffüsler ve çıktılar.
          V1 programı etkilenmez.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-[var(--color-border)] bg-white p-5 transition hover:border-emerald-300 hover:shadow-md"
          >
            <h2 className="font-semibold text-[var(--color-text)] group-hover:text-emerald-700">
              {card.title}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
