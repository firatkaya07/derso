import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAY_WINDOW,
  draftScheduleDays,
  findOrphanLessons,
  SCHEDULE_PRESETS,
  slotCountForWindow,
  slotsForWindow,
  weeklySlotCapacity,
} from "@/lib/slot-management";
import type { SlotTiming } from "@/lib/types";
import { makeScheduleDay } from "./helpers/fixtures";

const TIMING: SlotTiming = { lessonMinutes: 40, breakMinutes: 10 };

describe("slotsForWindow", () => {
  it("akşam bandında 4 slot üretir", () => {
    const slots = slotsForWindow(
      { startTime: "16:40", endTime: "19:50" },
      TIMING
    );
    expect(slots.map((s) => s.start)).toEqual([
      "16:40",
      "17:30",
      "18:20",
      "19:10",
    ]);
    expect(slots[0].index).toBe(0);
  });

  it("cumartesi sabah bandında 6 slot üretir", () => {
    expect(
      slotCountForWindow({ startTime: "08:20", endTime: "13:20" }, TIMING)
    ).toBe(6);
  });
});

describe("findOrphanLessons", () => {
  it("ızgara dışındaki dersleri bulur", () => {
    const days = [makeScheduleDay("c1", 0, "16:40", "19:50")];
    const orphans = findOrphanLessons(
      [
        {
          id: "ok",
          class_id: "c1",
          day_of_week: 0,
          start_time: "16:40:00",
        },
        {
          id: "orphan",
          class_id: "c1",
          day_of_week: 0,
          start_time: "08:20:00",
        },
        {
          id: "no-day",
          class_id: "c1",
          day_of_week: 1,
          start_time: "16:40:00",
        },
      ],
      days,
      TIMING
    );
    expect(orphans.map((o) => o.id)).toEqual(["orphan", "no-day"]);
  });
});

describe("draftScheduleDays", () => {
  it("yalnızca açık günleri taşır", () => {
    const days = draftScheduleDays("c1", [
      { day: 0, enabled: true, startTime: "16:40", endTime: "19:50" },
      { day: 1, enabled: false, startTime: "16:40", endTime: "19:50" },
    ]);
    expect(days).toHaveLength(1);
    expect(days[0].day_of_week).toBe(0);
  });
});

describe("weeklySlotCapacity", () => {
  it("günlerin slot sayılarını toplar", () => {
    const capacity = weeklySlotCapacity(
      [
        makeScheduleDay("c1", 0, "16:40", "19:50"),
        makeScheduleDay("c1", 5, "08:20", "13:20"),
      ],
      TIMING
    );
    expect(capacity).toBe(4 + 6);
  });
});

describe("presets", () => {
  it("varsayılan pencere akşam bandıdır", () => {
    expect(DEFAULT_DAY_WINDOW).toEqual({
      startTime: SCHEDULE_PRESETS[0].startTime,
      endTime: SCHEDULE_PRESETS[0].endTime,
    });
  });
});
