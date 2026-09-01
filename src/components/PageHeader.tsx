"use client";

import Link from "next/link";
import { useEdition } from "@/components/EditionProvider";
import { homeHref } from "@/lib/edition";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Dashboard CRUD sayfalarının ortak üst çubuğu — iOS large title + geri. */
export default function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  const { edition } = useEdition();
  const home = homeHref(edition);

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Link
          href={home}
          className="mb-2 inline-flex min-h-11 items-center gap-1 text-[17px] text-[var(--color-primary)]"
          aria-label="Ana sayfaya dön"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Ana Sayfa
        </Link>
        <h1 className="ios-large-title">{title}</h1>
        {description ? (
          <p className="ios-subhead mt-1 max-w-xl">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 pt-11">{action}</div> : null}
    </div>
  );
}
