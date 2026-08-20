import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

type Stats = {
  organizations: number;
  users: number;
  open_conversations: number;
  total_conversations: number;
  messages_today: number;
};

export default async function AdminHomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  const stats = (data ?? {}) as Stats;

  const cards = [
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yönetim özeti</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Destek sohbetleri, kurumlar ve kullanıcıları buradan yönetin.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          İstatistikler yüklenemedi: {error.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow transition-all"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Hızlı işlemler</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/admin/destek?status=open" className="text-indigo-600 hover:underline">
              Açık destek konuşmalarını yanıtla
            </Link>
          </li>
          <li>
            <Link href="/admin/kurumlar" className="text-indigo-600 hover:underline">
              Kurum listesini görüntüle
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
