"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/SettingsProvider";
import { EditionSwitcher } from "@/components/EditionSwitcher";
import { useEdition } from "@/components/EditionProvider";
import { homeHref, tanimlarHref } from "@/lib/edition";
import { locationLabel, LOGO_SIZE } from "@/lib/settings";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const settings = useSettings();
  const { edition } = useEdition();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const home = homeHref(edition);
  const isHome = pathname === "/home" || pathname === "/v2";
  const location = locationLabel(settings);

  return (
    <header className="bg-white border-b border-[var(--color-border)] sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href={home} className="flex items-center gap-2.5 group">
              <Image
                src={settings.logoDataUrl || "/logo.webp"}
                alt={settings.institutionName || "Derso"}
                width={LOGO_SIZE}
                height={LOGO_SIZE}
                unoptimized={Boolean(settings.logoDataUrl)}
                className="w-10 h-10 object-contain rounded-lg ring-1 ring-[var(--color-border)] group-hover:ring-[var(--color-primary-muted)] transition-[box-shadow,ring-color] duration-200"
              />
              <span className="leading-tight">
                <span className="block text-base font-bold text-[var(--color-text)]">
                  {settings.institutionName || "Derso Ders Dağıtım Programı"}
                </span>
                {location && (
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    {location}
                  </span>
                )}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            {!isHome && (
              <Link
                href={home}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Ana Sayfa
              </Link>
            )}
            <EditionSwitcher />
            <Link
              href={tanimlarHref(edition)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Tanımlar
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
