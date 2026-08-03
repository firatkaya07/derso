import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Dashboard CRUD sayfalarının ortak üst çubuğu. */
export default function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-start gap-2 min-w-0">
        <Link
          href="/"
          className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5 shrink-0"
          aria-label="Ana sayfaya dön"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
