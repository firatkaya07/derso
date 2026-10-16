import type { ScheduleEdition } from "@/lib/edition";
import { throwIfDbError } from "@/lib/db-error";
import { findLessonAt, slotsForDay, toSlotTime } from "@/lib/schedule-rules";
import { loadSettings, slotTimingOf } from "@/lib/settings";
import type { ClassGroup, ClassScheduleDay, Lesson, Teacher } from "@/lib/types";
import { loadScheduleProfilesV2 } from "@/lib/v2/profiles";
import { v2SlotsForClassDay } from "@/lib/v2/schedule-slots";
import { supabase } from "./supabase";

/** Öğretmen programında dersin hangi sınıfta olduğunu da göstermek için. */
export type ScheduledLesson = Lesson & {
  class?: Pick<ClassGroup, "id" | "name">;
};

export interface ScheduleRow {
  start: string;
  end: string;
  /** Sınıf programında boş saatler de satır olarak gösterilir. */
  lesson?: ScheduledLesson;
}

export interface DaySchedule {
  day: number;
  rows: ScheduleRow[];
}

const LESSON_SELECT =
  "id, organization_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, created_at, subject:subjects(*), teacher:teachers(*), class:classes(id, name)";

function lessonTable(edition: ScheduleEdition) {
  return edition === "v2" ? "lessons_v2" : "lessons";
}

export async function loadClasses(organizationId: string): Promise<ClassGroup[]> {
  const result = await supabase
    .from("classes")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  throwIfDbError(result, "Sınıflar okunamadı");
  return result.data ?? [];
}

export async function loadTeachers(organizationId: string): Promise<Teacher[]> {
  const result = await supabase
    .from("teachers")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  throwIfDbError(result, "Öğretmenler okunamadı");
  return result.data ?? [];
}

async function loadLessons(
  organizationId: string,
  edition: ScheduleEdition,
  filter: { column: "class_id" | "teacher_id"; id: string }
): Promise<ScheduledLesson[]> {
  const result = await supabase
    .from(lessonTable(edition))
    .select(LESSON_SELECT)
    .eq("organization_id", organizationId)
    .eq(filter.column, filter.id);
  throwIfDbError(result, "Ders programı okunamadı");
  return (result.data ?? []) as unknown as ScheduledLesson[];
}

function byStart(a: { start: string }, b: { start: string }) {
  return a.start.localeCompare(b.start);
}

function rowOf(lesson: ScheduledLesson): ScheduleRow {
  return {
    start: toSlotTime(lesson.start_time),
    end: toSlotTime(lesson.end_time),
    lesson,
  };
}

/**
 * Sınıfın haftalık programı: ders günlerindeki tüm saat dilimleri, dolu
 * olanlar dersiyle birlikte. Dilimler web'deki ızgarayla aynı kurallarla
 * üretilir (V1: kurum ders/teneffüs süreleri, V2: zaman çizelgesi profilleri).
 */
export async function loadClassSchedule(
  organizationId: string,
  edition: ScheduleEdition,
  classId: string
): Promise<DaySchedule[]> {
  const [daysResult, lessons, slotsOf] = await Promise.all([
    supabase
      .from("class_schedule_days")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("class_id", classId)
      .order("day_of_week"),
    loadLessons(organizationId, edition, { column: "class_id", id: classId }),
    edition === "v2"
      ? loadScheduleProfilesV2(supabase, organizationId).then(
          (profiles) => (day: ClassScheduleDay) => v2SlotsForClassDay(day, profiles)
        )
      : loadSettings(supabase, organizationId).then(
          (settings) => (day: ClassScheduleDay) =>
            slotsForDay(day, slotTimingOf(settings))
        ),
  ]);
  throwIfDbError(daysResult, "Sınıf saatleri okunamadı");

  return ((daysResult.data ?? []) as ClassScheduleDay[]).map((day) => {
    const slots = slotsOf(day);
    const rows: ScheduleRow[] = slots.map((slot) => ({
      ...slot,
      lesson: findLessonAt(lessons, day.day_of_week, slot.start),
    }));
    // Ayarlar sonradan değiştiyse bazı dersler artık ızgaraya denk gelmeyebilir;
    // yine de kaybolmasınlar.
    const placed = new Set(rows.map((row) => row.lesson?.id).filter(Boolean));
    for (const lesson of lessons) {
      if (lesson.day_of_week === day.day_of_week && !placed.has(lesson.id)) {
        rows.push(rowOf(lesson));
      }
    }
    return { day: day.day_of_week, rows: rows.sort(byStart) };
  });
}

/** Öğretmenin haftalık programı: yalnızca ders olan günler ve saatler. */
export async function loadTeacherSchedule(
  organizationId: string,
  edition: ScheduleEdition,
  teacherId: string
): Promise<DaySchedule[]> {
  const lessons = await loadLessons(organizationId, edition, {
    column: "teacher_id",
    id: teacherId,
  });

  const byDay = new Map<number, ScheduleRow[]>();
  for (const lesson of lessons) {
    const rows = byDay.get(lesson.day_of_week) ?? [];
    rows.push(rowOf(lesson));
    byDay.set(lesson.day_of_week, rows);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, rows]) => ({ day, rows: rows.sort(byStart) }));
}

export async function loadClassName(id: string): Promise<string> {
  const result = await supabase.from("classes").select("name").eq("id", id).maybeSingle();
  throwIfDbError(result, "Sınıf okunamadı");
  return result.data?.name ?? "Sınıf";
}

export async function loadTeacherName(id: string): Promise<string> {
  const result = await supabase.from("teachers").select("name").eq("id", id).maybeSingle();
  throwIfDbError(result, "Öğretmen okunamadı");
  return result.data?.name ?? "Öğretmen";
}

/** Ana sayfadaki kutularda gösterilen kayıt sayıları. */
export async function loadCounts(
  organizationId: string
): Promise<{ classes: number; teachers: number }> {
  const [classes, teachers] = await Promise.all(
    (["classes", "teachers"] as const).map((table) =>
      supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
    )
  );
  throwIfDbError(classes, "Sınıflar okunamadı");
  throwIfDbError(teachers, "Öğretmenler okunamadı");
  return { classes: classes.count ?? 0, teachers: teachers.count ?? 0 };
}
