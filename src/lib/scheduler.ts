import type { Teacher, Subject, ClassGroup, ClassScheduleDay } from "./types";
import { generateTimeSlots } from "./types";

export interface ClassSubjectInput {
  classId: string;
  subjectId: string;
  subjectName: string;
  weeklyHours: number;
}

export interface ScheduleRules {
  splitRules: Record<number, number[]>;
  respectOffDays: boolean;
  noDoubleBooking: boolean;
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
  respectOffDays: true,
  noDoubleBooking: true,
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

const SUBJECT_TEACHER_MAP: Record<string, string[]> = {
  "MAT 1": ["matematik"],
  "MAT 2": ["matematik"],
  GEO: ["matematik"],
  MATEMATİK: ["matematik"],
  FİZİK: ["fizik"],
  KİMYA: ["kimya"],
  BİYOLOJİ: ["biyoloji"],
  TÜRKÇE: ["türk dili", "edebiyat"],
  EDEBİYAT: ["türk dili", "edebiyat"],
  TARİH: ["tarih"],
  COĞRAFYA: ["coğrafya"],
  "FEN BİLGİSİ": ["fen bilim"],
  SOSYAL: ["sosyal"],
  İNGİLİZCE: ["ingilizce"],
};

function canTeach(teacher: Teacher, subjectName: string): boolean {
  const keywords = SUBJECT_TEACHER_MAP[subjectName.toUpperCase()];
  if (!keywords) return false;
  const spec = (teacher.specialization || "").toLowerCase();
  return keywords.some((kw) => spec.includes(kw));
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

interface SlotOccupancy {
  classSlots: Map<string, Set<string>>;
  teacherSlots: Map<string, Set<string>>;
}

function slotKey(dayOfWeek: number, startTime: string): string {
  return `${dayOfWeek}:${startTime}`;
}

export function autoSchedule(
  classes: ClassGroup[],
  scheduleDays: ClassScheduleDay[],
  subjects: Subject[],
  teachers: Teacher[],
  classSubjects: ClassSubjectInput[],
  rules: ScheduleRules
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
  for (const t of teachers) teacherMap.set(t.id, t);

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
    const aTeachers = teachers.filter((t) => canTeach(t, a.subjectName)).length;
    const bTeachers = teachers.filter((t) => canTeach(t, b.subjectName)).length;
    if (aTeachers !== bTeachers) return aTeachers - bTeachers;
    return b.blockSize - a.blockSize;
  });

  const occupancy: SlotOccupancy = {
    classSlots: new Map(),
    teacherSlots: new Map(),
  };

  function isClassSlotFree(classId: string, day: number, time: string): boolean {
    const key = slotKey(day, time);
    const set = occupancy.classSlots.get(classId);
    return !set || !set.has(key);
  }

  function isTeacherSlotFree(
    teacherId: string,
    day: number,
    time: string
  ): boolean {
    if (!rules.noDoubleBooking) return true;
    const key = slotKey(day, time);
    const set = occupancy.teacherSlots.get(teacherId);
    return !set || !set.has(key);
  }

  function occupySlot(
    classId: string,
    teacherId: string,
    day: number,
    time: string
  ) {
    const key = slotKey(day, time);
    if (!occupancy.classSlots.has(classId))
      occupancy.classSlots.set(classId, new Set());
    occupancy.classSlots.get(classId)!.add(key);
    if (!occupancy.teacherSlots.has(teacherId))
      occupancy.teacherSlots.set(teacherId, new Set());
    occupancy.teacherSlots.get(teacherId)!.add(key);
  }

  const teacherLoadMap = new Map<string, number>();

  for (const block of blocks) {
    const classDays = classDaysMap.get(block.classId) || [];
    if (classDays.length === 0) {
      errors.push(
        `${block.className}: Ders günü tanımlanmamış, ${block.subjectName} yerleştirilemedi.`
      );
      continue;
    }

    const capableTeachers = teachers.filter((t) =>
      canTeach(t, block.subjectName)
    );
    if (capableTeachers.length === 0) {
      errors.push(
        `${block.subjectName}: Bu ders için uygun öğretmen bulunamadı.`
      );
      continue;
    }

    const sortedTeachers = [...capableTeachers].sort((a, b) => {
      const loadA = teacherLoadMap.get(a.id) || 0;
      const loadB = teacherLoadMap.get(b.id) || 0;
      return loadA - loadB;
    });

    let placed = false;

    const dayOrder = [...classDays].sort((a, b) => {
      const aUsed = occupancy.classSlots.get(block.classId);
      const bUsed = occupancy.classSlots.get(block.classId);
      const aCount = aUsed
        ? [...aUsed].filter((k) => k.startsWith(`${a.day_of_week}:`)).length
        : 0;
      const bCount = bUsed
        ? [...bUsed].filter((k) => k.startsWith(`${b.day_of_week}:`)).length
        : 0;
      return aCount - bCount;
    });

    for (const day of dayOrder) {
      if (placed) break;

      const slots = generateTimeSlots(
        day.start_time.slice(0, 5),
        day.end_time.slice(0, 5)
      );

      for (let startIdx = 0; startIdx <= slots.length - block.blockSize; startIdx++) {
        if (placed) break;

        let slotsAvailable = true;
        for (let i = 0; i < block.blockSize; i++) {
          if (
            !isClassSlotFree(
              block.classId,
              day.day_of_week,
              slots[startIdx + i].start
            )
          ) {
            slotsAvailable = false;
            break;
          }
        }
        if (!slotsAvailable) continue;

        for (const teacher of sortedTeachers) {
          if (placed) break;

          if (
            rules.respectOffDays &&
            teacher.off_days &&
            teacher.off_days.includes(day.day_of_week)
          ) {
            continue;
          }

          let teacherFree = true;
          for (let i = 0; i < block.blockSize; i++) {
            if (
              !isTeacherSlotFree(
                teacher.id,
                day.day_of_week,
                slots[startIdx + i].start
              )
            ) {
              teacherFree = false;
              break;
            }
          }
          if (!teacherFree) continue;

          for (let i = 0; i < block.blockSize; i++) {
            const slot = slots[startIdx + i];
            occupySlot(
              block.classId,
              teacher.id,
              day.day_of_week,
              slot.start
            );
            lessons.push({
              classId: block.classId,
              className: block.className,
              subjectId: block.subjectId,
              subjectName: block.subjectName,
              teacherId: teacher.id,
              teacherName: teacher.name,
              dayOfWeek: day.day_of_week,
              startTime: slot.start,
              endTime: slot.end,
            });
          }
          teacherLoadMap.set(
            teacher.id,
            (teacherLoadMap.get(teacher.id) || 0) + block.blockSize
          );
          placed = true;
        }
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
