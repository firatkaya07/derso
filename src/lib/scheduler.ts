import type {
  Subject,
  ClassGroup,
  ClassScheduleDay,
  TeacherSubject,
  Teacher,
} from "./types";
import { generateTimeSlots } from "./types";

export interface ClassSubjectInput {
  classId: string;
  subjectId: string;
  subjectName: string;
  weeklyHours: number;
}

export interface ScheduleRules {
  splitRules: Record<number, number[]>;
}

export const DEFAULT_RULES: ScheduleRules = {
  splitRules: {
    1: [1],
    2: [2],
    3: [2, 1],
    4: [2, 2],
    5: [2, 2, 1],
    6: [2, 2, 2],
  },
};

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

export interface ScheduleResult {
  lessons: GeneratedLesson[];
  errors: string[];
  warnings: string[];
}

function splitHours(hours: number, rules: Record<number, number[]>): number[] {
  if (rules[hours]) return [...rules[hours]];
  const result: number[] = [];
  let remaining = hours;
  while (remaining > 0) {
    if (remaining >= 2) {
      result.push(2);
      remaining -= 2;
    } else {
      result.push(1);
      remaining -= 1;
    }
  }
  return result;
}

interface LessonBlock {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  blockSize: number;
}

function slotKey(dayOfWeek: number, startTime: string): string {
  return `${dayOfWeek}:${startTime}`;
}

function classSubjectDayKey(
  classId: string,
  subjectId: string,
  day: number
): string {
  return `${classId}:${subjectId}:${day}`;
}

