"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Marketing]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h2 className="text-lg font-semibold">Bir şeyler ters gitti</h2>
      <p className="text-sm text-slate-600 max-w-md">
        Sayfa yüklenirken beklenmeyen bir hata oluştu.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
        >
          Tekrar dene
        </button>
        <Link
          href="/"
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Ana sayfa
        </Link>
      </div>
    </div>
  );
}
