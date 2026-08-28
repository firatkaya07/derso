import { describe, expect, it } from "vitest";
import {
  dayGroupOf,
  generateProfileSlots,
  isSlotInsideClassWindow,
  normalizeBreaks,
  visibleDaysForClass,
  type ScheduleProfileV2,
} from "@/lib/v2/timeline";
import type { ClassScheduleDay } from "@/lib/types";

const weekday: ScheduleProfileV2 = {
  dayGroup: "weekday",
  startTime: "08:00",
  lessonDurationMinutes: 40,
  slotCount: 3,
  breakMinutes: [10, 20],
};

describe("normalizeBreaks", () => {
  it("N slot için N-1 teneffüs üretir", () => {
    expect(normalizeBreaks(5, [10, 10])).toEqual([10, 10, 10, 10]);
    expect(normalizeBreaks(1, [10, 10])).toEqual([]);
  });
});

describe("generateProfileSlots", () => {
  it("başlangıç, ders ve teneffüslerle slot üretir", () => {
    const slots = generateProfileSlots(weekday);
    expect(slots).toHaveLength(3);
    expect(slots[0]).toMatchObject({ start: "08:00", end: "08:40" });
    expect(slots[1]).toMatchObject({ start: "08:50", end: "09:30" });
    expect(slots[2]).toMatchObject({ start: "09:50", end: "10:30" });
  });
});

describe("isSlotInsideClassWindow", () => {
  it("pencere dışındaki slotları reddeder", () => {
    const day = {
      day_of_week: 0,
      start_time: "08:00",
      end_time: "09:00",
    } as ClassScheduleDay;
    const slots = generateProfileSlots(weekday);
    expect(isSlotInsideClassWindow(slots[0], day)).toBe(true);
    expect(isSlotInsideClassWindow(slots[1], day)).toBe(false);
  });
});

describe("visibleDaysForClass", () => {
  it("hafta sonu günü yoksa Cumartesi–Pazar kolonlarını gizler", () => {
    const days = [
      { day_of_week: 0 },
      { day_of_week: 2 },
      { day_of_week: 4 },
    ] as ClassScheduleDay[];
    expect(visibleDaysForClass(days)).toEqual([0, 2, 4]);
    expect(visibleDaysForClass(days, "weekend")).toEqual([]);
  });

  it("hafta sonu varsa Cumartesi–Pazar görünür", () => {
    const days = [
      { day_of_week: 0 },
      { day_of_week: 5 },
    ] as ClassScheduleDay[];
    expect(visibleDaysForClass(days)).toEqual([0, 5]);
  });
});

describe("dayGroupOf", () => {
  it("Pzt–Cum hafta içi, Cmt–Paz hafta sonu", () => {
    expect(dayGroupOf(0)).toBe("weekday");
    expect(dayGroupOf(4)).toBe("weekday");
    expect(dayGroupOf(5)).toBe("weekend");
    expect(dayGroupOf(6)).toBe("weekend");
  });
});
