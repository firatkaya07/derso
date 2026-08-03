import type {
  ClassGroup,
  ClassScheduleDay,
  SlotTiming,
  Subject,
  Teacher,
  TeacherSubject,
} from "../types";
import { normalizeSubjectName } from "../paired-subjects";
import {
  buildModel,
  DEFAULT_RULES,
  type ClassSubjectInput,
  type Model,
  type ScheduleRules,
} from "./model";
import { analyzeFeasibility, type FeasibilityReport } from "./feasibility";
import { solve, type SolveOptions, type Solution } from "./solver";

export { DEFAULT_RULES, MAX_HOURS_PER_SUBJECT_PER_DAY } from "./model";
export type { ClassSubjectInput, ScheduleRules } from "./model";
export type {
  FeasibilityIssue,
  FeasibilityKind,
  FeasibilityReport,
} from "./feasibility";
export type { SolveProgress } from "./solver";

export interface GeneratedLesson {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface UnplacedCourse {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  /** Yerleştirilemeyen ders saati. */
  hours: number;
  reason: string;
}

export interface TeacherLoad {
  teacherId: string;
  teacherName: string;
  totalHours: number;
}

export interface ScheduleStats {
  totalHours: number;
  placedHours: number;
  /** Yerleşen ders saatinin toplama oranı (0-1). */
  coverage: number;
  /** Kısıtlar altında ulaşılabilecek en yüksek saat sayısı. */
  maxPlaceableHours: number;
  teacherLoads: TeacherLoad[];
  restartsUsed: number;
  iterationsUsed: number;
  elapsedMs: number;
}

export interface ScheduleResult {
  lessons: GeneratedLesson[];
  errors: string[];
  warnings: string[];
  unplaced: UnplacedCourse[];
  feasibility: FeasibilityReport;
  stats: ScheduleStats;
}

export interface AutoScheduleOptions extends SolveOptions {
  /** Ders saati ızgarasının süreleri; verilmezse 40 dakika + 10 dakika. */
  timing?: SlotTiming;
}

/**
 * Haftalık ders programını üretir ve aynı geçişte öğretmenleri atar.
 *
 * Dönen sonuç her zaman tutarlıdır: bir sınıf aynı anda tek ders görür, bir
 * öğretmen aynı anda tek sınıftadır ve kimse izin gününde ders vermez.
 * Yerleştirilemeyen dersler `unplaced` altında nedeniyle birlikte döner.
 */
export function autoSchedule(
  classes: ClassGroup[],
  scheduleDays: ClassScheduleDay[],
  subjects: Subject[],
  classSubjects: ClassSubjectInput[],
  rules: ScheduleRules = DEFAULT_RULES,
  teacherSubjects: TeacherSubject[] = [],
  teachers: Teacher[] = [],
  seed = 1,
  options: AutoScheduleOptions = {}
): ScheduleResult {
  const startedAt = Date.now();

  const model = buildModel({
    classes,
    scheduleDays,
    subjects,
    classSubjects,
    rules,
    teachers,
    teacherSubjects,
    timing: options.timing,
  });

  const feasibility = analyzeFeasibility(model);
  const solution = solve(model, { ...options, seed });

  return buildResult(model, solution, feasibility, startedAt);
}

function buildResult(
  model: Model,
  solution: Solution,
  feasibility: FeasibilityReport,
  startedAt: number
): ScheduleResult {
  const lessons: GeneratedLesson[] = [];

  for (const block of model.blocks) {
    const position = solution.placements[block.id];
    if (!position) continue;

    const course = model.courses[block.courseIdx];
    const cls = model.classes[course.classIdx];
    const subject = model.subjects[course.subjectIdx];
    const teacherIdx = solution.courseTeachers[course.index];
    const teacher = teacherIdx >= 0 ? model.teachers[teacherIdx] : null;
    const slots = model.classSlots[course.classIdx][position.day];

    for (let offset = 0; offset < block.size; offset++) {
      const slot = slots[position.startIdx + offset];
      lessons.push({
        classId: cls.id,
        className: cls.name,
        subjectId: subject.id,
        subjectName: subject.name,
        teacherId: teacher?.id ?? "",
        teacherName: teacher?.name ?? "",
        dayOfWeek: position.day,
        startTime: slot.start,
        endTime: slot.end,
      });
    }
  }

  lessons.sort(
    (a, b) =>
      a.className.localeCompare(b.className, "tr") ||
      a.dayOfWeek - b.dayOfWeek ||
      a.startTime.localeCompare(b.startTime)
  );

  const unplaced = collectUnplaced(model, solution);
  const errors = [
    ...feasibility.issues.map((issue) => issue.message),
    ...unplacedMessages(unplaced, feasibility),
  ];
  const warnings = collectWarnings(model, solution);

  const teacherHours = new Map<number, number>();
  for (const course of model.courses) {
    const teacherIdx = solution.courseTeachers[course.index];
    if (teacherIdx < 0) continue;
    const placed = course.blockIds.reduce(
      (sum, id) =>
        sum + (solution.placements[id] ? model.blocks[id].size : 0),
      0
    );
    teacherHours.set(teacherIdx, (teacherHours.get(teacherIdx) ?? 0) + placed);
  }

  const teacherLoads: TeacherLoad[] = [...teacherHours.entries()]
    .filter(([, hours]) => hours > 0)
    .map(([teacherIdx, hours]) => ({
      teacherId: model.teachers[teacherIdx].id,
      teacherName: model.teachers[teacherIdx].name,
      totalHours: hours,
    }))
    .sort((a, b) => b.totalHours - a.totalHours);

  return {
    lessons,
    errors,
    warnings,
    unplaced,
    feasibility,
    stats: {
      totalHours: solution.totalHours,
      placedHours: solution.placedHours,
      coverage:
        solution.totalHours > 0
          ? solution.placedHours / solution.totalHours
          : 1,
      maxPlaceableHours: feasibility.maxPlaceableHours,
      teacherLoads,
      restartsUsed: solution.restartsUsed,
      iterationsUsed: solution.iterationsUsed,
      elapsedMs: Date.now() - startedAt,
    },
  };
}

function collectUnplaced(model: Model, solution: Solution): UnplacedCourse[] {
  const byCourse = new Map<number, number>();
  for (const blockId of solution.unplacedBlocks) {
    const block = model.blocks[blockId];
    byCourse.set(
      block.courseIdx,
      (byCourse.get(block.courseIdx) ?? 0) + block.size
    );
  }

  // Öğretmeni olmayan dersler hiç yerleştirilmez; blokları da sayılmalı.
  for (const course of model.courses) {
    if (solution.courseTeachers[course.index] >= 0) continue;
    const hours = course.blockIds.reduce(
      (sum, id) => sum + model.blocks[id].size,
      0
    );
    if (hours > 0) byCourse.set(course.index, hours);
  }

  return [...byCourse.entries()]
    .map(([courseIdx, hours]) => {
      const course = model.courses[courseIdx];
      const cls = model.classes[course.classIdx];
      const subject = model.subjects[course.subjectIdx];
      const noTeacher = course.candidates.length === 0;
      const noDays = model.classDays[course.classIdx].length === 0;

      let reason: string;
      if (noTeacher) {
        reason = "bu dersi verebilecek öğretmen tanımlı değil";
      } else if (noDays) {
        reason = "sınıfın ders günü tanımlanmamış";
      } else if (solution.courseTeachers[course.index] < 0) {
        reason = "uygun öğretmen bulunamadı";
      } else {
        reason = "sınıfın boş saatiyle öğretmenin boş saati örtüşmedi";
      }

      return {
        classId: cls.id,
        className: cls.name,
        subjectId: subject.id,
        subjectName: subject.name,
        hours,
        reason,
      };
    })
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className, "tr") ||
        a.subjectName.localeCompare(b.subjectName, "tr")
    );
}

