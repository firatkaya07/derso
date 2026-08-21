import { sendGAEvent } from "@next/third-parties/google";

/**
 * GA4 etkinlik yardımcıları.
 * Measurement ID yoksa veya script henüz yüklenmediyse sessizce no-op.
 */

export type AnalyticsParams = Record<
  string,
  string | number | boolean | null | undefined
>;

function cleanParams(
  params?: AnalyticsParams
): Record<string, string | number | boolean> {
  if (!params) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
}

/** Ham GA4 event gönderimi. */
export function trackEvent(name: string, params?: AnalyticsParams): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()) return;

  try {
    sendGAEvent("event", name, cleanParams(params));
  } catch {
    // Analytics kullanıcı akışını bozmamalı.
  }
}

/** App Router client navigasyonlarında page_view (SPA). */
export function trackPageView(url: string, title?: string): void {
  if (typeof window === "undefined") return;
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!measurementId) return;

  try {
    // GA4 SPA: config + page_path yeni page_view üretir.
    sendGAEvent("config", measurementId, {
      page_path: url,
      page_title:
        title ?? (typeof document !== "undefined" ? document.title : undefined),
    });
  } catch {
    // no-op
  }
}

/* ── Standart / önerilen dönüşüm etkinlikleri ── */

export function trackLogin(method = "email"): void {
  trackEvent("login", { method });
}

export function trackSignUp(method = "email"): void {
  trackEvent("sign_up", { method });
}

export function trackGenerateLead(params: {
  location: string;
  plan?: string;
  billing?: string;
}): void {
  trackEvent("generate_lead", params);
}

export function trackFileDownload(params: {
  file_name: string;
  file_extension?: string;
  link_text?: string;
}): void {
  trackEvent("file_download", params);
}

/* ── Ürün özel etkinlikler ── */

export function trackCtaClick(location: string, label?: string): void {
  trackEvent("cta_click", { location, label });
}

export function trackOnboardingComplete(): void {
  trackEvent("onboarding_complete");
}

export function trackScheduleStart(rounds?: number): void {
  trackEvent("schedule_start", { rounds });
}

export function trackScheduleComplete(params: {
  success: boolean;
  placed_hours?: number;
  total_hours?: number;
}): void {
  trackEvent("schedule_complete", params);
}

export function trackExcelImport(params: {
  success: boolean;
  error_count?: number;
}): void {
  trackEvent("excel_import", params);
}

export function trackSupportOpen(): void {
  trackEvent("support_open");
}

export function trackSupportMessage(params: {
  type: "new" | "reply";
}): void {
  trackEvent("support_message", params);
}
