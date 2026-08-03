import type {
  ClassGroup,
  ClassScheduleDay,
  SlotTiming,
  Subject,
  Teacher,
  TeacherSubject,
} from "../types";
import { generateTimeSlots } from "../types";
import { pairedSubjectOf, normalizeSubjectName } from "../paired-subjects";

export interface ScheduleRules {
  splitRules: Record<number, number[]>;
}

/** Bir sınıfa aynı dersten bir günde verilebilecek en fazla ders saati. */
export const MAX_HOURS_PER_SUBJECT_PER_DAY = 2;

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

export interface ClassSubjectInput {
  classId: string;
  subjectId: string;
  subjectName: string;
  weeklyHours: number;
  teacherId?: string | null;
}

/** Sınıfın bir gününde arka arkaya gelen ders saatlerinden biri. */
export interface SlotRef {
  /** Gün ve saat birleşiminden üretilen global anahtar. */
  key: number;
  start: string;
  end: string;
}

/** Bir bloğun yerleşebileceği aday konum. */
export interface Position {
  day: number;
  /** Sınıfın o günkü slot dizisindeki başlangıç indeksi. */
  startIdx: number;
  keys: number[];
  startTime: string;
  endTime: string;
}

export interface Course {
  index: number;
  classIdx: number;
  subjectIdx: number;
  hours: number;
  blockIds: number[];
  /** Sabit atanmış öğretmen; yoksa -1. */
  fixedTeacher: number;
  /** Dersi verebilen öğretmenler. */
  candidates: number[];
  /** Eşli dersin aynı sınıftaki ders indeksi; yoksa -1. */
  pairedCourse: number;
}

export interface Block {
  id: number;
  courseIdx: number;
  size: number;
}

export interface Model {
  classes: ClassGroup[];
  teachers: Teacher[];
  subjects: Subject[];
  times: string[];
  numTimes: number;
  numDayTime: number;
  /** [classIdx][day] -> o günün slotları (boşsa sınıf o gün ders görmüyor). */
  classSlots: SlotRef[][][];
  classDays: number[][];
  /** [classIdx][size] -> aday konumlar. */
  positions: Position[][][];
  courses: Course[];
  blocks: Block[];
  /** teacherIdx * 7 + day -> 1 ise izinli. */
  teacherOff: Uint8Array;
  /** Sınıfın toplam slot sayısı. */
  classCapacity: number[];
  /**
   * Sınıfın en küçük blok boyu. Bundan kısa boşluklar hiçbir bloğa yetmez,
   * dolayısıyla yerleştirme sırasında oluşmaları cezalandırılır.
   */
  classMinBlockSize: number[];
}

export function splitHours(
  hours: number,
  rules: Record<number, number[]>
): number[] {
  const rule = rules[hours];
  let parts: number[];
  if (rule && rule.length > 0) {
    const total = rule.reduce((sum, part) => sum + part, 0);
    if (total === hours) parts = [...rule];
    else parts = defaultSplit(hours);
  } else {
    parts = defaultSplit(hours);
  }

  // Sert kural: günde en fazla MAX saat → blok boyu da bunu aşamaz.
  const result: number[] = [];
  for (const part of parts) {
    let remaining = Math.max(0, Math.floor(part));
    while (remaining > MAX_HOURS_PER_SUBJECT_PER_DAY) {
      result.push(MAX_HOURS_PER_SUBJECT_PER_DAY);
      remaining -= MAX_HOURS_PER_SUBJECT_PER_DAY;
    }
    if (remaining > 0) result.push(remaining);
  }
  return result;
}

function defaultSplit(hours: number): number[] {
  const result: number[] = [];
  let remaining = hours;
  while (remaining > 0) {
    if (remaining >= MAX_HOURS_PER_SUBJECT_PER_DAY) {
      result.push(MAX_HOURS_PER_SUBJECT_PER_DAY);
      remaining -= MAX_HOURS_PER_SUBJECT_PER_DAY;
    } else {
      result.push(1);
      remaining -= 1;
    }
  }
  return result;
}

export interface BuildModelInput {
  classes: ClassGroup[];
  scheduleDays: ClassScheduleDay[];
  subjects: Subject[];
  classSubjects: ClassSubjectInput[];
  rules: ScheduleRules;
  teachers: Teacher[];
  teacherSubjects: TeacherSubject[];
  /** Ders saati ızgarasının süreleri; verilmezse 40 + 10 dakika. */
  timing?: SlotTiming;
}

/**
 * Girdiyi çözücünün üzerinde çalışacağı dizi tabanlı modele çevirir.
 *
 * Zaman ekseni tüm sınıfların slot başlangıçlarının birleşimidir; böylece
 * farklı saatlerde başlayan sınıfların öğretmen çakışması tek bir tamsayı
 * anahtar karşılaştırmasına iner.
 */
