"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h2 className="text-lg font-semibold text-[var(--color-text)]">
        Bir şeyler ters gitti
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
        Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors"
      >
        Tekrar dene
      </button>
    </div>
  );
}
