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
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 modal-overlay-enter sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edition-intro-title"
        aria-describedby="edition-intro-desc"
        tabIndex={-1}
        className="relative w-full max-w-xl overflow-hidden rounded-t-[14px] bg-[var(--color-card)] outline-none modal-panel-enter overscroll-contain pb-[env(safe-area-inset-bottom)] sm:rounded-[14px]"
      >
        <div className="sm:hidden" aria-hidden="true">
          <span className="ios-grabber" />
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Kapat"
          className="ios-btn ios-btn-plain absolute right-2 top-3 z-10 h-11 w-11 p-0 text-[var(--color-text-muted)]"
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

        <div className="max-h-[min(90vh,40rem)] overflow-y-auto overscroll-contain px-5 pb-6 pt-3 sm:px-6 sm:pt-5">
          <p className="ios-section-label px-0 pb-1">Program sürümleri</p>
          <h2
            id="edition-intro-title"
            className="ios-title2 pr-10"
          >
            V1 ve V2 yan yana çalışır
          </h2>
          <p id="edition-intro-desc" className="ios-subhead mt-2">
            Aynı kurumda klasik program ile hafta içi / hafta sonu ayrı saatli
            programı birlikte tutabilirsiniz. Biri diğerini silmez.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <article className="ios-inset p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-[7px] bg-[var(--color-primary)] px-2 py-0.5 text-[11px] font-bold text-white">
                  V1
                </span>
                <h3 className="ios-headline">
                  Klasik çizelge
                </h3>
              </div>
              <p className="ios-subhead mt-2">
                Tüm günler aynı başlangıç saati, ders süresi ve teneffüs.
                Bildiğiniz tek zaman çizelgesi.
              </p>
            </article>
            <article className="ios-inset p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-[7px] bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-bold text-white">
                  V2
                </span>
                <h3 className="ios-headline">
                  Hafta içi / sonu
                </h3>
              </div>
              <p className="ios-subhead mt-2">
                Cumartesi–Pazar için ayrı saatler ve teneffüsler. V1
                programınız durur.
              </p>
            </article>
          </div>

          <div className="ios-inset mt-5 p-4">
            <h3 className="ios-headline">
              Nasıl geçiş yapılır?
            </h3>
            <p className="ios-subhead mt-1">
              Üst çubuktaki <span className="font-semibold text-[var(--color-text)]">V1</span>{" "}
              / <span className="font-semibold text-[var(--color-text)]">V2</span>{" "}
              anahtarından diğer sürümü seçin. Sayfa o sürüme geçer.
            </p>
            <div
              className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-[var(--color-fill)] px-3 py-2.5"
              aria-hidden
            >
              <span className="ios-headline truncate">Derso</span>
              <div className="ios-segmented">
                <button type="button" aria-pressed="true" tabIndex={-1}>
                  V1
                </button>
                <button type="button" aria-pressed="false" tabIndex={-1}>
                  V2
                </button>
              </div>
            </div>
            <p className="ios-caption mt-2 text-center text-[var(--color-primary)]">
              Geçiş buradan
            </p>
          </div>

          <button
            type="button"
            data-intro-primary
            onClick={dismiss}
            className="ios-btn ios-btn-primary mt-5 w-full"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
