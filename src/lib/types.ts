export interface Teacher {
  id: string;
  organization_id?: string;
  name: string;
  phone: string | null;
  email: string | null;
  off_days: number[];
  specialization: string | null;
  created_at: string;
}

export interface ClassSubject {
  id: string;
  organization_id?: string;
  class_id: string;
  subject_id: string;
  weekly_hours: number;
  teacher_id: string | null;
  created_at: string;
  subject?: Subject;
  teacher?: Teacher;
}

export interface Subject {
  id: string;
  organization_id?: string;
  name: string;
  short_name: string | null;
  color: string;
  level: string | null;
  subgroups: string | null;
  created_at: string;
}

export const LEVEL_PRESETS = [
  { label: "İlkokul (1-4)", levels: "1,2,3,4" },
  { label: "Ortaokul (5-8)", levels: "5,6,7,8" },
  { label: "Lise (9-12)", levels: "9,10,11,12" },
  { label: "Tümü (1-12)", levels: "1,2,3,4,5,6,7,8,9,10,11,12" },
];

export interface TeacherSubject {
  id: string;
  organization_id?: string;
  teacher_id: string;
  subject_id: string;
  created_at: string;
  subject?: Subject;
  teacher?: Teacher;
}

export interface ClassGroup {
  id: string;
  organization_id?: string;
  name: string;
  description: string | null;
  level: string | null;
  subgroup: string | null;
  created_at: string;
}

export const LEVELS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "Mezun",
];

export const SUBGROUPS = ["TM", "MF", "SAY", "SÖZ", "DİL", "HİBRİT"];

export interface ClassScheduleDay {
  id: string;
  organization_id?: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Lesson {
  id: string;
  organization_id?: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
  subject?: Subject;
  teacher?: Teacher;
}

export const DAY_NAMES = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

export const DAY_NAMES_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/** Ders saati ızgarasının üretildiği süreler; Genel Tanımlar'dan yönetilir. */
export interface SlotTiming {
  lessonMinutes: number;
  breakMinutes: number;
}

export const DEFAULT_SLOT_TIMING: SlotTiming = {
  lessonMinutes: 40,
  breakMinutes: 10,
};

/**
 * Bir gün için ders saati dilimlerini üretir.
 *
 * Süreler kurum ayarlarından gelir; verilmezse 40 dakika ders ve 10 dakika
 * teneffüs varsayılır.
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  timing: SlotTiming = DEFAULT_SLOT_TIMING
): { start: string; end: string }[] {
  const lessonMinutes = Math.max(1, Math.round(timing.lessonMinutes));
  const breakMinutes = Math.max(0, Math.round(timing.breakMinutes));

  const slots: { start: string; end: string }[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const format = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

  let current = startMinutes;
  while (current + lessonMinutes <= endMinutes) {
    const lessonEnd = current + lessonMinutes;
    slots.push({ start: format(current), end: format(lessonEnd) });
    current = lessonEnd + breakMinutes;
  }

  return slots;
}

export const SUBJECT_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#6366F1",
  "#14B8A6",
  "#E11D48",
  "#84CC16",
];
