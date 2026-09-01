"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/SettingsProvider";
import { EditionSwitcher } from "@/components/EditionSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
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
    <header className="ios-nav">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:max-w-7xl sm:px-6 lg:px-8">
        <Link
          href={home}
          className="flex min-h-11 min-w-0 items-center gap-3"
        >
          <Image
            src={settings.logoDataUrl || "/logo.webp"}
            alt={settings.institutionName || "Derso"}
            width={LOGO_SIZE}
            height={LOGO_SIZE}
            unoptimized={Boolean(settings.logoDataUrl)}
            className="h-8 w-8 shrink-0 rounded-[9px] object-contain ring-1 ring-[var(--color-separator)]"
          />
          <span className="min-w-0 leading-tight">
            <span className="ios-headline block truncate">
              {settings.institutionName || "Derso"}
            </span>
            {location ? (
              <span className="ios-caption block truncate">{location}</span>
            ) : null}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeSwitcher />
          <EditionSwitcher />
          {!isHome ? (
            <Link
              href={tanimlarHref(edition)}
              className="ios-btn ios-btn-plain hidden min-h-11 px-3 text-[15px] sm:inline-flex"
            >
              Tanımlar
            </Link>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="ios-btn ios-btn-plain-destructive min-h-11 px-3 text-[15px]"
          >
            Çıkış
          </button>
        </div>
      </div>
    </header>
  );
}
