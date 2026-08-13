"use client";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Liste sayfalarındaki ortak arama kutusu. */
export default function SearchInput({
  value,
  onChange,
  placeholder = "Ara...",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl bg-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] transition-all duration-200"
      />
    </div>
  );
}
