import { describe, expect, it } from "vitest";
import {
  adoptionTone,
  artifactLabel,
  awaitingTone,
  barHeightPercent,
  buildHealthCards,
  formatPercent,
  parseReportPeriod,
  ratioPercent,
  readyWithoutScheduleTone,
  staleTone,
  successRateTone,
  type AdminSystemHealth,
} from "@/lib/admin-metrics";

const sampleHealth = (overrides: Partial<AdminSystemHealth> = {}): AdminSystemHealth => ({
  organizations: 8,
  orgs_with_schedule: 4,
  orgs_without_schedule: 4,
  schedule_adoption_pct: 50,
  orgs_ready_without_schedule: 0,
  orgs_empty: 4,
  users: 10,
  users_active_7d: 3,
  users_active_30d: 5,
  orgs_active_7d: 2,
  orgs_stale_30d: 3,
  open_conversations: 2,
  awaiting_reply: 1,
  messages_today: 4,
  new_orgs_7d: 1,
  new_users_7d: 1,
  downloads_7d: 2,
  downloads_30d: 9,
  schedule_starts_7d: 1,
  schedule_starts_30d: 3,
  schedule_saves_30d: 2,
  schedule_completes_30d: 3,
  schedule_success_rate_30d: 67,
  lessons_total: 1500,
  lessons_v2_total: 200,
  ...overrides,
});

describe("admin metrics", () => {
  it("yalnızca 7/30/90 dönemlerini kabul eder", () => {
    expect(parseReportPeriod("7")).toBe(7);
    expect(parseReportPeriod("90")).toBe(90);
    expect(parseReportPeriod("15")).toBe(30);
    expect(parseReportPeriod(undefined)).toBe(30);
  });

  it("yayılım ve atıl kurum eşiklerini doğru boyar", () => {
    expect(adoptionTone(50)).toBe("good");
    expect(adoptionTone(30)).toBe("watch");
    expect(adoptionTone(10)).toBe("risk");
    expect(staleTone(2, 10)).toBe("good");
    expect(staleTone(5, 10)).toBe("watch");
    expect(staleTone(8, 10)).toBe("risk");
  });

  it("destek ve başarı oranı tonlarını üretir", () => {
    expect(awaitingTone(0)).toBe("good");
    expect(awaitingTone(3)).toBe("watch");
    expect(awaitingTone(5)).toBe("risk");
    expect(successRateTone(null)).toBe("neutral");
    expect(successRateTone(80)).toBe("good");
    expect(readyWithoutScheduleTone(2)).toBe("watch");
  });

  it("yüzde ve çubuk yüksekliğini hesaplar", () => {
    expect(ratioPercent(1, 4)).toBe(25);
    expect(ratioPercent(0, 0)).toBe(0);
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(40)).toBe("%40");
    expect(barHeightPercent(0, 10)).toBe(0);
    expect(barHeightPercent(5, 10)).toBe(50);
  });

  it("çıktı etiketlerini Türkçeleştirir", () => {
    expect(artifactLabel("sinif-carsaf")).toBe("Sınıf çarşaf");
    expect(artifactLabel("bilinmeyen")).toBe("bilinmeyen");
  });

  it("sağlık kartlarını üretir", () => {
    const cards = buildHealthCards(sampleHealth());
    expect(cards).toHaveLength(8);
    expect(cards[0]?.value).toBe("4/8");
    expect(cards.some((card) => card.href === "/admin/raporlar")).toBe(true);
  });
});
