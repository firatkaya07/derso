interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Veri yükleme hatalarında ortak kırmızı banner. */
export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <svg
          className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-semibold text-red-800 hover:underline underline-offset-2"
        >
          Tekrar dene
        </button>
      )}
    </div>
  );
}
