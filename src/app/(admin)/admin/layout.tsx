import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminDashboardStats,
  requirePlatformAdmin,
} from "@/lib/admin";

const NAV = [
  { href: "/admin", label: "Özet" },
  { href: "/admin/destek", label: "Destek", badge: true },
  { href: "/admin/kurumlar", label: "Kurumlar" },
  { href: "/admin/kullanicilar", label: "Kullanıcılar" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await requirePlatformAdmin();
  if (!gate.user) redirect("/login");
  if (!gate.ok) redirect("/home");

  const { stats } = await getAdminDashboardStats();
  const awaitingReply = Number(stats.awaiting_reply ?? 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/admin" className="font-bold tracking-tight shrink-0">
              Derso Admin
            </Link>
            <nav className="hidden sm:flex items-center gap-1" aria-label="Admin">
              {NAV.map((item) => {
                const showBadge =
                  "badge" in item && item.badge && awaitingReply > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {item.label}
                    {showBadge ? (
                      <span
                        className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white"
                        title={`${awaitingReply} yanıt bekleyen konuşma`}
                      >
                        {awaitingReply > 9 ? "9+" : awaitingReply}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden md:inline text-slate-400 truncate max-w-[14rem]">
              {gate.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                const supabase = await createClient();
                await supabase.auth.signOut();
                redirect("/login");
              }}
            >
              <button
                type="submit"
                className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/15 transition-colors"
              >
                Çıkış
              </button>
            </form>
          </div>
        </div>
        <nav
          className="sm:hidden flex gap-1 overflow-x-auto px-4 pb-3"
          aria-label="Admin mobil"
        >
          {NAV.map((item) => {
            const showBadge =
              "badge" in item && item.badge && awaitingReply > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-300 bg-white/5 whitespace-nowrap"
              >
                {item.label}
                {showBadge ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {awaitingReply > 9 ? "9+" : awaitingReply}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
