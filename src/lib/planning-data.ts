import type { SupabaseClient } from "@supabase/supabase-js";
import { throwIfDbError } from "./db-error";
import type {
  ClassGroup,
  ClassScheduleDay,
  ClassSubject,
  Subject,
  Teacher,
  TeacherSubject,
} from "./types";

export interface PlanningData {
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassGroup[];
  scheduleDays: ClassScheduleDay[];
  classSubjects: ClassSubject[];
  teacherSubjects: TeacherSubject[];
}

/**
 * Program üretimi için gereken tüm veriyi tek seferde okur.
 *
 * Sonucu doğrudan döndürür (React state'e yazmaz); çağıran taraf böylece
 * okuduğu veriyi aynı fonksiyon içinde güvenle kullanabilir. Daha önce bu veri
 * state üzerinden okunduğu için, yenileme çağrısının hemen ardından çalışan
 * kod bir render eskisi veriyle işlem yapıyordu.
 *
 * organizationId zorunludur: RLS birden fazla üyeliği gösterebilir; aktif
 * kurumun verisi açıkça süzülür.
 */
export async function loadPlanningData(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PlanningData> {
  const [
    teachers,
    subjects,
    classes,
    scheduleDays,
    classSubjects,
    teacherSubjects,
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("subjects")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("classes")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("class_schedule_days")
      .select("*")
      .eq("organization_id", organizationId),
    supabase
      .from("class_subjects")
      .select("*, subject:subjects(*), teacher:teachers(*)")
      .eq("organization_id", organizationId),
    supabase
      .from("teacher_subjects")
      .select("*, subject:subjects(*), teacher:teachers(*)")
      .eq("organization_id", organizationId),
  ]);

  throwIfDbError(teachers, "Öğretmenler okunamadı");
  throwIfDbError(subjects, "Dersler okunamadı");
  throwIfDbError(classes, "Sınıflar okunamadı");
  throwIfDbError(scheduleDays, "Sınıf saatleri okunamadı");
  throwIfDbError(classSubjects, "Sınıf dersleri okunamadı");
  throwIfDbError(teacherSubjects, "Öğretmen dersleri okunamadı");

  return {
    teachers: teachers.data ?? [],
    subjects: subjects.data ?? [],
    classes: classes.data ?? [],
    scheduleDays: scheduleDays.data ?? [],
    classSubjects: classSubjects.data ?? [],
    teacherSubjects: teacherSubjects.data ?? [],
  };
}
