import { describe, expect, it } from "vitest";
import { autoSchedule, DEFAULT_RULES } from "@/lib/scheduler";
import type { GeneratedLesson } from "@/lib/scheduler";
import {
  classCapacity,
  NO_TEACHER_SCENARIO,
  OVERSUBSCRIBED_SCENARIO,
  SCENARIOS,
  totalDemand,
  type Scenario,
} from "./helpers/scenarios";

function solve(scenario: Scenario) {
  return autoSchedule(
    scenario.classes,
    scenario.scheduleDays,
    scenario.subjects,
    scenario.classSubjects,
    DEFAULT_RULES,
    scenario.teacherSubjects,
    scenario.teachers,
    1,
    { restarts: 8, maxIterations: 40000, timeLimitMs: 20000 }
  );
}

interface Violations {
  classConflicts: number;
  teacherConflicts: number;
  offDayViolations: number;
  outsideClassHours: number;
  missingTeacher: number;
  splitCourses: string[];
  overWeeklyHours: string[];
}

function findViolations(
  scenario: Scenario,
  lessons: GeneratedLesson[]
): Violations {
  const teacherById = new Map(scenario.teachers.map((t) => [t.id, t]));
  const daysByClass = new Map<string, typeof scenario.scheduleDays>();
  for (const day of scenario.scheduleDays) {
    const list = daysByClass.get(day.class_id) ?? [];
    list.push(day);
    daysByClass.set(day.class_id, list);
  }

  const classSlots = new Set<string>();
  const teacherSlots = new Set<string>();
  const teachersByCourse = new Map<string, Set<string>>();
  const hoursByCourse = new Map<string, number>();

  const violations: Violations = {
    classConflicts: 0,
    teacherConflicts: 0,
    offDayViolations: 0,
    outsideClassHours: 0,
    missingTeacher: 0,
    splitCourses: [],
    overWeeklyHours: [],
  };

  for (const lesson of lessons) {
    const slot = `${lesson.dayOfWeek}:${lesson.startTime}`;

    const classKey = `${lesson.classId}:${slot}`;
    if (classSlots.has(classKey)) violations.classConflicts++;
    classSlots.add(classKey);

    if (!lesson.teacherId) {
      violations.missingTeacher++;
    } else {
      const teacherKey = `${lesson.teacherId}:${slot}`;
      if (teacherSlots.has(teacherKey)) violations.teacherConflicts++;
      teacherSlots.add(teacherKey);

      if (teacherById.get(lesson.teacherId)?.off_days.includes(lesson.dayOfWeek)) {
        violations.offDayViolations++;
      }
    }

    const day = (daysByClass.get(lesson.classId) ?? []).find(
      (d) => d.day_of_week === lesson.dayOfWeek
    );
    if (
      !day ||
      lesson.startTime < day.start_time.slice(0, 5) ||
      lesson.endTime > day.end_time.slice(0, 5)
    ) {
      violations.outsideClassHours++;
    }

    const courseKey = `${lesson.classId}:${lesson.subjectId}`;
    const teachers = teachersByCourse.get(courseKey) ?? new Set<string>();
    teachers.add(lesson.teacherId);
    teachersByCourse.set(courseKey, teachers);
    hoursByCourse.set(courseKey, (hoursByCourse.get(courseKey) ?? 0) + 1);
  }

  for (const [courseKey, teachers] of teachersByCourse) {
    if (teachers.size > 1) violations.splitCourses.push(courseKey);
  }

  for (const cs of scenario.classSubjects) {
    const courseKey = `${cs.classId}:${cs.subjectId}`;
    const placed = hoursByCourse.get(courseKey) ?? 0;
    if (placed > cs.weeklyHours) violations.overWeeklyHours.push(courseKey);
  }

  return violations;
}

const ALL_SCENARIOS = [
  ...SCENARIOS,
  OVERSUBSCRIBED_SCENARIO,
  NO_TEACHER_SCENARIO,
];

describe.each(ALL_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
  "%s",
  (_name, scenario) => {
    const result = solve(scenario);
    const violations = findViolations(scenario, result.lessons);

    it("hiçbir sert kısıtı ihlal etmez", () => {
      expect(violations.classConflicts).toBe(0);
      expect(violations.teacherConflicts).toBe(0);
      expect(violations.offDayViolations).toBe(0);
      expect(violations.outsideClassHours).toBe(0);
      expect(violations.missingTeacher).toBe(0);
    });

    it("hiçbir dersi iki öğretmene bölmez", () => {
      expect(violations.splitCourses).toEqual([]);
    });

    it("haftalık ders saatini aşmaz", () => {
      expect(violations.overWeeklyHours).toEqual([]);
    });

    it("ulaşılabilir en yüksek ders saatine çıkar", () => {
      expect(result.stats.placedHours).toBeGreaterThanOrEqual(
        result.stats.maxPlaceableHours
      );
    });

    it("talebi sınıf kapasitesiyle tutarlı raporlar", () => {
      expect(result.stats.totalHours).toBe(totalDemand(scenario));
      expect(result.stats.placedHours).toBeLessThanOrEqual(
        classCapacity(scenario)
      );
    });

    if (scenario.solvable) {
      it("çözülebilir senaryoyu eksiksiz tamamlar", () => {
        expect(result.stats.placedHours).toBe(result.stats.maxPlaceableHours);
      });
    } else {
      it("çözülemeyen senaryoda nedeni açıklar", () => {
        expect(result.feasibility.issues.length).toBeGreaterThan(0);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    }
  }
);

describe("olurluk incelemesi", () => {
  it("sınıf kapasitesi yetmediğinde kaç saatin açıkta kalacağını söyler", () => {
    const result = solve(OVERSUBSCRIBED_SCENARIO);
    const issue = result.feasibility.issues.find(
      (item) => item.kind === "class-capacity"
    );
    expect(issue).toBeDefined();
    expect(issue!.lostHours).toBeGreaterThan(0);
    expect(issue!.message).toContain("ders günü ekleyin");
  });

  it("öğretmeni olmayan dersi ayrıca bildirir", () => {
    const result = solve(NO_TEACHER_SCENARIO);
    const issue = result.feasibility.issues.find(
      (item) => item.kind === "no-teacher"
    );
    expect(issue).toBeDefined();
    expect(issue!.message).toContain("Astronomi");
  });
});
