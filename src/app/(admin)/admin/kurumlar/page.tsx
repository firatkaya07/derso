import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Kurumlar — Admin",
  robots: { index: false, follow: false },
};

type OrgRow = {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
  teacher_count: number;
  class_count: number;
};

export default async function AdminOrgsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_organizations");
  const rows = (data ?? []) as OrgRow[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kurumlar</h1>
        <p className="text-sm text-slate-600 mt-1">
          Kayıtlı eğitim kurumları ve özet sayılar.
        </p>
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
              <th className="px-4 py-3 font-medium">Kurum</th>
              <th className="px-4 py-3 font-medium">Üye</th>
              <th className="px-4 py-3 font-medium">Öğretmen</th>
              <th className="px-4 py-3 font-medium">Sınıf</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Kayıt</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Kurum yok.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.member_count}</td>
                  <td className="px-4 py-3">{row.teacher_count}</td>
                  <td className="px-4 py-3">{row.class_count}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-500">
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
