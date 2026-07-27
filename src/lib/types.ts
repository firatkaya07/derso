export interface Teacher {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ClassScheduleDay {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Lesson {
  id: string;
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

export const LESSON_DURATION = 40;
export const BREAK_DURATION = 10;
export const SLOT_DURATION = LESSON_DURATION + BREAK_DURATION;

export function generateTimeSlots(
  startTime: string,
  endTime: string
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  let current = startMinutes;
  while (current + LESSON_DURATION <= endMinutes) {
    const lessonEnd = current + LESSON_DURATION;
    slots.push({
      start: `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`,
      end: `${String(Math.floor(lessonEnd / 60)).padStart(2, "0")}:${String(lessonEnd % 60).padStart(2, "0")}`,
    });
    current = lessonEnd + BREAK_DURATION;
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
