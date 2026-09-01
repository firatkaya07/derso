import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { AdminOrganizationRow } from "@/lib/admin";
import { formatInteger, formatShortDate } from "@/lib/admin-metrics";

export const metadata: Metadata = {
  title: "Kurumlar — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminOrgsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_organizations");
  const rows = (data ?? []) as AdminOrganizationRow[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kurumlar</h1>
        <p className="text-sm text-slate-600 mt-1">
          Kayıtlı eğitim kurumları, dağıtılmış ders programı ve özet sayılar.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kurum</th>
              <th className="px-4 py-3 font-medium">Program</th>
              <th className="px-4 py-3 font-medium">Üye</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">
                Öğretmen
              </th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">
                Sınıf
              </th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">
                Kayıt
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Kurum yok.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/admin/raporlar?days=30#org-${row.id}`}
                      className="hover:text-indigo-700 hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ScheduleStatus row={row} />
                  </td>
                  <td className="px-4 py-3">{row.member_count}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {row.teacher_count}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {row.class_count}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                    {new Date(row.created_at).toLocaleDateString("tr-TR")}
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

function ScheduleStatus({ row }: { row: AdminOrganizationRow }) {
  if (!row.has_schedule) {
    return (
      <div>
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          Yok
        </span>
        <p className="mt-1 text-[11px] text-slate-500">Dağıtılmış program yok</p>
      </div>
    );
  }

  const hours = (row.lesson_count ?? 0) + (row.lesson_count_v2 ?? 0);
  const editions = [
    row.lesson_count > 0 ? "V1" : null,
    row.lesson_count_v2 > 0 ? "V2" : null,
  ].filter(Boolean);

  return (
    <div>
      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        Var
      </span>
      {editions.length > 0 ? (
        <span className="ml-1 text-[11px] font-medium text-slate-500">
          {editions.join(" · ")}
        </span>
      ) : null}
      <p className="mt-1 text-[11px] text-slate-500">
        {formatInteger(hours)} saat
        {row.last_scheduled_at
          ? ` · ${formatShortDate(row.last_scheduled_at)}`
          : ""}
      </p>
    </div>
  );
}