export function buildModel(input: BuildModelInput): Model {
  const classIndex = new Map(input.classes.map((cls, i) => [cls.id, i]));
  const teacherIndex = new Map(input.teachers.map((t, i) => [t.id, i]));
  const subjectIndex = new Map(input.subjects.map((s, i) => [s.id, i]));

  const daysByClass = new Map<number, ClassScheduleDay[]>();
  for (const day of input.scheduleDays) {
    const idx = classIndex.get(day.class_id);
    if (idx === undefined) continue;
    const list = daysByClass.get(idx) ?? [];
    list.push(day);
    daysByClass.set(idx, list);
  }

  const timeSet = new Set<string>();
  for (const day of input.scheduleDays) {
    for (const slot of generateTimeSlots(
      day.start_time.slice(0, 5),
      day.end_time.slice(0, 5),
      input.timing
    )) {
      timeSet.add(slot.start);
    }
  }
  const times = [...timeSet].sort();
  const timeIndex = new Map(times.map((time, i) => [time, i]));
  const numTimes = times.length;
  const numDayTime = 7 * Math.max(1, numTimes);

  const classSlots: SlotRef[][][] = input.classes.map(() =>
    Array.from({ length: 7 }, () => [] as SlotRef[])
  );
  const classDays: number[][] = input.classes.map(() => []);
  const classCapacity: number[] = input.classes.map(() => 0);

  for (const [classIdx, days] of daysByClass) {
    for (const day of days) {
      const slots = generateTimeSlots(
        day.start_time.slice(0, 5),
        day.end_time.slice(0, 5),
        input.timing
      ).map((slot) => ({
        key: day.day_of_week * numTimes + timeIndex.get(slot.start)!,
        start: slot.start,
        end: slot.end,
      }));
      if (slots.length === 0) continue;
      classSlots[classIdx][day.day_of_week] = slots;
      classCapacity[classIdx] += slots.length;
    }
    classDays[classIdx] = classSlots[classIdx]
      .map((slots, day) => (slots.length > 0 ? day : -1))
      .filter((day) => day >= 0);
  }

  const teachersBySubject = new Map<number, number[]>();
  for (const link of input.teacherSubjects) {
    const subjectIdx = subjectIndex.get(link.subject_id);
    const teacherIdx = teacherIndex.get(link.teacher_id);
    if (subjectIdx === undefined || teacherIdx === undefined) continue;
    const list = teachersBySubject.get(subjectIdx) ?? [];
    if (!list.includes(teacherIdx)) list.push(teacherIdx);
    teachersBySubject.set(subjectIdx, list);
  }

  const teacherOff = new Uint8Array(input.teachers.length * 7);
  input.teachers.forEach((teacher, idx) => {
    for (const day of teacher.off_days ?? []) {
      if (day >= 0 && day < 7) teacherOff[idx * 7 + day] = 1;
    }
  });

  const courses: Course[] = [];
  const blocks: Block[] = [];

  for (const cs of input.classSubjects) {
    const classIdx = classIndex.get(cs.classId);
    const subjectIdx = subjectIndex.get(cs.subjectId);
    if (classIdx === undefined || subjectIdx === undefined) continue;
    if (cs.weeklyHours <= 0) continue;

    const fixedTeacher = cs.teacherId
      ? (teacherIndex.get(cs.teacherId) ?? -1)
      : -1;
    const eligible = teachersBySubject.get(subjectIdx) ?? [];
    // Sabit atama, öğretmen-ders eşleşmesi tanımlı olmasa bile geçerlidir:
    // kullanıcı bilinçli olarak o öğretmeni seçmiştir.
    const candidates =
      fixedTeacher >= 0 && !eligible.includes(fixedTeacher)
        ? [fixedTeacher, ...eligible]
        : eligible;

    const courseIdx = courses.length;
    const blockIds: number[] = [];
    for (const size of splitHours(cs.weeklyHours, input.rules.splitRules)) {
      const id = blocks.length;
      blocks.push({ id, courseIdx, size });
      blockIds.push(id);
    }

    courses.push({
      index: courseIdx,
      classIdx,
      subjectIdx,
      hours: cs.weeklyHours,
      blockIds,
      fixedTeacher,
      candidates,
      pairedCourse: -1,
    });
  }

  linkPairedCourses(courses, input.subjects);

  const classMinBlockSize = input.classes.map(() => Number.POSITIVE_INFINITY);
  for (const block of blocks) {
    const classIdx = courses[block.courseIdx].classIdx;
    classMinBlockSize[classIdx] = Math.min(
      classMinBlockSize[classIdx],
      block.size
    );
  }
  for (let i = 0; i < classMinBlockSize.length; i++) {
    if (!Number.isFinite(classMinBlockSize[i])) classMinBlockSize[i] = 1;
  }

  const maxSize = blocks.reduce((max, block) => Math.max(max, block.size), 1);
  const positions: Position[][][] = input.classes.map((_, classIdx) => {
    const bySize: Position[][] = [];
    for (let size = 0; size <= maxSize; size++) bySize.push([]);
    for (let size = 1; size <= maxSize; size++) {
      for (const day of classDays[classIdx]) {
        const slots = classSlots[classIdx][day];
        for (let startIdx = 0; startIdx + size <= slots.length; startIdx++) {
          const window = slots.slice(startIdx, startIdx + size);
          bySize[size].push({
            day,
            startIdx,
            keys: window.map((slot) => slot.key),
            startTime: window[0].start,
            endTime: window[window.length - 1].end,
          });
        }
      }
    }
    return bySize;
  });

  return {
    classes: input.classes,
    teachers: input.teachers,
    subjects: input.subjects,
    times,
    numTimes,
    numDayTime,
    classSlots,
    classDays,
    positions,
    courses,
    blocks,
    teacherOff,
    classCapacity,
    classMinBlockSize,
  };
}

function linkPairedCourses(courses: Course[], subjects: Subject[]) {
  const byClassAndName = new Map<string, number>();
  for (const course of courses) {
    const name = normalizeSubjectName(subjects[course.subjectIdx]?.name ?? "");
    byClassAndName.set(`${course.classIdx}:${name}`, course.index);
  }
  for (const course of courses) {
    const name = normalizeSubjectName(subjects[course.subjectIdx]?.name ?? "");
    const pairedName = pairedSubjectOf(name);
    if (!pairedName) continue;
    const paired = byClassAndName.get(`${course.classIdx}:${pairedName}`);
    if (paired !== undefined) course.pairedCourse = paired;
  }
}
