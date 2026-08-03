import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelFile, type ParsedWorkbook } from "@/lib/excel-parser";
import { buildTemplateWorkbook } from "@/lib/excel-template";
import {
  autoSchedule,
  DEFAULT_RULES,
  type ClassSubjectInput,
} from "@/lib/scheduler";
import type {
  ClassGroup,
  ClassScheduleDay,
  ClassSubject,
  Subject,
  Teacher,
  TeacherSubject,
} from "@/lib/types";

/**
 * Şablondan okunan veriyi, içe aktarımın veritabanına yazdığı biçime çevirir.
 * Böylece test, Supabase'e gitmeden aktarım sonrası durumu taklit eder.
 */
function toDatabaseShape(parsed: ParsedWorkbook) {
  const teacherIds = new Map(
    parsed.teachers.map((teacher, index) => [teacher.name, `t${index}`])
  );
  const subjectIds = new Map(
    parsed.subjects.map((subject, index) => [subject.name, `s${index}`])
  );
  const classIds = new Map(
    parsed.classes.map((cls, index) => [cls.name, `c${index}`])
  );

  const teachers: Teacher[] = parsed.teachers.map((teacher) => ({
    id: teacherIds.get(teacher.name)!,
    name: teacher.name,
    phone: teacher.phone,
    email: teacher.email,
    off_days: teacher.offDays,
    specialization: teacher.specialization,
    created_at: "2026-01-01T00:00:00Z",
  }));

  const subjects: Subject[] = parsed.subjects.map((subject) => ({
    id: subjectIds.get(subject.name)!,
    name: subject.name,
    short_name: subject.shortName,
    color: subject.color,
    level: subject.levels,
    subgroups: subject.subgroups,
    created_at: "2026-01-01T00:00:00Z",
  }));

  const classes: ClassGroup[] = parsed.classes.map((cls) => ({
    id: classIds.get(cls.name)!,
    name: cls.name,
    description: cls.description,
    level: cls.level,
    subgroup: cls.subgroup,
    created_at: "2026-01-01T00:00:00Z",
  }));

  const scheduleDays: ClassScheduleDay[] = parsed.scheduleDays.map(
    (day, index) => ({
      id: `d${index}`,
      class_id: classIds.get(day.className)!,
      day_of_week: day.dayOfWeek,
      start_time: day.startTime,
      end_time: day.endTime,
    })
  );

  const classSubjects: ClassSubject[] = parsed.classSubjects.map(
    (cs, index) => ({
      id: `cs${index}`,
      class_id: classIds.get(cs.className)!,
      subject_id: subjectIds.get(cs.subjectName)!,
      weekly_hours: cs.weeklyHours,
      teacher_id: cs.teacherName ? teacherIds.get(cs.teacherName)! : null,
      created_at: "2026-01-01T00:00:00Z",
    })
  );

  const teacherSubjects: TeacherSubject[] = parsed.teachers.flatMap((teacher) =>
    teacher.subjectNames.map((subjectName, index) => ({
      id: `ts-${teacher.name}-${index}`,
      teacher_id: teacherIds.get(teacher.name)!,
      subject_id: subjectIds.get(subjectName)!,
      created_at: "2026-01-01T00:00:00Z",
    }))
  );

  return {
    teachers,
    subjects,
    classes,
    scheduleDays,
    classSubjects,
    teacherSubjects,
  };
}

describe("şablondan programa uçtan uca", () => {
  it("şablondaki verilerle çakışmasız ve eksiksiz bir program üretir", () => {
    const buffer = XLSX.write(buildTemplateWorkbook(), {
      type: "array",
      bookType: "xlsx",
    }) as ArrayBuffer;

    const parsed = parseExcelFile(buffer);
    expect(parsed.errors).toEqual([]);

    const db = toDatabaseShape(parsed);
    const inputs: ClassSubjectInput[] = db.classSubjects.map((cs) => ({
      classId: cs.class_id,
      subjectId: cs.subject_id,
      subjectName: db.subjects.find((s) => s.id === cs.subject_id)!.name,
      weeklyHours: cs.weekly_hours,
      teacherId: cs.teacher_id,
    }));

    const schedule = autoSchedule(
      db.classes,
      db.scheduleDays,
      db.subjects,
      inputs,
      DEFAULT_RULES,
      db.teacherSubjects,
      db.teachers,
      1
    );

    expect(schedule.errors).toEqual([]);
    expect(schedule.unplaced).toEqual([]);

    const expectedHours = inputs.reduce(
      (sum, input) => sum + input.weeklyHours,
      0
    );
    expect(schedule.lessons).toHaveLength(expectedHours);
    expect(schedule.lessons.every((lesson) => Boolean(lesson.teacherId))).toBe(
      true
    );

    // Veritabanındaki iki tekillik kısıtının ihlal edilmediğini doğrula.
    const classSlots = new Set<string>();
    const teacherSlots = new Set<string>();
    for (const lesson of schedule.lessons) {
      const slot = `${lesson.dayOfWeek}:${lesson.startTime}`;
      const classKey = `${lesson.classId}:${slot}`;
      const teacherKey = `${lesson.teacherId}:${slot}`;
      expect(classSlots.has(classKey)).toBe(false);
      expect(teacherSlots.has(teacherKey)).toBe(false);
      classSlots.add(classKey);
      teacherSlots.add(teacherKey);
    }

    // Bir sınıfın bir dersini tek öğretmen vermeli.
    const teachersByCourse = new Map<string, Set<string>>();
    for (const lesson of schedule.lessons) {
      const key = `${lesson.classId}:${lesson.subjectId}`;
      const set = teachersByCourse.get(key) ?? new Set<string>();
      set.add(lesson.teacherId);
      teachersByCourse.set(key, set);
    }
    for (const [, set] of teachersByCourse) expect(set.size).toBe(1);

    // Öğretmenler izin günlerinde ders almamalı.
    for (const lesson of schedule.lessons) {
      const teacher = db.teachers.find((t) => t.id === lesson.teacherId)!;
      expect(teacher.off_days).not.toContain(lesson.dayOfWeek);
    }

    // Dersler yalnızca sınıfın ders gördüğü gün ve saatlere yerleşmeli.
    for (const lesson of schedule.lessons) {
      const day = db.scheduleDays.find(
        (d) => d.class_id === lesson.classId && d.day_of_week === lesson.dayOfWeek
      );
      expect(day).toBeDefined();
      expect(lesson.startTime >= day!.start_time).toBe(true);
      expect(lesson.endTime <= day!.end_time).toBe(true);
    }
  });
});
