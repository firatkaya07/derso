"use client";

import { LEVELS } from "@/lib/types";

interface LevelFilterProps {
  value: string;
  onChange: (value: string) => void;
  /** "Tümü" ve her seviye için sayı. Verilmezse sayaç gösterilmez. */
  counts?: Record<string, number>;
  /** Aktif pill rengi; varsayılan primary. */
  activeClassName?: string;
}

function levelLabel(level: string): string {
  if (level === "Tümü") return "Tümü";
  if (level === "Mezun") return "Mezun";
  return `${level}. Sınıf`;
}

/** Seviye filtre çubuğu; mobil için yatay kaydırma destekler. */
export default function LevelFilter({
  value,
  onChange,
  counts,
  activeClassName = "bg-[var(--color-primary)] text-white",
}: LevelFilterProps) {
  const tabs = ["Tümü", ...LEVELS];

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1"
      role="tablist"
      aria-label="Seviye"
    >
      {tabs.map((tab) => {
        const count = counts?.[tab];
        const active = value === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-[15px] font-semibold transition-colors duration-150 ${
              active
                ? activeClassName
                : "bg-[var(--color-fill)] text-[var(--color-text)]"
            }`}
          >
            {levelLabel(tab)}
            {typeof count === "number" ? ` (${count})` : ""}
          </button>
        );
      })}
    </div>
  );
}
