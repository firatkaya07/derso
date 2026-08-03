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
  accentClassName = "text-teal-600",
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-12 text-center">
      <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 6h16M4 12h10M4 18h14"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {description && (
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
          {description}
        </p>
      )}
      <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className={`text-sm font-medium ${accentClassName} hover:underline`}
          >
            {actionLabel}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
