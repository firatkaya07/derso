"use client";

import { useCallback, useEffect, useRef } from "react";

export default function EditionIntroModal({
  open,
  onDismiss,
}: {
  open: boolean;
  onDismiss: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);
  const dismissRef = useRef(dismiss);

  useEffect(() => {
    dismissRef.current = dismiss;
  }, [dismiss]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissRef.current();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTarget =
      panelRef.current?.querySelector<HTMLElement>("[data-intro-primary]") ??
      panelRef.current;
    focusTarget?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[3px] modal-overlay-enter"
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edition-intro-title"
        aria-describedby="edition-intro-desc"
        tabIndex={-1}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] outline-none modal-panel-enter overscroll-contain"
      >
        <div
          className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-500"
          aria-hidden
        />

        <button
          type="button"
          onClick={dismiss}
          aria-label="Kapat"
          className="absolute right-3 top-4 flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="max-h-[min(90vh,40rem)] overflow-y-auto overscroll-contain px-6 pb-6 pt-5 sm:px-8 sm:pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Program sürümleri
          </p>
          <h2
            id="edition-intro-title"
            className="mt-2 pr-10 text-2xl font-bold tracking-tight text-slate-900"
          >
            V1 ve V2 yan yana çalışır
          </h2>
          <p id="edition-intro-desc" className="mt-2 text-sm leading-6 text-slate-600">
            Aynı kurumda klasik program ile hafta içi / hafta sonu ayrı saatli
            programı birlikte tutabilirsiniz. Biri diğerini silmez.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-lg bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  V1
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  Klasik çizelge
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Tüm günler aynı başlangıç saati, ders süresi ve teneffüs.
                Bildiğiniz tek zaman çizelgesi.
              </p>
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-lg bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  V2
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  Hafta içi / sonu
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Cumartesi–Pazar için ayrı saatler ve teneffüsler. V1
                programınız durur.
              </p>
            </article>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Nasıl geçiş yapılır?
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Sağ üstteki <span className="font-semibold text-slate-800">V1</span>{" "}
              veya <span className="font-semibold text-slate-800">V2</span>{" "}
              menüsünü açın, diğer sürümü seçin. Sayfa o sürüme geçer.
            </p>
            <div
              className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
              aria-hidden
            >
              <span className="truncate text-sm font-semibold text-slate-700">
                Derso
              </span>
              <span className="relative inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-sm font-semibold text-indigo-700 ring-2 ring-indigo-400 ring-offset-2">
                V1
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-center text-[11px] font-medium text-indigo-700">
              Geçiş buradan
            </p>
          </div>

          <button
            type="button"
            data-intro-primary
            onClick={dismiss}
            className="mt-5 flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.28)] transition-colors hover:bg-indigo-700"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
