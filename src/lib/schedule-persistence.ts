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
 * Üretilen programı kaydeder: ilgili sınıfların mevcut dersleri silinir, yeni
 * ders saatleri yazılır ve otomatik atanan öğretmenler sınıf müfredatına
 * (class_subjects.teacher_id) işlenir.
 *
 * Son adım önemlidir: aksi halde program elle düzenlenmek üzere açıldığında
 * derslerin öğretmeni "Atanmamış" görünüyordu.
 */
export async function saveGeneratedSchedule(
  supabase: SupabaseClient,
  lessons: GeneratedLesson[]
): Promise<SaveScheduleResult> {
  const classIds = [...new Set(lessons.map((lesson) => lesson.classId))];
  if (classIds.length === 0) {
    return { savedLessons: 0, skippedLessons: 0, updatedAssignments: 0 };
  }

  for (const batch of chunk(classIds, 200)) {
    throwIfDbError(
      await supabase.from("lessons").delete().in("class_id", batch),
      "Mevcut program temizlenemedi"
    );
  }

  const placeable = lessons.filter((lesson) => lesson.teacherId);
  const rows = placeable.map((lesson) => ({
    class_id: lesson.classId,
    subject_id: lesson.subjectId,
    teacher_id: lesson.teacherId,
    day_of_week: lesson.dayOfWeek,
    start_time: lesson.startTime,
    end_time: lesson.endTime,
  }));

  for (const batch of chunk(rows)) {
    throwIfDbError(
      await supabase.from("lessons").insert(batch),
      "Ders programı kaydedilemedi"
    );
  }

  const updatedAssignments = await syncClassSubjectTeachers(
    supabase,
    classIds,
    placeable
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
  lessons: GeneratedLesson[]
): Promise<number> {
  const assignments = new Map<string, string>();
  for (const lesson of lessons) {
    assignments.set(`${lesson.classId}:${lesson.subjectId}`, lesson.teacherId);
  }
  if (assignments.size === 0) return 0;

  const existing = await supabase
    .from("class_subjects")
    .select("class_id, subject_id, weekly_hours, teacher_id")
    .in("class_id", classIds);
  throwIfDbError(existing, "Sınıf dersleri okunamadı");

  // weekly_hours değeri upsert yükünde taşınmak zorunda: sütun NOT NULL olduğu
  // için eksik bırakılırsa satır varsayılan 0'a düşerdi.
  const rows = (existing.data ?? []).flatMap((row) => {
    const teacherId = assignments.get(`${row.class_id}:${row.subject_id}`);
    if (!teacherId || teacherId === row.teacher_id) return [];
    return [
      {
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
