"use client";

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

  return (
    <div
      className="ios-segmented"
      role="group"
      aria-label="Program sürümü"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === edition;
        return (
          <button
            key={option.value}
            type="button"
            disabled={!ready}
            aria-pressed={selected}
            aria-label={`${option.label}: ${option.hint}`}
            onClick={() => {
              if (option.value !== edition) setEdition(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
