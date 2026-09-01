import type { Metadata } from "next";
import Link from "next/link";
import {
  getAdminDashboardStats,
  getAdminSystemHealth,
} from "@/lib/admin";
import { buildHealthCards } from "@/lib/admin-metrics";
import { HealthMetricCard } from "@/components/admin/HealthMetricCard";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  const [{ stats, error }, { health, error: healthError }] = await Promise.all([
    getAdminDashboardStats(),
    getAdminSystemHealth(),
  ]);
  const awaiting = Number(stats.awaiting_reply ?? 0);
  const cards = health ? buildHealthCards(health) : [];

  const overview: {
    label: string;
    value: number;
    href: string;
    highlight?: boolean;
    badge?: string | null;
  }[] = [
    {
      label: "Kurumlar",
      value: stats.organizations ?? 0,
      href: "/admin/kurumlar",
    },
    {
      label: "Kullanıcılar",
      value: stats.users ?? 0,
      href: "/admin/kullanicilar",
    },
    {
      label: "Açık destek",
      value: stats.open_conversations ?? 0,
      href: "/admin/destek?status=open",
      highlight: awaiting > 0,
      badge: awaiting > 0 ? `${awaiting} yanıt bekliyor` : null,
    },
    {
      label: "Toplam konuşma",
      value: stats.total_conversations ?? 0,
      href: "/admin/destek",
    },
    {
      label: "Bugünkü mesaj",
      value: stats.messages_today ?? 0,
      href: "/admin/destek",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yönetim özeti</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Destek sohbetleri, kurumlar, kullanım ve sistem sağlığı.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          İstatistikler yüklenemedi: {error.message}
        </p>
      ) : null}

      {awaiting > 0 ? (
        <Link
          href="/admin/destek?status=open"
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 transition hover:border-amber-400 hover:bg-amber-100/80"
        >
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white"
            aria-hidden
          >
            !
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {awaiting} konuşmada yeni mesaj var
            </span>
            <span className="mt-0.5 block text-xs text-amber-800/90">
              Kullanıcı mesajı yanıt bekliyor. Destek listesine git.
            </span>
          </span>
        </Link>
      ) : null}

      <section aria-labelledby="health-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="health-heading" className="text-lg font-semibold tracking-tight">
              Sistem sağlığı
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Yayılım, etkinlik ve destek yükü. Renk tek başına anlam taşımaz;
              her kartta durum etiketi vardır.
            </p>
          </div>
          <Link
            href="/admin/raporlar"
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Kullanım raporları
          </Link>
        </div>

        {healthError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Sağlık metrikleri yüklenemedi: {healthError.message}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const body = (
                <HealthMetricCard
                  label={card.label}
                  value={card.value}
                  hint={card.hint}
                  tone={card.tone}
                />
              );
              return card.href ? (
                <Link
                  key={card.id}
                  href={card.href}
                  className="group block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  {body}
                </Link>
              ) : (
                <div key={card.id}>{body}</div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="overview-heading" className="space-y-3">
        <h2 id="overview-heading" className="text-lg font-semibold tracking-tight">
          Kayıt özeti
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overview.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow transition-all"
            >
              {card.badge ? (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <span aria-hidden>!</span>
                  {card.badge}
                </span>
              ) : null}
              <p className="text-sm text-slate-500">{card.label}</p>
              <p
                className={`mt-2 text-3xl font-bold tracking-tight ${
                  card.highlight ? "text-amber-700" : ""
                }`}
              >
                {card.value}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Hızlı işlemler</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link
              href="/admin/destek?status=open"
              className="inline-flex items-center gap-2 text-indigo-600 hover:underline"
            >
              Açık destek konuşmalarını yanıtla
              {awaiting > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {awaiting > 9 ? "9+" : awaiting}
                </span>
              ) : null}
            </Link>
          </li>
          <li>
            <Link href="/admin/kurumlar" className="text-indigo-600 hover:underline">
              Kurum listesini görüntüle
            </Link>
          </li>
          <li>
            <Link href="/admin/raporlar" className="text-indigo-600 hover:underline">
              İndirme ve dağıtım raporları
            </Link>
          </li>
          <li>
            <Link href="/admin/kullanicilar" className="text-indigo-600 hover:underline">
              Kullanıcıları incele
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
