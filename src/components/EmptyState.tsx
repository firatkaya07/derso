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
    <div className="ios-inset px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--color-primary-light)] text-[var(--color-primary)]">
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <p className="ios-headline">{title}</p>
      {description && (
        <p className="ios-subhead mx-auto mt-1.5 max-w-sm">{description}</p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className={`ios-btn ios-btn-plain min-h-11 px-3 text-[17px] font-semibold ${accentClassName}`}
          >
            {actionLabel}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="ios-btn ios-btn-plain min-h-11 px-3 text-[17px] text-[var(--color-text-muted)]"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
