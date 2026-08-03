import { describe, expect, it } from "vitest";
import {
  buildTimeSlots,
  checkPlacement,
  findLessonAt,
  isSlotWithinClassDay,
  type PlacementCheck,
} from "@/lib/schedule-rules";
import type { Lesson } from "@/lib/types";
import { makeScheduleDay } from "./helpers/fixtures";

const CLASS_ID = "class-1";
const TEACHER_ID = "teacher-1";

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "lesson-1",
    class_id: CLASS_ID,
    subject_id: "subject-1",
    teacher_id: TEACHER_ID,
    day_of_week: 0,
    start_time: "16:40:00",
    end_time: "17:20:00",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeCheck(overrides: Partial<PlacementCheck> = {}): PlacementCheck {
  return {
    dayOfWeek: 0,
    startTime: "16:40",
    classId: CLASS_ID,
    teacherId: TEACHER_ID,
    scheduleDays: [makeScheduleDay(CLASS_ID, 0, "16:40", "19:50")],
    classLessons: [],
    teacherLessons: [],
    teacherOffDays: [],
    weeklyHours: 4,
    placedCount: 0,
    ...overrides,
  };
}

describe("buildTimeSlots", () => {
  it("40 dakika ders ve 10 dakika teneffüsle slot üretir", () => {
    const slots = buildTimeSlots([
      makeScheduleDay(CLASS_ID, 0, "16:40", "19:50"),
    ]);

    expect(slots).toEqual([
      { start: "16:40", end: "17:20" },
      { start: "17:30", end: "18:10" },
      { start: "18:20", end: "19:00" },
      { start: "19:10", end: "19:50" },
    ]);
  });

  it("farklı saatte başlayan günlerin slotlarını birleştirir", () => {
    const slots = buildTimeSlots([
      makeScheduleDay(CLASS_ID, 0, "16:40", "18:10"),
      makeScheduleDay(CLASS_ID, 5, "08:30", "10:00"),
    ]);

    expect(slots.map((slot) => slot.start)).toEqual([
      "08:30",
      "09:20",
      "16:40",
      "17:30",
    ]);
  });
});

describe("isSlotWithinClassDay", () => {
  const days = [makeScheduleDay(CLASS_ID, 0, "16:40", "18:10")];

  it("gün tanımlı değilse false döner", () => {
    expect(isSlotWithinClassDay(days, 1, "16:40")).toBe(false);
  });

  it("saat aralığın dışındaysa false döner", () => {
    expect(isSlotWithinClassDay(days, 0, "19:10")).toBe(false);
    expect(isSlotWithinClassDay(days, 0, "17:30")).toBe(true);
  });
});

describe("findLessonAt", () => {
  it("veritabanının saniyeli saat biçimiyle eşleşir", () => {
    const lessons = [makeLesson({ start_time: "17:30:00" })];
    expect(findLessonAt(lessons, 0, "17:30")).toBeDefined();
    expect(findLessonAt(lessons, 0, "16:40")).toBeUndefined();
  });
});

describe("checkPlacement", () => {
  it("uygun slotta engel bildirmez", () => {
    expect(checkPlacement(makeCheck())).toBeNull();
  });

  it("öğretmen belirlenmemişse yerleştirmeye izin vermez", () => {
    expect(checkPlacement(makeCheck({ teacherId: "" }))).toBe(
      "teacher-missing"
    );
  });

  it("sınıfın ders görmediği gün ve saatleri kapatır", () => {
    expect(checkPlacement(makeCheck({ dayOfWeek: 3 }))).toBe("no-class-day");
    expect(checkPlacement(makeCheck({ startTime: "21:00" }))).toBe(
      "no-class-day"
    );
  });

  it("öğretmenin izin gününü kapatır", () => {
    expect(checkPlacement(makeCheck({ teacherOffDays: [0] }))).toBe(
      "teacher-off-day"
    );
  });

  it("sınıfın dolu saatini kapatır", () => {
    expect(
      checkPlacement(makeCheck({ classLessons: [makeLesson()] }))
    ).toBe("class-busy");
  });

  it("öğretmenin başka sınıftaki dersiyle çakışmayı engeller", () => {
    const conflict = makeLesson({ id: "other", class_id: "class-2" });
    expect(checkPlacement(makeCheck({ teacherLessons: [conflict] }))).toBe(
      "teacher-busy"
    );
  });

  it("haftalık saat dolduysa fazladan ders koydurmaz", () => {
    expect(
      checkPlacement(makeCheck({ weeklyHours: 2, placedCount: 2 }))
    ).toBe("hours-complete");
  });

  it("haftalık saat tanımsızsa üst sınır uygulamaz", () => {
    expect(
      checkPlacement(makeCheck({ weeklyHours: 0, placedCount: 5 }))
    ).toBeNull();
  });
});
