/**
 * Derso V2 zaman çizelgesi.
 *
 * Hafta içi (Pzt–Cum) ve hafta sonu (Cmt–Paz) için ayrı profiller:
 * başlangıç saati, ders süresi, slot sayısı ve N−1 teneffüs süresi.
 */
import type { ClassScheduleDay } from "@/lib/types";
import { toSlotTime } from "@/lib/schedule-rules";
import { DAY_NAMES_SHORT as DAY_SHORT } from "@/lib/types";

export { DAY_SHORT as DAY_NAMES_SHORT };

export type DayGroup = "weekday" | "weekend";

export const WEEKDAY_DAYS = [0, 1, 2, 3, 4] as const;
export const WEEKEND_DAYS = [5, 6] as const;

export interface ScheduleProfileV2 {
  dayGroup: DayGroup;
  /** "HH:MM" */
  startTime: string;
  lessonDurationMinutes: number;
  slotCount: number;
  /** length === slotCount - 1 */
  breakMinutes: number[];
}

export interface TimelineSlot {
  index: number;
  start: string;
  end: string;
  label: string;
}

export const DEFAULT_WEEKDAY_PROFILE: ScheduleProfileV2 = {
  dayGroup: "weekday",
  startTime: "08:00",
  lessonDurationMinutes: 40,
  slotCount: 8,
  breakMinutes: [10, 10, 10, 10, 10, 10, 10],
};

export const DEFAULT_WEEKEND_PROFILE: ScheduleProfileV2 = {
  dayGroup: "weekend",
  startTime: "09:00",
  lessonDurationMinutes: 40,
  slotCount: 6,
  breakMinutes: [10, 10, 10, 10, 10],
};

export function dayGroupOf(dayOfWeek: number): DayGroup {
  return dayOfWeek >= 0 && dayOfWeek <= 4 ? "weekday" : "weekend";
}

export function daysOfGroup(group: DayGroup): readonly number[] {
  return group === "weekday" ? WEEKDAY_DAYS : WEEKEND_DAYS;
}

export function normalizeBreaks(
  slotCount: number,
  breaks: number[],
  fallback = 10
): number[] {
  const n = Math.max(1, Math.round(slotCount));
  const needed = Math.max(0, n - 1);
  const out: number[] = [];
  for (let i = 0; i < needed; i++) {
    const raw = breaks[i];
    const value =
      typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : fallback;
    out.push(Math.min(120, Math.max(0, value)));
  }
  return out;
}

function parseHm(value: string): number {
  const [h, m] = toSlotTime(value).split(":").map(Number);
  return h * 60 + m;
}

function formatHm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Kurum profilinden sabit N slot üretir (sınıf penceresinden bağımsız). */
export function generateProfileSlots(profile: ScheduleProfileV2): TimelineSlot[] {
  const slotCount = Math.min(20, Math.max(1, Math.round(profile.slotCount)));
  const lesson = Math.min(180, Math.max(5, Math.round(profile.lessonDurationMinutes)));
  const breaks = normalizeBreaks(slotCount, profile.breakMinutes);
  let cur = parseHm(profile.startTime);
  const slots: TimelineSlot[] = [];

  for (let i = 0; i < slotCount; i++) {
    const start = formatHm(cur);
    const end = formatHm(cur + lesson);
    slots.push({
      index: i,
      start,
      end,
      label: `${i + 1}. Ders`,
    });
    cur = cur + lesson + (i < slotCount - 1 ? breaks[i] ?? 0 : 0);
  }
  return slots;
}

/** Slot tamamen sınıfın o günkü penceresinin içinde mi? */
export function isSlotInsideClassWindow(
  slot: TimelineSlot,
  day: ClassScheduleDay | undefined
): boolean {
  if (!day) return false;
  const winStart = parseHm(day.start_time);
  const winEnd = parseHm(day.end_time);
  const slotStart = parseHm(slot.start);
  const slotEnd = parseHm(slot.end);
  return slotStart >= winStart && slotEnd <= winEnd;
}

/**
 * Sınıfın aktif günlerine göre gösterilecek kolonlar.
 * Hafta sonu günü yoksa Cumartesi–Pazar kolonları üretilmez.
 */
export function visibleDaysForClass(
  scheduleDays: ClassScheduleDay[],
  group?: DayGroup
): number[] {
  const active = new Set(scheduleDays.map((d) => d.day_of_week));
  const pool =
    group === "weekday"
      ? WEEKDAY_DAYS
      : group === "weekend"
        ? WEEKEND_DAYS
        : [...WEEKDAY_DAYS, ...WEEKEND_DAYS];
  return pool.filter((d) => active.has(d));
}

export function profileEndTime(profile: ScheduleProfileV2): string {
  const slots = generateProfileSlots(profile);
  return slots[slots.length - 1]?.end ?? profile.startTime;
}

export function describeProfile(profile: ScheduleProfileV2): string {
  const slots = generateProfileSlots(profile);
  const last = slots[slots.length - 1];
  return `${slots.length} ders · ${profile.startTime}–${last?.end ?? "?"} · ders ${profile.lessonDurationMinutes} dk`;
}
