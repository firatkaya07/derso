"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { trackPageView } from "@/lib/analytics";

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

/**
 * İlk yüklemede gtag config zaten page_view gönderir.
 * Sonraki App Router navigasyonlarında manuel page_view yollarız.
 */
function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    if (!gaId) return;

    const qs = searchParams.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;

    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

export default function Analytics() {
  if (!gaId) return null;

  return (
    <>
      <GoogleAnalytics
        gaId={gaId}
        debugMode={process.env.NODE_ENV === "development"}
      />
      <Suspense fallback={null}>
        <RouteChangeTracker />
      </Suspense>
    </>
  );
}
