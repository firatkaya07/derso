"use client";

import { useTheme } from "@/components/ThemeProvider";
import type { AppTheme } from "@/lib/theme";

function MoonIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M21 14.3A8.5 8.5 0 1110.2 3a7 7 0 0010.8 11.3z"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 3v1.5M12 19.5V21M4.22 4.22l1.06 1.06M18.72 18.72l1.06 1.06M3 12h1.5M19.5 12H21M4.22 19.78l1.06-1.06M18.72 5.28l1.06-1.06M12 8a4 4 0 100 8 4 4 0 000-8z"
      />
    </svg>
  );
}

const OPTIONS: { value: AppTheme; label: string; icon: typeof MoonIcon }[] = [
  { value: "light", label: "Açık tema", icon: SunIcon },
  { value: "dark", label: "Koyu tema", icon: MoonIcon },
];

export function ThemeSwitcher() {
  const { theme, setTheme, ready } = useTheme();

  return (
    <div className="ios-segmented" role="group" aria-label="Tema">
      {OPTIONS.map((option) => {
        const selected = option.value === theme;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            disabled={!ready}
            aria-pressed={selected}
            aria-label={option.label}
            onClick={() => {
              if (option.value !== theme) setTheme(option.value);
            }}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