function unplacedMessages(
  unplaced: UnplacedCourse[],
  feasibility: FeasibilityReport
): string[] {
  if (unplaced.length === 0) return [];

  // Olurluk incelemesi zaten kök nedeni anlattıysa satır satır tekrar etmek
  // yerine tek bir özet yeterlidir.
  const explainedHours = feasibility.issues.reduce(
    (sum, issue) => sum + issue.lostHours,
    0
  );
  const unplacedHours = unplaced.reduce((sum, item) => sum + item.hours, 0);
  if (explainedHours >= unplacedHours) {
    return [
      `Yukarıdaki nedenlerle ${unplacedHours} ders saati yerleştirilemedi.`,
    ];
  }

  return unplaced.map(
    (item) =>
      `${item.className} - ${item.subjectName} (${item.hours} saat): ${item.reason}.`
  );
}

function collectWarnings(model: Model, solution: Solution): string[] {
  const warnings: string[] = [];

  for (const course of model.courses) {
    const cls = model.classes[course.classIdx];
    const subject = model.subjects[course.subjectIdx];

    if (course.pairedCourse >= 0) {
      const teacher = solution.courseTeachers[course.index];
      const pairedTeacher = solution.courseTeachers[course.pairedCourse];
      if (teacher >= 0 && teacher === pairedTeacher) {
        const pairedSubject =
          model.subjects[model.courses[course.pairedCourse].subjectIdx];
        // Her çift için tek uyarı: alfabetik olarak önce geleni raporla.
        if (
          normalizeSubjectName(subject.name) <
          normalizeSubjectName(pairedSubject.name)
        ) {
          warnings.push(
            `${cls.name}: ${subject.name} ve ${pairedSubject.name} aynı öğretmene (${model.teachers[teacher].name}) verildi; yeterli farklı öğretmen yok.`
          );
        }
      }
    }

    const placedHours = course.blockIds.reduce(
      (sum, id) => sum + (solution.placements[id] ? model.blocks[id].size : 0),
      0
    );
    if (placedHours > 0 && placedHours < course.hours) {
      warnings.push(
        `${cls.name} - ${subject.name}: ${course.hours} saatin ${placedHours} saati yerleştirilebildi.`
      );
    }
  }

  return warnings;
}
