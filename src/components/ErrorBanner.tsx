interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Veri yükleme hatalarında ortak kırmızı banner. */
export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-medium text-red-800 hover:underline"
        >
          Tekrar dene
        </button>
      )}
    </div>
  );
}
