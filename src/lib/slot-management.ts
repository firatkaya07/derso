import { generateTimeSlots, type ClassScheduleDay, type Lesson, type SlotTiming } from "./types";
import { toSlotTime } from "./schedule-rules";

export interface DayWindow {
  startTime: string;
  endTime: string;
}

export interface SchedulePreset {
  id: string;
  label: string;
  description: string;
  startTime: string;
  endTime: string;
}

/**
 * Kurumlarda sık görülen gün pencereleri.
 * Canlı kullanımda hafta içi akşam, öğleden sonra ve cumartesi sabah baskın.
 */
export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: "evening",
    label: "Akşam",
    description: "Hafta içi akşam bandı",
    startTime: "16:40",
    endTime: "19:50",
  },
  {
    id: "afternoon",
    label: "Öğleden sonra",
    description: "Hafta içi öğleden sonra",
    startTime: "11:40",
    endTime: "14:50",
  },
  {
    id: "saturday-morning",
    label: "Cumartesi sabah",
    description: "Hafta sonu sabah bandı",
    startTime: "08:20",
    endTime: "13:20",
  },
  {
    id: "morning-school",
    label: "Sabah",
    description: "Sabah okul bandı",
    startTime: "09:00",
    endTime: "13:00",
  },
];

/** Yeni gün satırlarında kullanılan varsayılan pencere (en yaygın akşam bandı). */
export const DEFAULT_DAY_WINDOW: DayWindow = {
  startTime: SCHEDULE_PRESETS[0].startTime,
  endTime: SCHEDULE_PRESETS[0].endTime,
};

export interface GeneratedSlot {
  start: string;
  end: string;
  index: number;
}

export function slotsForWindow(
  window: DayWindow,
  timing: SlotTiming
): GeneratedSlot[] {
  return generateTimeSlots(window.startTime, window.endTime, timing).map(
    (slot, index) => ({ ...slot, index })
  );
}

export function slotCountForWindow(
  window: DayWindow,
  timing: SlotTiming
): number {
  return slotsForWindow(window, timing).length;
}

export function formatWindowLabel(window: DayWindow): string {
  return `${window.startTime}–${window.endTime}`;
}

export function formatSlotChip(slot: GeneratedSlot): string {
  return `${slot.index + 1}. ${slot.start}–${slot.end}`;
}

/**
 * Kaydedilmiş bir dersin, verilen gün pencereleri + süre ayarıyla üretilen
 * ızgarada hâlâ bir yuva bulup bulmadığını denetler.
 */
export function isLessonAlignedToSchedule(
  lesson: Pick<Lesson, "day_of_week" | "start_time">,
  scheduleDays: ClassScheduleDay[],
  timing: SlotTiming
): boolean {
  const day = scheduleDays.find((row) => row.day_of_week === lesson.day_of_week);
  if (!day) return false;
  const start = toSlotTime(lesson.start_time);
  return generateTimeSlots(
    toSlotTime(day.start_time),
    toSlotTime(day.end_time),
    timing
  ).some((slot) => slot.start === start);
}

export interface OrphanLessonRef {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
}

/** Izgara ile örtüşmeyen (yetim) ders saatleri. */
export function findOrphanLessons(
  lessons: OrphanLessonRef[],
  scheduleDays: ClassScheduleDay[],
  timing: SlotTiming
): OrphanLessonRef[] {
  return lessons.filter(
    (lesson) => !isLessonAlignedToSchedule(lesson, scheduleDays, timing)
  );
}

/**
 * Taslak gün yapılandırmasından ClassScheduleDay benzeri satırlar üretir
 * (henüz kaydedilmemiş önizleme / orphan hesabı için).
 */
export function draftScheduleDays(
  classId: string,
  configs: { day: number; enabled: boolean; startTime: string; endTime: string }[]
): ClassScheduleDay[] {
  return configs
    .filter((config) => config.enabled)
    .map((config) => ({
      id: `draft-${config.day}`,
      class_id: classId,
      day_of_week: config.day,
      start_time: config.startTime,
      end_time: config.endTime,
    }));
}

export function describeTiming(timing: SlotTiming): string {
  return `${timing.lessonMinutes} dk ders · ${timing.breakMinutes} dk teneffüs`;
}

/** Bir sınıfın haftalık toplam slot kapasitesi. */
export function weeklySlotCapacity(
  scheduleDays: ClassScheduleDay[],
  timing: SlotTiming
): number {
  return scheduleDays.reduce(
    (sum, day) =>
      sum +
      slotCountForWindow(
        {
          startTime: toSlotTime(day.start_time),
          endTime: toSlotTime(day.end_time),
        },
        timing
      ),
    0
  );
}
