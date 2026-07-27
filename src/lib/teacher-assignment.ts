import type { Teacher, Subject, TeacherSubject, ClassSubject } from "./types";
import type { GeneratedLesson } from "./scheduler";

export interface AssignmentResult {
  lessons: GeneratedLesson[];
  errors: string[];
  warnings: string[];
  stats: {
    totalGroups: number;
    assigned: number;
    failed: number;
    teacherLoads: Array<{
      teacherId: string;
      teacherName: string;
      totalHours: number;
    }>;
  };
}

const PAIRED_SUBJECTS: Record<string, string> = {
  "MATEMATİK 1": "MATEMATİK 2",
  "MATEMATİK 2": "MATEMATİK 1",
  "MAT 1": "MAT 2",
  "MAT 2": "MAT 1",
  "TÜRKÇE": "EDEBİYAT",
  "EDEBİYAT": "TÜRKÇE",
};

function slotKey(dayOfWeek: number, startTime: string): string {
  return `${dayOfWeek}:${startTime}`;
}

interface LessonGroup {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  lessons: GeneratedLesson[];
  days: number[];
  totalHours: number;
  preAssignedTeacherId?: string;
}

export function assignTeachersToSchedule(
  inputLessons: GeneratedLesson[],
  teachers: Teacher[],
  teacherSubjects: TeacherSubject[],
  subjects: Subject[],
  classSubjects?: ClassSubject[]
): AssignmentResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lessons = inputLessons.map((l) => ({ ...l }));

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  const teachersBySubject = new Map<string, string[]>();
  for (const ts of teacherSubjects) {
    const arr = teachersBySubject.get(ts.subject_id) || [];
    arr.push(ts.teacher_id);
    teachersBySubject.set(ts.subject_id, arr);
  }

  // Build pre-assignment map from class_subjects
  const preAssignmentMap = new Map<string, string>();
  if (classSubjects) {
    for (const cs of classSubjects) {
      if (cs.teacher_id) {
        preAssignmentMap.set(`${cs.class_id}:${cs.subject_id}`, cs.teacher_id);
      }
    }
  }

  const groupMap = new Map<string, LessonGroup>();
  for (const lesson of lessons) {
    const key = `${lesson.classId}:${lesson.subjectId}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        classId: lesson.classId,
        className: lesson.className,
        subjectId: lesson.subjectId,
        subjectName: lesson.subjectName,
        lessons: [],
        days: [],
        totalHours: 0,
        preAssignedTeacherId: preAssignmentMap.get(key) || undefined,
      });
    }
    const group = groupMap.get(key)!;
    group.lessons.push(lesson);
    group.totalHours++;
    if (!group.days.includes(lesson.dayOfWeek)) {
      group.days.push(lesson.dayOfWeek);
    }
  }

  const groups = [...groupMap.values()];
  // Pre-assigned groups first, then by class name, then paired subjects first
  groups.sort((a, b) => {
    const aPre = a.preAssignedTeacherId ? 1 : 0;
    const bPre = b.preAssignedTeacherId ? 1 : 0;
    if (aPre !== bPre) return bPre - aPre;

    if (a.className !== b.className)
      return a.className.localeCompare(b.className);
    const aIsPaired = a.subjectName in PAIRED_SUBJECTS;
    const bIsPaired = b.subjectName in PAIRED_SUBJECTS;
    if (aIsPaired && !bIsPaired) return -1;
    if (!aIsPaired && bIsPaired) return 1;
    return a.subjectName.localeCompare(b.subjectName);
  });

  const teacherLoad = new Map<string, number>();
  const teacherSlots = new Map<string, Set<string>>();
  const classAssignments = new Map<string, Map<string, string>>();

  let assigned = 0;
  let failed = 0;

  for (const group of groups) {
    if (!classAssignments.has(group.classId)) {
      classAssignments.set(group.classId, new Map());
    }
    const classAssign = classAssignments.get(group.classId)!;

    // If pre-assigned, try that teacher first
    if (group.preAssignedTeacherId) {
      const teacher = teacherMap.get(group.preAssignedTeacherId);
      if (teacher) {
        const offDayConflict =
          teacher.off_days &&
          teacher.off_days.length > 0 &&
          group.days.some((d) => teacher.off_days.includes(d));

        const slots = teacherSlots.get(group.preAssignedTeacherId);
        const timeConflict = slots
          ? group.lessons.some((l) =>
              slots.has(slotKey(l.dayOfWeek, l.startTime))
            )
          : false;

        if (!offDayConflict && !timeConflict) {
          classAssign.set(group.subjectName, group.preAssignedTeacherId);
          teacherLoad.set(
            group.preAssignedTeacherId,
            (teacherLoad.get(group.preAssignedTeacherId) || 0) +
              group.totalHours
          );
          if (!teacherSlots.has(group.preAssignedTeacherId)) {
            teacherSlots.set(group.preAssignedTeacherId, new Set());
          }
          const tSlots = teacherSlots.get(group.preAssignedTeacherId)!;
          for (const lesson of group.lessons) {
            lesson.teacherId = group.preAssignedTeacherId;
            lesson.teacherName = teacher.name;
            tSlots.add(slotKey(lesson.dayOfWeek, lesson.startTime));
          }
          assigned++;
          continue;
        } else {
          warnings.push(
            `${group.className} - ${group.subjectName}: Atanmış öğretmen (${teacher.name}) ${offDayConflict ? "izin günü çakışması" : "saat çakışması"} nedeniyle kullanılamadı, başka öğretmen aranıyor.`
          );
        }
      }
    }

    const eligibleIds = teachersBySubject.get(group.subjectId) || [];
    if (eligibleIds.length === 0) {
      errors.push(
        `${group.className} - ${group.subjectName}: Bu dersi verebilecek öğretmen tanımlı değil.`
      );
      failed++;
      continue;
    }

    let candidates = eligibleIds.filter((tid) => {
      const teacher = teacherMap.get(tid);
      if (!teacher) return false;
      if (teacher.off_days && teacher.off_days.length > 0) {
        for (const day of group.days) {
          if (teacher.off_days.includes(day)) return false;
        }
      }
      return true;
    });

    if (candidates.length === 0) {
      const offDayTeachers = eligibleIds
        .map((tid) => teacherMap.get(tid)?.name)
        .filter(Boolean)
        .join(", ");
      errors.push(
        `${group.className} - ${group.subjectName}: Uygun öğretmenlerin (${offDayTeachers}) tümü dersin olduğu günlerde izinli.`
      );
      failed++;
      continue;
    }

    const pairedSubjectName = PAIRED_SUBJECTS[group.subjectName];
    if (pairedSubjectName) {
      const pairedTeacherId = classAssign.get(pairedSubjectName);
      if (pairedTeacherId) {
        const filtered = candidates.filter((id) => id !== pairedTeacherId);
        if (filtered.length > 0) {
          candidates = filtered;
        } else {
          warnings.push(
            `${group.className}: ${group.subjectName} ve ${pairedSubjectName} için yeterli farklı öğretmen yok, aynı öğretmen atandı.`
          );
        }
      }
    }

    candidates = candidates.filter((tid) => {
      const slots = teacherSlots.get(tid);
      if (!slots) return true;
      for (const lesson of group.lessons) {
        if (slots.has(slotKey(lesson.dayOfWeek, lesson.startTime))) {
          return false;
        }
      }
      return true;
    });

    if (candidates.length === 0) {
      errors.push(
        `${group.className} - ${group.subjectName}: Uygun öğretmenler bu saatlerde başka sınıflarda dolu.`
      );
      failed++;
      continue;
    }

    // Prefer pre-assigned teacher if in candidates
    if (
      group.preAssignedTeacherId &&
      candidates.includes(group.preAssignedTeacherId)
    ) {
      candidates = [
        group.preAssignedTeacherId,
        ...candidates.filter((c) => c !== group.preAssignedTeacherId),
      ];
    } else {
      candidates.sort(
        (a, b) => (teacherLoad.get(a) || 0) - (teacherLoad.get(b) || 0)
      );
    }

    const teacherId = candidates[0];
    const teacher = teacherMap.get(teacherId)!;

    classAssign.set(group.subjectName, teacherId);
    teacherLoad.set(
      teacherId,
      (teacherLoad.get(teacherId) || 0) + group.totalHours
    );

    if (!teacherSlots.has(teacherId)) {
      teacherSlots.set(teacherId, new Set());
    }
    const slots = teacherSlots.get(teacherId)!;

    for (const lesson of group.lessons) {
      lesson.teacherId = teacherId;
      lesson.teacherName = teacher.name;
      slots.add(slotKey(lesson.dayOfWeek, lesson.startTime));
    }

    assigned++;
  }

  const teacherLoads = [...teacherLoad.entries()]
    .map(([id, hours]) => ({
      teacherId: id,
      teacherName: teacherMap.get(id)?.name || "?",
      totalHours: hours,
    }))
    .filter((tl) => tl.totalHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours);

  return {
    lessons,
    errors,
    warnings,
    stats: {
      totalGroups: groups.length,
      assigned,
      failed,
      teacherLoads,
    },
  };
}
