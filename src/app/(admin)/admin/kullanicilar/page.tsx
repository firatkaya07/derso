import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Kullanıcılar — Admin",
  robots: { index: false, follow: false },
};

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  organization_name: string | null;
  organization_role: string | null;
  is_platform_admin: boolean;
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users");
  const rows = (data ?? []) as UserRow[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kullanıcılar</h1>
        <p className="text-sm text-slate-600 mt-1">
          Auth kullanıcıları ve bağlı kurum bilgileri.
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
              <th className="px-4 py-3 font-medium">E-posta</th>
              <th className="px-4 py-3 font-medium">Kurum</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Rol</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Son giriş</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <span className="font-medium">{row.email}</span>
                  {row.is_platform_admin ? (
                    <span className="ml-2 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                      Platform admin
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.organization_name || "—"}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                  {row.organization_role || "—"}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-slate-500">
                  {row.last_sign_in_at
                    ? new Date(row.last_sign_in_at).toLocaleString("tr-TR")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
