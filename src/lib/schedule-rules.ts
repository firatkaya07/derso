import { generateTimeSlots } from "./types";
import type { ClassScheduleDay, Lesson, SlotTiming } from "./types";

export interface TimeSlot {
  start: string;
  end: string;
}

/** Veritabanı saatleri "16:40:00" biçiminde döner; karşılaştırmalar "16:40" üzerinden yapılır. */
export function toSlotTime(value: string): string {
  return value.slice(0, 5);
}

export function slotsForDay(
  day: ClassScheduleDay,
  timing?: SlotTiming
): TimeSlot[] {
  return generateTimeSlots(
    toSlotTime(day.start_time),
    toSlotTime(day.end_time),
    timing
  );
}

/**
 * Verilen ders günlerinin ürettiği tüm saat dilimlerinin birleşimi.
 * Farklı günler farklı saatlerde başlayabildiği için ızgara satırları bu
 * birleşim üzerinden çizilir.
 */
export function buildTimeSlots(
  days: ClassScheduleDay[],
  timing?: SlotTiming
): TimeSlot[] {
  const unique = new Map<string, TimeSlot>();
  for (const day of days) {
    for (const slot of slotsForDay(day, timing)) {
      unique.set(slot.start, slot);
    }
  }
  return [...unique.values()].sort((a, b) => a.start.localeCompare(b.start));
}

export function findScheduleDay(
  days: ClassScheduleDay[],
  dayOfWeek: number
): ClassScheduleDay | undefined {
  return days.find((day) => day.day_of_week === dayOfWeek);
}

/** Slotun sınıfın o günkü ders saatleri içinde kalıp kalmadığı. */
export function isSlotWithinClassDay(
  days: ClassScheduleDay[],
  dayOfWeek: number,
  startTime: string,
  timing?: SlotTiming
): boolean {
  const day = findScheduleDay(days, dayOfWeek);
  if (!day) return false;
  return slotsForDay(day, timing).some((slot) => slot.start === startTime);
}

export function findLessonAt(
  lessons: Lesson[],
  dayOfWeek: number,
  startTime: string
): Lesson | undefined {
  return lessons.find(
    (lesson) =>
      lesson.day_of_week === dayOfWeek &&
      toSlotTime(lesson.start_time) === startTime
  );
}

export type PlacementBlocker =
  | "no-class-day"
  | "class-busy"
  | "teacher-missing"
  | "teacher-off-day"
  | "teacher-busy"
  | "hours-complete";

export const PLACEMENT_MESSAGES: Record<PlacementBlocker, string> = {
  "no-class-day": "Sınıfın o gün/saatte dersi yok.",
  "class-busy": "Sınıfın o saatinde başka bir ders var.",
  "teacher-missing":
    "Bu ders için öğretmen belirlenmemiş. Sınıflar sayfasından öğretmen atayın.",
  "teacher-off-day": "Öğretmenin o gün izinli.",
  "teacher-busy": "Öğretmen o saatte başka bir sınıfta ders veriyor.",
  "hours-complete": "Bu dersin haftalık saati tamamlanmış.",
};

export interface PlacementCheck {
  dayOfWeek: number;
  startTime: string;
  classId: string;
  teacherId: string;
  /** Hedef sınıfın ders günleri. */
  scheduleDays: ClassScheduleDay[];
  /** Hedef sınıfın tüm dersleri. */
  classLessons: Lesson[];
  /** Öğretmenin tüm sınıflardaki dersleri. */
  teacherLessons: Lesson[];
  teacherOffDays: number[];
  weeklyHours: number;
  placedCount: number;
  /** Ders saati ızgarasının süreleri; verilmezse varsayılan kullanılır. */
  timing?: SlotTiming;
  /**
   * true ise sınıf penceresi kontrolü atlanır (çağıran taraf V2 profil
   * slotlarıyla zaten doğrulamış demektir).
   */
  assumeInWindow?: boolean;
}

/**
 * Bir ders saatinin yerleştirilip yerleştirilemeyeceğini söyler; engel varsa
 * nedenini döndürür.
 *
 * Sınıf ve öğretmen programı sayfalarının ikisi de bu fonksiyonu kullanır.
 * Daha önce kurallar iki sayfada ayrı ayrı yazılıydı ve öğretmen programı
 * sayfasında çakışma denetimi eksikti; aynı öğretmen aynı saate iki sınıfa
 * yazılabiliyordu.
 */
export function checkPlacement(check: PlacementCheck): PlacementBlocker | null {
  if (!check.teacherId) return "teacher-missing";

  if (
    !check.assumeInWindow &&
    !isSlotWithinClassDay(
      check.scheduleDays,
      check.dayOfWeek,
      check.startTime,
      check.timing
    )
  ) {
    return "no-class-day";
  }

  if (check.teacherOffDays.includes(check.dayOfWeek)) return "teacher-off-day";

  if (findLessonAt(check.classLessons, check.dayOfWeek, check.startTime)) {
    return "class-busy";
  }

  const teacherConflict = check.teacherLessons.some(
    (lesson) =>
      lesson.teacher_id === check.teacherId &&
      lesson.day_of_week === check.dayOfWeek &&
      toSlotTime(lesson.start_time) === check.startTime
  );
  if (teacherConflict) return "teacher-busy";

  if (check.weeklyHours > 0 && check.placedCount >= check.weeklyHours) {
    return "hours-complete";
  }

  return null;
}
