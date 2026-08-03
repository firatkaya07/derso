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
 */
export async function loadPlanningData(
  supabase: SupabaseClient
): Promise<PlanningData> {
  const [
    teachers,
    subjects,
    classes,
    scheduleDays,
    classSubjects,
    teacherSubjects,
  ] = await Promise.all([
    supabase.from("teachers").select("*").order("name"),
    supabase.from("subjects").select("*").order("name"),
    supabase.from("classes").select("*").order("name"),
    supabase.from("class_schedule_days").select("*"),
    supabase
      .from("class_subjects")
      .select("*, subject:subjects(*), teacher:teachers(*)"),
    supabase
      .from("teacher_subjects")
      .select("*, subject:subjects(*), teacher:teachers(*)"),
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
