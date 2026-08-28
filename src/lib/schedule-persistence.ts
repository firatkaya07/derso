import type { SupabaseClient } from "@supabase/supabase-js";
import { throwIfDbError } from "./db-error";
import type { GeneratedLesson } from "./scheduler";

const BATCH_SIZE = 500;

function chunk<T>(items: T[], size = BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export interface SaveScheduleResult {
  savedLessons: number;
  /** Öğretmeni atanamadığı için kaydedilemeyen ders saati sayısı. */
  skippedLessons: number;
  updatedAssignments: number;
}

/**
 * Üretilen programı kaydeder: kurumun mevcut dersleri silinir, yeni ders
 * saatleri yazılır ve otomatik atanan öğretmenler sınıf müfredatına
 * (class_subjects.teacher_id) işlenir.
 *
 * Kurum genelinde silme, hiç yerleşmeyen sınıfların eski saatlerinin
 * kalmasını engeller. Silme yalnızca kayıt anında yapılır; arama sırasında
 * canlı program korunur.
 */
export async function saveGeneratedSchedule(
  supabase: SupabaseClient,
  lessons: GeneratedLesson[],
  organizationId: string
): Promise<SaveScheduleResult> {
  return saveGeneratedScheduleToTable(supabase, lessons, organizationId, "lessons");
}

/** V2 program kaydı — lessons_v2 tablosuna yazar. */
export async function saveGeneratedScheduleV2(
  supabase: SupabaseClient,
  lessons: GeneratedLesson[],
  organizationId: string
): Promise<SaveScheduleResult> {
  return saveGeneratedScheduleToTable(
    supabase,
    lessons,
    organizationId,
    "lessons_v2"
  );
}

async function saveGeneratedScheduleToTable(
  supabase: SupabaseClient,
  lessons: GeneratedLesson[],
  organizationId: string,
  table: "lessons" | "lessons_v2"
): Promise<SaveScheduleResult> {
  throwIfDbError(
    await supabase
      .from(table)
      .delete()
      .eq("organization_id", organizationId),
    "Mevcut program temizlenemedi"
  );

  const placeable = lessons.filter((lesson) => lesson.teacherId);
  const classIds = [...new Set(placeable.map((lesson) => lesson.classId))];

  if (placeable.length === 0) {
    return {
      savedLessons: 0,
      skippedLessons: lessons.length,
      updatedAssignments: 0,
    };
  }

  const rows = placeable.map((lesson) => ({
    organization_id: organizationId,
    class_id: lesson.classId,
    subject_id: lesson.subjectId,
    teacher_id: lesson.teacherId,
    day_of_week: lesson.dayOfWeek,
    start_time: lesson.startTime,
    end_time: lesson.endTime,
  }));

  for (const batch of chunk(rows)) {
    throwIfDbError(
      await supabase.from(table).insert(batch),
      "Ders programı kaydedilemedi"
    );
  }

  const updatedAssignments = await syncClassSubjectTeachers(
    supabase,
    classIds,
    placeable,
    organizationId
  );

  return {
    savedLessons: rows.length,
    skippedLessons: lessons.length - placeable.length,
    updatedAssignments,
  };
}

async function syncClassSubjectTeachers(
  supabase: SupabaseClient,
  classIds: string[],
  lessons: GeneratedLesson[],
  organizationId: string
): Promise<number> {
  const assignments = new Map<string, string>();
  for (const lesson of lessons) {
    assignments.set(`${lesson.classId}:${lesson.subjectId}`, lesson.teacherId);
  }
  if (assignments.size === 0) return 0;

  const existing = await supabase
    .from("class_subjects")
    .select("class_id, subject_id, weekly_hours, teacher_id")
    .eq("organization_id", organizationId)
    .in("class_id", classIds);
  throwIfDbError(existing, "Sınıf dersleri okunamadı");

  // weekly_hours değeri upsert yükünde taşınmak zorunda: sütun NOT NULL olduğu
  // için eksik bırakılırsa satır varsayılan 0'a düşerdi.
  const rows = (existing.data ?? []).flatMap((row) => {
    const teacherId = assignments.get(`${row.class_id}:${row.subject_id}`);
    if (!teacherId || teacherId === row.teacher_id) return [];
    return [
      {
        organization_id: organizationId,
        class_id: row.class_id,
        subject_id: row.subject_id,
        weekly_hours: row.weekly_hours,
        teacher_id: teacherId,
      },
    ];
  });

  for (const batch of chunk(rows)) {
    throwIfDbError(
      await supabase
        .from("class_subjects")
        .upsert(batch, { onConflict: "class_id,subject_id" }),
      "Öğretmen atamaları kaydedilemedi"
    );
  }

  return rows.length;
}
