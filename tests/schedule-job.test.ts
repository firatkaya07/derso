import { describe, expect, it } from "vitest";
import { isBetterSchedule } from "@/lib/schedule-job";
import type { ScheduleResult } from "@/lib/scheduler";

function result(
  placedHours: number,
  warningCount: number
): ScheduleResult {
  return {
    lessons: [],
    errors: [],
    warnings: Array.from({ length: warningCount }, (_, i) => `w${i}`),
    unplaced: [],
    feasibility: {
      issues: [],
      totalHours: placedHours,
      maxPlaceableHours: placedHours,
    },
    stats: {
      totalHours: placedHours,
      placedHours,
      coverage: 1,
      maxPlaceableHours: placedHours,
      teacherLoads: [],
      restartsUsed: 1,
      iterationsUsed: 1,
      elapsedMs: 1,
    },
  };
}

describe("isBetterSchedule", () => {
  it("daha çok yerleştiren sonucu seçer", () => {
    expect(isBetterSchedule(result(40, 2), result(38, 0))).toBe(true);
  });

  it("eşit saatte daha az uyarıyı seçer", () => {
    expect(isBetterSchedule(result(40, 1), result(40, 3))).toBe(true);
    expect(isBetterSchedule(result(40, 3), result(40, 1))).toBe(false);
  });
});
