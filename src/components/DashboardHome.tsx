"use client";

import Link from "next/link";
import { useEdition } from "@/components/EditionProvider";
import type { ScheduleEdition } from "@/lib/edition";

type Card = {
  href: string;
  title: string;
  description: string;
  icon: string;
};

const SHARED_CARDS: Card[] = [
  {
    href: "/dersler",
    title: "Dersler",
    description: "Ders tanımlamaları ve seviye atamaları",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  {
    href: "/ogretmenler",
    title: "Öğretmenler",
    description: "Branş, ders ve izin günü yönetimi",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    href: "/siniflar",
    title: "Sınıflar",
    description: "Şube, ders atamaları ve günlük program",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    href: "/aktarim",
    title: "Excel İçe Aktarma",
    description: "Şablonla toplu veri yükle",
    icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
  },
];

function versionedCards(edition: ScheduleEdition): Card[] {
  const prefix = edition === "v2" ? "/v2" : "";
  const suffix = edition === "v2" ? " (V2)" : "";
  return [
    {
      href: edition === "v2" ? "/v2/tanimlar" : "/tanimlar",
      title: `Genel Tanımlar${suffix}`,
      description:
        edition === "v2"
          ? "Hafta içi / hafta sonu zaman çizelgesi ve teneffüsler"
          : "Kurum bilgileri, logo ve ders süreleri",
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    },
    ...SHARED_CARDS,
    {
      href: `${prefix}/dagitim`,
      title: `Otomatik Dağıtım${suffix}`,
      description:
        edition === "v2"
          ? "V2 zaman çizelgesine göre program üret"
          : "Kurallara göre haftalık program oluştur",
      icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    },
    {
      href: `${prefix}/program`,
      title: `Sınıf Programları${suffix}`,
      description:
        edition === "v2"
          ? "Hafta içi / hafta sonu legend’li ızgara"
          : "Sınıfların haftalık ders programı",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    },
    {
      href: `${prefix}/ogretmen-programlari`,
      title: `Öğretmen Programları${suffix}`,
      description:
        edition === "v2"
          ? "V2 ders yerleşimleri"
          : "Öğretmenlerin haftalık programı",
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    },
    {
      href: `${prefix}/indirme`,
      title: `Program İndir${suffix}`,
      description:
        edition === "v2"
          ? "Hafta içi ve hafta sonu ayrı PDF/Excel tabloları"
          : "PDF formatında program indir",
      icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
  ];
}

export default function DashboardHome() {
  const { edition, ready } = useEdition();
  const cards = versionedCards(edition);
  const isV2 = edition === "v2";

  return (
    <div>
      {isV2 && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Derso V2
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Hafta içi ve hafta sonu için ayrı ders saatleri, teneffüsler ve
            çıktılar. V1 programı etkilenmez.
          </p>
        </div>
      )}

      {!ready ? (
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          Yükleniyor…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group relative rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-all duration-250 hover:-translate-y-0.5 ${
                isV2
                  ? "hover:border-emerald-300 hover:shadow-md"
                  : "hover:border-[var(--color-primary-muted)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)]"
              }`}
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-250 ${
                  isV2
                    ? "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100"
                    : "bg-[var(--color-primary-light)] group-hover:bg-[var(--color-primary-muted)]"
                }`}
              >
                <svg
                  className={`h-5 w-5 ${isV2 ? "" : "text-[var(--color-primary)]"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={card.icon}
                  />
                </svg>
              </div>
              <h3
                className={`font-semibold text-[var(--color-text)] transition-colors duration-200 ${
                  isV2
                    ? "group-hover:text-emerald-700"
                    : "group-hover:text-[var(--color-primary)]"
                }`}
              >
                {card.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
