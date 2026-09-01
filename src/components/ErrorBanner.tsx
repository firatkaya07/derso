interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Veri yükleme hatalarında ortak kırmızı banner. */
export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="ios-inset flex items-start justify-between gap-3 px-4 py-3 text-[15px] text-[var(--color-destructive)]"
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="leading-snug">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ios-btn ios-btn-plain h-11 shrink-0 px-3 font-semibold text-[var(--color-destructive)]"
        >
          Tekrar dene
        </button>
      )}
    </div>
  );
}
