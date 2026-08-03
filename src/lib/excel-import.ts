import type { SupabaseClient } from "@supabase/supabase-js";
import { throwIfDbError } from "./db-error";
import { normalizeKey } from "./excel-template";
import type { ParsedWorkbook } from "./excel-parser";

/** PostgREST tek istekte rahatça işleyebilsin diye yazma işlemleri parçalanır. */
const BATCH_SIZE = 500;

function chunk<T>(items: T[], size = BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

interface NamedRow {
  id: string;
  name: string;
}

function lookupByName(rows: NamedRow[]): Map<string, string> {
  return new Map(rows.map((row) => [normalizeKey(row.name), row.id]));
}

/**
 * Şablondan okunan veriyi veritabanına aktarır.
 *
 * Tüm yazmalar toplu (batch) yapılır; önceki sürümde her satır için ayrı istek
 * atıldığından birkaç yüz satırlık bir dosya dakikalar sürüyordu.
 *
 * Eşleştirme ada göre ve büyük/küçük harf duyarsızdır: aynı isimli kayıt varsa
 * güncellenir, yoksa oluşturulur. Böylece aynı dosya birden çok kez aktarılsa
 * da kopya kayıt oluşmaz.
 */
export async function importWorkbook(
  supabase: SupabaseClient,
  parsed: ParsedWorkbook,
  organizationId: string
): Promise<string[]> {
  const log: string[] = [];

  const [existingTeachers, existingSubjects, existingClasses] =
    await Promise.all([
      supabase.from("teachers").select("id, name"),
      supabase.from("subjects").select("id, name"),
      supabase.from("classes").select("id, name"),
    ]);
  throwIfDbError(existingTeachers, "Mevcut öğretmenler okunamadı");
  throwIfDbError(existingSubjects, "Mevcut dersler okunamadı");
  throwIfDbError(existingClasses, "Mevcut sınıflar okunamadı");

  const teacherIds = lookupByName(existingTeachers.data ?? []);
  const subjectIds = lookupByName(existingSubjects.data ?? []);
  const classIds = lookupByName(existingClasses.data ?? []);

  // --- Dersler --------------------------------------------------------------
  const subjectInserts = parsed.subjects
    .filter((subject) => !subjectIds.has(normalizeKey(subject.name)))
    .map((subject) => ({
      organization_id: organizationId,
      name: subject.name,
      short_name: subject.shortName,
      color: subject.color,
      level: subject.levels,
      subgroups: subject.subgroups,
    }));

  const subjectUpdates = parsed.subjects
    .filter((subject) => subjectIds.has(normalizeKey(subject.name)))
    .map((subject) => ({
      id: subjectIds.get(normalizeKey(subject.name))!,
      name: subject.name,
      short_name: subject.shortName,
      color: subject.color,
      level: subject.levels,
      subgroups: subject.subgroups,
    }));

  for (const batch of chunk(subjectInserts)) {
    const result = await supabase.from("subjects").insert(batch).select("id, name");
    throwIfDbError(result, "Dersler eklenemedi");
    for (const row of result.data ?? []) {
      subjectIds.set(normalizeKey(row.name), row.id);
    }
  }
  for (const batch of chunk(subjectUpdates)) {
    throwIfDbError(
      await supabase.from("subjects").upsert(batch),
      "Dersler güncellenemedi"
    );
  }
  log.push(
    `Dersler: ${subjectInserts.length} eklendi, ${subjectUpdates.length} güncellendi.`
  );

  // --- Öğretmenler ----------------------------------------------------------
  const teacherInserts = parsed.teachers
    .filter((teacher) => !teacherIds.has(normalizeKey(teacher.name)))
    .map((teacher) => ({
      organization_id: organizationId,
      name: teacher.name,
      specialization: teacher.specialization,
      phone: teacher.phone,
      email: teacher.email,
      off_days: teacher.offDays,
    }));

  const teacherUpdates = parsed.teachers
    .filter((teacher) => teacherIds.has(normalizeKey(teacher.name)))
    .map((teacher) => ({
      id: teacherIds.get(normalizeKey(teacher.name))!,
      name: teacher.name,
      specialization: teacher.specialization,
      phone: teacher.phone,
      email: teacher.email,
      off_days: teacher.offDays,
    }));

  for (const batch of chunk(teacherInserts)) {
    const result = await supabase.from("teachers").insert(batch).select("id, name");
    throwIfDbError(result, "Öğretmenler eklenemedi");
    for (const row of result.data ?? []) {
      teacherIds.set(normalizeKey(row.name), row.id);
    }
  }
  for (const batch of chunk(teacherUpdates)) {
    throwIfDbError(
      await supabase.from("teachers").upsert(batch),
      "Öğretmenler güncellenemedi"
    );
  }
  log.push(
    `Öğretmenler: ${teacherInserts.length} eklendi, ${teacherUpdates.length} güncellendi.`
  );

  // --- Sınıflar -------------------------------------------------------------
  const classInserts = parsed.classes
    .filter((cls) => !classIds.has(normalizeKey(cls.name)))
    .map((cls) => ({
      organization_id: organizationId,
      name: cls.name,
      level: cls.level,
      subgroup: cls.subgroup,
      description: cls.description,
    }));

  const classUpdates = parsed.classes
    .filter((cls) => classIds.has(normalizeKey(cls.name)))
    .map((cls) => ({
      id: classIds.get(normalizeKey(cls.name))!,
      name: cls.name,
      level: cls.level,
      subgroup: cls.subgroup,
      description: cls.description,
    }));

  for (const batch of chunk(classInserts)) {
    const result = await supabase.from("classes").insert(batch).select("id, name");
    throwIfDbError(result, "Sınıflar eklenemedi");
    for (const row of result.data ?? []) {
      classIds.set(normalizeKey(row.name), row.id);
    }
  }
  for (const batch of chunk(classUpdates)) {
    throwIfDbError(
      await supabase.from("classes").upsert(batch),
      "Sınıflar güncellenemedi"
    );
  }
  log.push(
    `Sınıflar: ${classInserts.length} eklendi, ${classUpdates.length} güncellendi.`
  );

  // --- Öğretmen-ders eşleşmeleri -------------------------------------------
  // Dosyadaki liste yetkili kabul edilir: aktarılan öğretmenlerin mevcut
  // eşleşmeleri silinip yeniden yazılır, dosyada olmayan öğretmenlere
  // dokunulmaz.
  const importedTeacherIds = parsed.teachers
    .map((teacher) => teacherIds.get(normalizeKey(teacher.name)))
    .filter((id): id is string => Boolean(id));

  if (importedTeacherIds.length > 0) {
    for (const batch of chunk(importedTeacherIds, 200)) {
      throwIfDbError(
        await supabase.from("teacher_subjects").delete().in("teacher_id", batch),
        "Öğretmen dersleri temizlenemedi"
      );
    }

    const teacherSubjectRows = parsed.teachers.flatMap((teacher) => {
      const teacherId = teacherIds.get(normalizeKey(teacher.name));
      if (!teacherId) return [];
      return teacher.subjectNames.flatMap((subjectName) => {
        const subjectId = subjectIds.get(normalizeKey(subjectName));
        return subjectId
          ? [
              {
                organization_id: organizationId,
                teacher_id: teacherId,
                subject_id: subjectId,
              },
            ]
          : [];
      });
    });

    for (const batch of chunk(teacherSubjectRows)) {
      throwIfDbError(
        await supabase.from("teacher_subjects").insert(batch),
        "Öğretmen dersleri kaydedilemedi"
      );
    }
    log.push(`Öğretmen-ders eşleşmesi: ${teacherSubjectRows.length} kayıt.`);
  }

  // --- Sınıf ders günleri ---------------------------------------------------
  const importedClassIds = parsed.classes
    .map((cls) => classIds.get(normalizeKey(cls.name)))
    .filter((id): id is string => Boolean(id));

  if (importedClassIds.length > 0) {
    for (const batch of chunk(importedClassIds, 200)) {
      throwIfDbError(
        await supabase
          .from("class_schedule_days")
          .delete()
          .in("class_id", batch),
        "Sınıf saatleri temizlenemedi"
      );
    }

    const scheduleRows = parsed.scheduleDays.flatMap((day) => {
      const classId = classIds.get(normalizeKey(day.className));
      if (!classId) return [];
      return [
        {
          organization_id: organizationId,
          class_id: classId,
          day_of_week: day.dayOfWeek,
          start_time: day.startTime,
          end_time: day.endTime,
        },
      ];
    });

    for (const batch of chunk(scheduleRows)) {
      throwIfDbError(
        await supabase.from("class_schedule_days").insert(batch),
        "Sınıf saatleri kaydedilemedi"
      );
    }
    log.push(`Sınıf ders günleri: ${scheduleRows.length} kayıt.`);
  }

  // --- Sınıf müfredatı ------------------------------------------------------
  const classSubjectRows = parsed.classSubjects.flatMap((cs) => {
    const classId = classIds.get(normalizeKey(cs.className));
    const subjectId = subjectIds.get(normalizeKey(cs.subjectName));
    if (!classId || !subjectId) return [];
    const teacherId = cs.teacherName
      ? (teacherIds.get(normalizeKey(cs.teacherName)) ?? null)
      : null;
    return [
      {
        organization_id: organizationId,
        class_id: classId,
        subject_id: subjectId,
        weekly_hours: cs.weeklyHours,
        teacher_id: teacherId,
      },
    ];
  });

  for (const batch of chunk(classSubjectRows)) {
    throwIfDbError(
      await supabase
        .from("class_subjects")
        .upsert(batch, { onConflict: "class_id,subject_id" }),
      "Sınıf dersleri kaydedilemedi"
    );
  }
  log.push(`Ders dağılımı: ${classSubjectRows.length} kayıt.`);

  return log;
}
