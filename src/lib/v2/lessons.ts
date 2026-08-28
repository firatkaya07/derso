import type { SupabaseClient } from "@supabase/supabase-js";
import { throwIfDbError } from "@/lib/db-error";
import type { Lesson } from "@/lib/types";

const LESSON_SELECT =
  "id, organization_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, created_at, subject:subjects(*), teacher:teachers(*)";

export async function loadLessonsV2(
  supabase: SupabaseClient,
  organizationId: string,
  filters?: { classId?: string; teacherId?: string }
): Promise<Lesson[]> {
  let query = supabase
    .from("lessons_v2")
    .select(LESSON_SELECT)
    .eq("organization_id", organizationId);

  if (filters?.classId) query = query.eq("class_id", filters.classId);
  if (filters?.teacherId) query = query.eq("teacher_id", filters.teacherId);

  const { data, error } = await query;
  throwIfDbError({ error }, "V2 ders programı yüklenemedi");
  return (data ?? []) as unknown as Lesson[];
}

export async function upsertLessonV2(
  supabase: SupabaseClient,
  organizationId: string,
  lesson: {
    class_id: string;
    subject_id: string;
    teacher_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }
): Promise<Lesson> {
  const { data, error } = await supabase
    .from("lessons_v2")
    .upsert(
      { ...lesson, organization_id: organizationId },
      { onConflict: "class_id,day_of_week,start_time" }
    )
    .select(LESSON_SELECT)
    .single();
  throwIfDbError({ error }, "V2 ders kaydedilemedi");
  return data as unknown as Lesson;
}

export async function deleteLessonV2(
  supabase: SupabaseClient,
  lessonId: string
): Promise<void> {
  throwIfDbError(
    await supabase.from("lessons_v2").delete().eq("id", lessonId),
    "V2 ders silinemedi"
  );
}

export async function clearLessonsV2(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  throwIfDbError(
    await supabase.from("lessons_v2").delete().eq("organization_id", organizationId),
    "V2 program temizlenemedi"
  );
}

export async function insertLessonsV2(
  supabase: SupabaseClient,
  organizationId: string,
  rows: Array<{
    class_id: string;
    subject_id: string;
    teacher_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>
): Promise<number> {
  if (rows.length === 0) return 0;
  const payload = rows.map((r) => ({ ...r, organization_id: organizationId }));
  throwIfDbError(
    await supabase.from("lessons_v2").insert(payload),
    "V2 dersleri yazılamadı"
  );
  return payload.length;
}
