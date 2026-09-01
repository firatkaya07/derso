export type HealthTone = "good" | "watch" | "risk" | "neutral";

export type AdminSystemHealth = {
  organizations: number;
  orgs_with_schedule: number;
  orgs_without_schedule: number;
  schedule_adoption_pct: number;
  orgs_ready_without_schedule: number;
  orgs_empty: number;
  users: number;
  users_active_7d: number;
  users_active_30d: number;
  orgs_active_7d: number;
  orgs_stale_30d: number;
  open_conversations: number;
  awaiting_reply: number;
  messages_today: number;
  new_orgs_7d: number;
  new_users_7d: number;
  downloads_7d: number;
  downloads_30d: number;
  schedule_starts_7d: number;
  schedule_starts_30d: number;
  schedule_saves_30d: number;
  schedule_completes_30d: number;
  schedule_success_rate_30d: number | null;
  lessons_total: number;
  lessons_v2_total: number;
};

export type UsageDailyPoint = {
  day: string;
  downloads: number;
  schedule_starts: number;
  schedule_completes: number;
  schedule_saves: number;
};

export type UsageArtifactRow = {
  artifact: string;
  format: string;
  edition: string;
  count: number;
};

export type UsageOrgRow = {
  id: string;
  name: string;
  created_at: string;
  has_schedule: boolean;
  lesson_count: number;
  lesson_count_v2: number;
  last_scheduled_at: string | null;
  downloads: number;
  schedule_starts: number;
  schedule_completes: number;
  schedule_saves: number;
  last_download_at: string | null;
  last_schedule_event_at: string | null;
};

export type AdminUsageReport = {
  period_days: number;
  platform: {
    downloads: number;
    schedule_starts: number;
    schedule_completes: number;
    schedule_complete_success: number;
    schedule_saves: number;
    downloads_by_artifact: UsageArtifactRow[];
    daily: UsageDailyPoint[];
  };
  organizations: UsageOrgRow[];
};

export type HealthCard = {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: HealthTone;
  href?: string;
};

export const REPORT_PERIODS = [7, 30, 90] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

const ARTIFACT_LABELS: Record<string, string> = {
  "sinif-carsaf": "Sınıf çarşaf",
  "ogretmen-carsaf": "Öğretmen çarşaf",
  "sinif-program": "Sınıf programı",
  "ogretmen-program": "Öğretmen programı",
  diger: "Diğer",
};

const FORMAT_LABELS: Record<string, string> = {
  pdf: "PDF",
  xlsx: "Excel",
  html: "HTML",
  diger: "Diğer",
};

export function parseReportPeriod(value: string | undefined): ReportPeriod {
  const n = Number(value);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

export function artifactLabel(artifact: string): string {
  return ARTIFACT_LABELS[artifact] ?? artifact;
}

export function formatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format.toUpperCase();
}

