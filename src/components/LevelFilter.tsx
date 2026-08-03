"use client";

import { LEVELS } from "@/lib/types";

interface LevelFilterProps {
  value: string;
  onChange: (value: string) => void;
  /** "Tümü" ve her seviye için sayı. Verilmezse sayaç gösterilmez. */
  counts?: Record<string, number>;
  /** Aktif pill rengi; varsayılan teal. */
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
  activeClassName = "bg-teal-600 text-white",
}: LevelFilterProps) {
  const tabs = ["Tümü", ...LEVELS];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      <span className="text-xs text-gray-500 shrink-0 flex items-center gap-1">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Seviye
      </span>
      {tabs.map((tab) => {
        const count = counts?.[tab];
        const active = value === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              active
                ? activeClassName
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