export function autoSchedule(
  classes: ClassGroup[],
  scheduleDays: ClassScheduleDay[],
  subjects: Subject[],
  classSubjects: ClassSubjectInput[],
  rules: ScheduleRules,
  teacherSubjects?: TeacherSubject[],
  teachers?: Teacher[]
): ScheduleResult {
  const lessons: GeneratedLesson[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const classDaysMap = new Map<string, ClassScheduleDay[]>();
  for (const sd of scheduleDays) {
    const arr = classDaysMap.get(sd.class_id) || [];
    arr.push(sd);
    classDaysMap.set(sd.class_id, arr);
  }

  const classMap = new Map<string, ClassGroup>();
  for (const c of classes) classMap.set(c.id, c);

  const subjectMap = new Map<string, Subject>();
  for (const s of subjects) subjectMap.set(s.id, s);

  const teacherMap = new Map<string, Teacher>();
  if (teachers) {
    for (const t of teachers) teacherMap.set(t.id, t);
  }

  const teacherCountBySubject = new Map<string, number>();
  const teacherCountBySubjectDay = new Map<string, number>();

  if (teacherSubjects) {
    const teacherSets = new Map<string, Set<string>>();
    for (const ts of teacherSubjects) {
      if (!teacherSets.has(ts.subject_id))
        teacherSets.set(ts.subject_id, new Set());
      teacherSets.get(ts.subject_id)!.add(ts.teacher_id);
    }
    for (const [subId, set] of teacherSets) {
      teacherCountBySubject.set(subId, set.size);

      if (teachers) {
        for (let day = 0; day < 7; day++) {
          let available = 0;
          for (const tid of set) {
            const teacher = teacherMap.get(tid);
            if (
              !teacher ||
              !teacher.off_days ||
              !teacher.off_days.includes(day)
            ) {
              available++;
            }
          }
          teacherCountBySubjectDay.set(`${subId}:${day}`, available);
        }
      }
    }
  }

  function getMaxConcurrent(subjectId: string, day: number): number {
    if (teacherCountBySubjectDay.size > 0) {
      const dayCount = teacherCountBySubjectDay.get(`${subjectId}:${day}`);
      if (dayCount !== undefined) return dayCount;
    }
    const total = teacherCountBySubject.get(subjectId);
    if (total !== undefined) return total;
    return Infinity;
  }

  const subjectSlotCount = new Map<string, number>();
  function getSubjectSlotUsage(subjectId: string, key: string): number {
    const k = `${subjectId}:${key}`;
    return subjectSlotCount.get(k) || 0;
  }
  function addSubjectSlotUsage(subjectId: string, key: string) {
    const k = `${subjectId}:${key}`;
    subjectSlotCount.set(k, (subjectSlotCount.get(k) || 0) + 1);
  }

  // Track per class+subject+day hours for the "max 2 per day" rule
  const classDaySubjectHours = new Map<string, number>();
  function getDaySubjectHours(
    classId: string,
    subjectId: string,
    day: number
  ): number {
    return classDaySubjectHours.get(classSubjectDayKey(classId, subjectId, day)) || 0;
  }
  function addDaySubjectHours(
    classId: string,
    subjectId: string,
    day: number,
    hours: number
  ) {
    const k = classSubjectDayKey(classId, subjectId, day);
    classDaySubjectHours.set(k, (classDaySubjectHours.get(k) || 0) + hours);
  }

  // Track placed lesson times per class+subject+day for adjacency checks
  const classDaySubjectSlots = new Map<string, string[]>();
  function getDaySubjectSlots(
    classId: string,
    subjectId: string,
    day: number
  ): string[] {
    return classDaySubjectSlots.get(classSubjectDayKey(classId, subjectId, day)) || [];
  }
  function addDaySubjectSlot(
    classId: string,
    subjectId: string,
    day: number,
    startTime: string
  ) {
    const k = classSubjectDayKey(classId, subjectId, day);
    const arr = classDaySubjectSlots.get(k) || [];
    arr.push(startTime);
    classDaySubjectSlots.set(k, arr);
  }

  const blocks: LessonBlock[] = [];
  for (const cs of classSubjects) {
    const cls = classMap.get(cs.classId);
    const sub = subjectMap.get(cs.subjectId);
    if (!cls || !sub) continue;

    const splits = splitHours(cs.weeklyHours, rules.splitRules);
    for (const blockSize of splits) {
      blocks.push({
        classId: cs.classId,
        className: cls.name,
        subjectId: cs.subjectId,
        subjectName: sub.name,
        blockSize,
      });
    }
  }

  blocks.sort((a, b) => {
    const aTeachers = teacherCountBySubject.get(a.subjectId) || 999;
    const bTeachers = teacherCountBySubject.get(b.subjectId) || 999;
    if (aTeachers !== bTeachers) return aTeachers - bTeachers;
    return b.blockSize - a.blockSize;
  });

  const classSlots = new Map<string, Set<string>>();

  function isClassSlotFree(
    classId: string,
    day: number,
    time: string
  ): boolean {
    const key = slotKey(day, time);
    const set = classSlots.get(classId);
    return !set || !set.has(key);
  }

  function occupySlot(classId: string, day: number, time: string) {
    const key = slotKey(day, time);
    if (!classSlots.has(classId)) classSlots.set(classId, new Set());
    classSlots.get(classId)!.add(key);
  }

  function canPlaceBlock(
    block: LessonBlock,
    day: number,
    slots: { start: string; end: string }[],
    startIdx: number
  ): boolean {
    const maxConcurrent = getMaxConcurrent(block.subjectId, day);
    for (let i = 0; i < block.blockSize; i++) {
      if (!isClassSlotFree(block.classId, day, slots[startIdx + i].start)) {
        return false;
      }

      if (maxConcurrent !== Infinity) {
        const key = slotKey(day, slots[startIdx + i].start);
        const currentUsage = getSubjectSlotUsage(block.subjectId, key);
        if (currentUsage >= maxConcurrent) {
          return false;
        }
      }
    }
    return true;
  }

  function isAdjacentToExisting(
    block: LessonBlock,
    day: number,
    slots: { start: string; end: string }[],
    startIdx: number
  ): boolean {
    const existing = getDaySubjectSlots(block.classId, block.subjectId, day);
    if (existing.length === 0) return true;

    const blockEnd = slots[startIdx + block.blockSize - 1].end;
    const blockStart = slots[startIdx].start;

    for (const existStart of existing) {
      if (existStart === blockEnd || existStart === blockStart) return true;
    }

    const existingSorted = [...existing].sort();
    const lastExistingStart = existingSorted[existingSorted.length - 1];
    const lastExistingSlotIdx = slots.findIndex(
      (s) => s.start === lastExistingStart
    );
    if (lastExistingSlotIdx >= 0) {
      const lastExistingEnd = slots[lastExistingSlotIdx].end;
      if (blockStart === lastExistingEnd) return true;
    }

    const firstExistingStart = existingSorted[0];
    if (blockEnd === firstExistingStart) return true;

    return false;
  }

  function tryPlaceBlock(
    block: LessonBlock,
    classDays: ClassScheduleDay[],
    allowExceedDayLimit: boolean
  ): boolean {
    const dayOrder = [...classDays].sort((a, b) => {
      const aSubjectHours = getDaySubjectHours(
        block.classId,
        block.subjectId,
        a.day_of_week
      );
      const bSubjectHours = getDaySubjectHours(
        block.classId,
        block.subjectId,
        b.day_of_week
      );
      if (aSubjectHours !== bSubjectHours) return aSubjectHours - bSubjectHours;

      const aUsed = classSlots.get(block.classId);
      const aCount = aUsed
        ? [...aUsed].filter((k) => k.startsWith(`${a.day_of_week}:`)).length
        : 0;
      const bCount = aUsed
        ? [...aUsed].filter((k) => k.startsWith(`${b.day_of_week}:`)).length
        : 0;
      return aCount - bCount;
    });

    for (const day of dayOrder) {
      const currentDayHours = getDaySubjectHours(
        block.classId,
        block.subjectId,
        day.day_of_week
      );

      if (
        !allowExceedDayLimit &&
        currentDayHours + block.blockSize > 2
      ) {
        continue;
      }

      const slots = generateTimeSlots(
        day.start_time.slice(0, 5),
        day.end_time.slice(0, 5)
      );

      for (
        let startIdx = 0;
        startIdx <= slots.length - block.blockSize;
        startIdx++
      ) {
        if (!canPlaceBlock(block, day.day_of_week, slots, startIdx)) continue;

        if (
          currentDayHours > 0 &&
          !isAdjacentToExisting(block, day.day_of_week, slots, startIdx)
        ) {
          continue;
        }

        for (let i = 0; i < block.blockSize; i++) {
          const slot = slots[startIdx + i];
          const key = slotKey(day.day_of_week, slot.start);
          occupySlot(block.classId, day.day_of_week, slot.start);
          addSubjectSlotUsage(block.subjectId, key);
          addDaySubjectSlot(
            block.classId,
            block.subjectId,
            day.day_of_week,
            slot.start
          );
          lessons.push({
            classId: block.classId,
            className: block.className,
            subjectId: block.subjectId,
            subjectName: block.subjectName,
            teacherId: "",
            teacherName: "",
            dayOfWeek: day.day_of_week,
            startTime: slot.start,
            endTime: slot.end,
          });
        }
        addDaySubjectHours(
          block.classId,
          block.subjectId,
          day.day_of_week,
          block.blockSize
        );
        return true;
      }
    }
    return false;
  }

  for (const block of blocks) {
    const classDays = classDaysMap.get(block.classId) || [];
    if (classDays.length === 0) {
      errors.push(
        `${block.className}: Ders günü tanımlanmamış, ${block.subjectName} yerleştirilemedi.`
      );
      continue;
    }

    // First try with the 2-hour-per-day limit
    let placed = tryPlaceBlock(block, classDays, false);

    // Fallback: allow exceeding the limit if no other option
    if (!placed) {
      placed = tryPlaceBlock(block, classDays, true);
      if (placed) {
        warnings.push(
          `${block.className} - ${block.subjectName}: Aynı gün 2 saatten fazla verildi (başka gün bulunamadı).`
        );
      }
    }

    if (!placed) {
      errors.push(
        `${block.className} - ${block.subjectName} (${block.blockSize} ders): Uygun slot bulunamadı.`
      );
    }
  }

  return { lessons, errors, warnings };
}
