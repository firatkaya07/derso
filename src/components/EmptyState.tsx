interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  accentClassName?: string;
}

/** Liste veya filtre sonucu boşken gösterilen ortak durum. */
export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  accentClassName = "text-[var(--color-primary)]",
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-14 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)]">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
      {description && (
        <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className={`text-sm font-semibold ${accentClassName} hover:underline underline-offset-2`}
          >
            {actionLabel}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:underline underline-offset-2"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
