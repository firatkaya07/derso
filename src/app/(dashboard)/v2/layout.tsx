import type { Metadata } from "next";
import Link from "next/link";
import { V2Shell } from "@/app/(dashboard)/v2/V2Shell";

export const metadata: Metadata = {
  title: "Derso V2",
  robots: { index: false, follow: false },
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
        <p>
          <span className="font-semibold">Derso V2</span> — hafta içi / hafta sonu
          ayrı zaman çizelgesi. V1 programından bağımsızdır.
        </p>
        <Link
          href="/home"
          className="font-medium text-emerald-800 underline-offset-2 hover:underline"
        >
          V1’e dön
        </Link>
      </div>
      <V2Shell>{children}</V2Shell>
    </div>
  );
}