export function editionLabel(edition: string): string {
  return edition === "v2" ? "V2" : "V1";
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `%${value}`;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDayTick(isoDay: string): string {
  const date = new Date(`${isoDay}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDay;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function ratioPercent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part * 100) / whole);
}

export function adoptionTone(pct: number): HealthTone {
  if (pct >= 50) return "good";
  if (pct >= 25) return "watch";
  return "risk";
}

export function staleTone(stale: number, total: number): HealthTone {
  if (total <= 0) return "neutral";
  const pct = ratioPercent(stale, total);
  if (pct <= 30) return "good";
  if (pct <= 60) return "watch";
  return "risk";
}

export function awaitingTone(count: number): HealthTone {
  if (count <= 0) return "good";
  if (count <= 4) return "watch";
  return "risk";
}

export function activityTone(active: number, total: number): HealthTone {
  if (total <= 0) return "neutral";
  const pct = ratioPercent(active, total);
  if (pct >= 20) return "good";
  if (pct >= 5) return "watch";
  return "risk";
}

export function readyWithoutScheduleTone(count: number): HealthTone {
  return count > 0 ? "watch" : "good";
}

export function successRateTone(rate: number | null): HealthTone {
  if (rate === null) return "neutral";
  if (rate >= 70) return "good";
  if (rate >= 40) return "watch";
  return "risk";
}

export function toneLabel(tone: HealthTone): string {
  switch (tone) {
    case "good":
      return "İyi";
    case "watch":
      return "Dikkat";
    case "risk":
      return "Risk";
    default:
      return "Bilgi";
  }
}

export function buildHealthCards(health: AdminSystemHealth): HealthCard[] {
  const adoption = health.schedule_adoption_pct ?? 0;
  return [
    {
      id: "adoption",
      label: "Program yayılımı",
      value: `${health.orgs_with_schedule}/${health.organizations}`,
      hint: `Kurumların %${adoption}'sinde kaydedilmiş ders programı var.`,
      tone: adoptionTone(adoption),
      href: "/admin/kurumlar",
    },
    {
      id: "ready",
      label: "Verisi var, program yok",
      value: formatInteger(health.orgs_ready_without_schedule),
      hint: "Öğretmen ve sınıfı olan ama henüz dağıtım kaydetmemiş kurumlar.",
      tone: readyWithoutScheduleTone(health.orgs_ready_without_schedule),
      href: "/admin/kurumlar",
    },
    {
      id: "active-orgs",
      label: "Aktif kurum (7 gün)",
      value: `${health.orgs_active_7d}/${health.organizations}`,
      hint: "Son 7 günde en az bir üyesi giriş yapan kurum.",
      tone: activityTone(health.orgs_active_7d, health.organizations),
    },
    {
      id: "stale",
      label: "Atıl kurum (30 gün)",
      value: formatInteger(health.orgs_stale_30d),
      hint: "Son 30 günde hiç üye girişi olmayan kurum.",
      tone: staleTone(health.orgs_stale_30d, health.organizations),
      href: "/admin/kullanicilar",
    },
    {
      id: "users",
      label: "Aktif kullanıcı (7 gün)",
      value: `${health.users_active_7d}/${health.users}`,
      hint: `Son 30 günde ${health.users_active_30d} kullanıcı giriş yaptı.`,
      tone: activityTone(health.users_active_7d, health.users),
      href: "/admin/kullanicilar",
    },
    {
      id: "support",
      label: "Yanıt bekleyen destek",
      value: formatInteger(health.awaiting_reply),
      hint: `${health.open_conversations} açık konuşma, bugün ${health.messages_today} mesaj.`,
      tone: awaitingTone(health.awaiting_reply),
      href: "/admin/destek?status=open",
    },
    {
      id: "downloads",
      label: "İndirme (7 / 30 gün)",
      value: `${health.downloads_7d} / ${health.downloads_30d}`,
      hint: "PDF ve Excel çıktı indirmeleri. Kayıt bu sürümden itibaren tutulur.",
      tone: "neutral",
      href: "/admin/raporlar",
    },
    {
      id: "schedule",
      label: "Dağıtım denemesi (7 / 30 gün)",
      value: `${health.schedule_starts_7d} / ${health.schedule_starts_30d}`,
      hint:
        health.schedule_success_rate_30d === null
          ? `Son 30 günde ${health.schedule_saves_30d} kayıtlı dağıtım.`
          : `Başarı oranı %${health.schedule_success_rate_30d}; ${health.schedule_saves_30d} kayıt.`,
      tone: successRateTone(health.schedule_success_rate_30d),
      href: "/admin/raporlar",
    },
  ];
}

export function maxDailyValue(points: UsageDailyPoint[]): number {
  let max = 0;
  for (const point of points) {
    max = Math.max(
      max,
      point.downloads,
      point.schedule_starts,
      point.schedule_completes,
      point.schedule_saves
    );
  }
  return max;
}

export function barHeightPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.max(4, Math.round((value * 100) / max));
}
