"use client";

import { useEffect, useRef, useState } from "react";
import { useEdition } from "@/components/EditionProvider";
import type { ScheduleEdition } from "@/lib/edition";

const OPTIONS: { value: ScheduleEdition; label: string; hint: string }[] = [
  {
    value: "v1",
    label: "V1",
    hint: "Klasik tek zaman çizelgesi",
  },
  {
    value: "v2",
    label: "V2",
    hint: "Hafta içi / hafta sonu ayrı",
  },
];

export function EditionSwitcher() {
  const { edition, setEdition, ready } = useEdition();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.value === edition) ?? OPTIONS[0];

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={!ready}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-all duration-200 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] disabled:opacity-60"
      >
        <span className="font-semibold tracking-wide">{current.label}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Program sürümü"
          className="absolute right-0 z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg"
        >
          {OPTIONS.map((option) => {
            const selected = option.value === edition;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                      : "text-[var(--color-text)] hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setOpen(false);
                    if (option.value !== edition) setEdition(option.value);
                  }}
                >
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {option.hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
