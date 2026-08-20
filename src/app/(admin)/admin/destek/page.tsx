import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Destek — Admin",
  robots: { index: false, follow: false },
};

type Conversation = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  organization_name: string | null;
  status: string;
  last_message_at: string;
  page: string | null;
};

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminSupportPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const filter =
    status === "open" || status === "closed" ? status : null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_conversations", {
    p_status: filter,
    p_limit: 200,
  });

  const rows = (data ?? []) as Conversation[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Destek sohbetleri</h1>
          <p className="text-sm text-slate-600 mt-1">
            Kullanıcı mesajlarını okuyun ve yanıtlayın.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/destek"
            className={`rounded-lg px-3 py-1.5 border ${
              !filter ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200"
            }`}
          >
            Tümü
          </Link>
          <Link
            href="/admin/destek?status=open"
            className={`rounded-lg px-3 py-1.5 border ${
              filter === "open"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white border-slate-200"
            }`}
          >
            Açık
          </Link>
          <Link
            href="/admin/destek?status=closed"
            className={`rounded-lg px-3 py-1.5 border ${
              filter === "closed"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white border-slate-200"
            }`}
          >
            Kapalı
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kişi</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Kurum</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Son mesaj</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Konuşma yok.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/destek/${row.id}`}
                      className="font-semibold text-indigo-700 hover:underline"
                    >
                      {row.full_name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">{row.phone}</p>
                    {row.email ? (
                      <p className="text-xs text-slate-400">{row.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                    {row.organization_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                        row.status === "open"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {row.status === "open" ? "Açık" : "Kapalı"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-500">
                    {new Date(row.last_message_at).toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
