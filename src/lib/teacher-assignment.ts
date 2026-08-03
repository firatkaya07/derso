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
  isPartial?: boolean;
}

function getCoverage(
  teacherId: string,
  teacher: Teacher,
  lessons: GeneratedLesson[],
  teacherSlots: Map<string, Set<string>>
): { covered: GeneratedLesson[]; uncovered: GeneratedLesson[] } {
  const covered: GeneratedLesson[] = [];
  const uncovered: GeneratedLesson[] = [];
  const slots = teacherSlots.get(teacherId);

  for (const lesson of lessons) {
    if (teacher.off_days?.includes(lesson.dayOfWeek)) {
      uncovered.push(lesson);
    } else if (slots?.has(slotKey(lesson.dayOfWeek, lesson.startTime))) {
      uncovered.push(lesson);
    } else {
      covered.push(lesson);
    }
  }
  return { covered, uncovered };
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

  // Scarcity-based sorting: fewer eligible teachers → higher priority
  groups.sort((a, b) => {
    const aPre = a.preAssignedTeacherId ? 1 : 0;
    const bPre = b.preAssignedTeacherId ? 1 : 0;
    if (aPre !== bPre) return bPre - aPre;

    const aEligible = (teachersBySubject.get(a.subjectId) || []).length;
    const bEligible = (teachersBySubject.get(b.subjectId) || []).length;
    if (aEligible !== bEligible) return aEligible - bEligible;

    if (a.totalHours !== b.totalHours) return b.totalHours - a.totalHours;

    const aIsPaired = a.subjectName in PAIRED_SUBJECTS;
    const bIsPaired = b.subjectName in PAIRED_SUBJECTS;
    if (aIsPaired && !bIsPaired) return -1;
    if (!aIsPaired && bIsPaired) return 1;

    return a.className.localeCompare(b.className);
  });

  const teacherLoad = new Map<string, number>();
  const teacherSlots = new Map<string, Set<string>>();
  const classAssignments = new Map<string, Map<string, string>>();

  let assigned = 0;
  let failed = 0;

  const remainderQueue: LessonGroup[] = [];

  function assignTeacherToLessons(
    teacherId: string,
    teacher: Teacher,
    targetLessons: GeneratedLesson[],
    group: LessonGroup
  ) {
    if (!classAssignments.has(group.classId))
      classAssignments.set(group.classId, new Map());
    const classAssign = classAssignments.get(group.classId)!;
    classAssign.set(group.subjectName, teacherId);

    teacherLoad.set(
      teacherId,
      (teacherLoad.get(teacherId) || 0) + targetLessons.length
    );
    if (!teacherSlots.has(teacherId))
      teacherSlots.set(teacherId, new Set());
    const tSlots = teacherSlots.get(teacherId)!;

    for (const lesson of targetLessons) {
      lesson.teacherId = teacherId;
      lesson.teacherName = teacher.name;
      tSlots.add(slotKey(lesson.dayOfWeek, lesson.startTime));
    }
  }

  function processGroup(group: LessonGroup): boolean {
    if (!classAssignments.has(group.classId))
      classAssignments.set(group.classId, new Map());
    const classAssign = classAssignments.get(group.classId)!;

    // Pre-assigned teacher: try full coverage, then partial
    if (group.preAssignedTeacherId) {
      const teacher = teacherMap.get(group.preAssignedTeacherId);
      if (teacher) {
        const { covered, uncovered } = getCoverage(
          group.preAssignedTeacherId,
          teacher,
          group.lessons,
          teacherSlots
        );

        if (uncovered.length === 0) {
          assignTeacherToLessons(
            group.preAssignedTeacherId,
            teacher,
            group.lessons,
            group
          );
          return true;
        }

        if (covered.length > 0 && !(group.subjectName in PAIRED_SUBJECTS)) {
          const reason = teacher.off_days?.some((d) =>
            uncovered.some((l) => l.dayOfWeek === d)
          )
            ? "izin günü"
            : "saat çakışması";
          warnings.push(
            `${group.className} - ${group.subjectName}: ${teacher.name} ${uncovered.length} ders ${reason} nedeniyle verilemedi, kısmi atama yapıldı.`
          );
          assignTeacherToLessons(
            group.preAssignedTeacherId,
            teacher,
            covered,
            group
          );
          remainderQueue.push({
            classId: group.classId,
            className: group.className,
            subjectId: group.subjectId,
            subjectName: group.subjectName,
            lessons: uncovered,
            days: [...new Set(uncovered.map((l) => l.dayOfWeek))],
            totalHours: uncovered.length,
            isPartial: true,
          });
          return true;
        }

        warnings.push(
          `${group.className} - ${group.subjectName}: Atanmış öğretmen (${teacher.name}) kullanılamadı, başka öğretmen aranıyor.`
        );
      }
    }

    const eligibleIds = teachersBySubject.get(group.subjectId) || [];
    if (eligibleIds.length === 0) {
      errors.push(
        `${group.className} - ${group.subjectName}: Bu dersi verebilecek öğretmen tanımlı değil.`
      );
      return false;
    }

    // Compute coverage for each eligible teacher
    const candidateCoverage = eligibleIds
      .map((tid) => {
        const teacher = teacherMap.get(tid);
        if (!teacher) return null;
        const { covered, uncovered } = getCoverage(
          tid,
          teacher,
          group.lessons,
          teacherSlots
        );
        return { tid, teacher, covered, uncovered };
      })
      .filter(
        (c): c is NonNullable<typeof c> => c !== null && c.covered.length > 0
      );

    // Apply paired subject filter
    const pairedSubjectName = PAIRED_SUBJECTS[group.subjectName];
    let filteredCandidates = candidateCoverage;
    if (pairedSubjectName) {
      const pairedTeacherId = classAssign.get(pairedSubjectName);
      if (pairedTeacherId) {
        const withoutPaired = filteredCandidates.filter(
          (c) => c.tid !== pairedTeacherId
        );
        if (withoutPaired.length > 0) {
          filteredCandidates = withoutPaired;
        } else {
          warnings.push(
            `${group.className}: ${group.subjectName} ve ${pairedSubjectName} için yeterli farklı öğretmen yok.`
          );
        }
      }
    }

    if (filteredCandidates.length === 0) {
      if (candidateCoverage.length === 0) {
        const teacherNames = eligibleIds
          .map((tid) => teacherMap.get(tid)?.name)
          .filter(Boolean)
          .join(", ");
        errors.push(
          `${group.className} - ${group.subjectName}: Uygun öğretmenler (${teacherNames}) müsait değil.`
        );
      } else {
        errors.push(
          `${group.className} - ${group.subjectName}: Eşli ders kısıtı nedeniyle uygun öğretmen bulunamadı.`
        );
      }
      return false;
    }

    // Sort: full coverage first, then by coverage count, then by workload
    filteredCandidates.sort((a, b) => {
      const aFull = a.uncovered.length === 0 ? 1 : 0;
      const bFull = b.uncovered.length === 0 ? 1 : 0;
      if (aFull !== bFull) return bFull - aFull;

      if (a.covered.length !== b.covered.length)
        return b.covered.length - a.covered.length;

      // Prefer pre-assigned teacher
      if (group.preAssignedTeacherId) {
        if (a.tid === group.preAssignedTeacherId) return -1;
        if (b.tid === group.preAssignedTeacherId) return 1;
      }

      return (teacherLoad.get(a.tid) || 0) - (teacherLoad.get(b.tid) || 0);
    });

    const best = filteredCandidates[0];

    if (best.uncovered.length === 0) {
      // Full coverage
      assignTeacherToLessons(best.tid, best.teacher, best.covered, group);
      return true;
    }

    // Partial coverage — only for non-paired subjects
    if (group.subjectName in PAIRED_SUBJECTS) {
      errors.push(
        `${group.className} - ${group.subjectName}: Uygun öğretmenler bu saatlerde başka sınıflarda dolu.`
      );
      return false;
    }

    warnings.push(
      `${group.className} - ${group.subjectName}: ${best.teacher.name} ${best.uncovered.length} ders için müsait değil, kısmi atama yapıldı.`
    );
    assignTeacherToLessons(best.tid, best.teacher, best.covered, group);

    remainderQueue.push({
      classId: group.classId,
      className: group.className,
      subjectId: group.subjectId,
      subjectName: group.subjectName,
      lessons: best.uncovered,
      days: [...new Set(best.uncovered.map((l) => l.dayOfWeek))],
      totalHours: best.uncovered.length,
      isPartial: true,
    });

    return true;
  }

  // First pass: all groups
  for (const group of groups) {
    if (processGroup(group)) {
      assigned++;
    } else {
      failed++;
    }
  }

  // Second pass: remainder groups from partial assignments
  for (const group of remainderQueue) {
    if (processGroup(group)) {
      // Don't increment assigned — already counted in first pass
    } else {
      failed++;
    }
  }

  // Third pass: repair — try swapping teacher assignments to resolve failures
  for (let repairIter = 0; repairIter < 3; repairIter++) {
    let anyRepaired = false;

    const allGroups = [...groups, ...remainderQueue];
    const failedGroupsList = allGroups.filter((g) =>
      g.lessons.some((l) => !l.teacherId)
    );
    if (failedGroupsList.length === 0) break;

    for (const failedGroup of failedGroupsList) {
      const unassigned = failedGroup.lessons.filter((l) => !l.teacherId);
      if (unassigned.length === 0) continue;

      const eligibleIds = teachersBySubject.get(failedGroup.subjectId) || [];

      for (const tid of eligibleIds) {
        const teacher = teacherMap.get(tid);
        if (!teacher) continue;

        const { covered } = getCoverage(
          tid,
          teacher,
          unassigned,
          teacherSlots
        );
        if (covered.length === 0) continue;

        // Check paired constraint
        const pairedName = PAIRED_SUBJECTS[failedGroup.subjectName];
        if (pairedName) {
          const ca = classAssignments.get(failedGroup.classId);
          if (ca?.get(pairedName) === tid) continue;
        }

        // This teacher covers some unassigned lessons but is busy at those slots.
        // Find which other group uses this teacher at the conflict slots,
        // and see if that group can use a different teacher.
        const conflictSlots = unassigned
          .filter(
            (l) =>
              !teacher.off_days?.includes(l.dayOfWeek) &&
              teacherSlots
                .get(tid)
                ?.has(slotKey(l.dayOfWeek, l.startTime))
          )
          .map((l) => slotKey(l.dayOfWeek, l.startTime));

        if (conflictSlots.length === 0) {
          // Teacher is available — just assign
          assignTeacherToLessons(tid, teacher, covered, failedGroup);
          anyRepaired = true;
          break;
        }

        // Find who occupies this teacher at conflict slots
        let canSwap = true;
        const swapTargets: {
          group: LessonGroup;
          lesson: GeneratedLesson;
          altTid: string;
          altTeacher: Teacher;
        }[] = [];

        for (const cs of conflictSlots) {
          // Find the lesson that uses this teacher at this slot
          const occupyingLesson = allGroups
            .flatMap((g) => g.lessons)
            .find(
              (l) =>
                l.teacherId === tid &&
                slotKey(l.dayOfWeek, l.startTime) === cs
            );
          if (!occupyingLesson) {
            canSwap = false;
            break;
          }

          // Find an alternative teacher for the occupying lesson's group
          const occGroup = allGroups.find(
            (g) =>
              g.classId === occupyingLesson.classId &&
              g.subjectId === occupyingLesson.subjectId
          );
          if (!occGroup) {
            canSwap = false;
            break;
          }

          const altIds = (
            teachersBySubject.get(occGroup.subjectId) || []
          ).filter((altId) => {
            if (altId === tid) return false;
            const altT = teacherMap.get(altId);
            if (!altT) return false;
            if (altT.off_days?.includes(occupyingLesson.dayOfWeek))
              return false;
            if (
              teacherSlots
                .get(altId)
                ?.has(slotKey(occupyingLesson.dayOfWeek, occupyingLesson.startTime))
            )
              return false;
            const pn = PAIRED_SUBJECTS[occGroup.subjectName];
            if (pn) {
              const ca2 = classAssignments.get(occGroup.classId);
              if (ca2?.get(pn) === altId) return false;
            }
            return true;
          });

          if (altIds.length === 0) {
            canSwap = false;
            break;
          }

          const altTeacher = teacherMap.get(altIds[0])!;
          swapTargets.push({
            group: occGroup,
            lesson: occupyingLesson,
            altTid: altIds[0],
            altTeacher,
          });
        }

        if (canSwap && swapTargets.length > 0) {
          // Perform swaps: reassign occupying lessons to alternative teachers
          for (const st of swapTargets) {
            const sk = slotKey(
              st.lesson.dayOfWeek,
              st.lesson.startTime
            );
            teacherSlots.get(tid)?.delete(sk);
            teacherLoad.set(tid, (teacherLoad.get(tid) || 1) - 1);

            st.lesson.teacherId = st.altTid;
            st.lesson.teacherName = st.altTeacher.name;
            if (!teacherSlots.has(st.altTid))
              teacherSlots.set(st.altTid, new Set());
            teacherSlots.get(st.altTid)!.add(sk);
            teacherLoad.set(
              st.altTid,
              (teacherLoad.get(st.altTid) || 0) + 1
            );
          }

          // Now assign the freed teacher to the failed group
          const reCov = getCoverage(
            tid,
            teacher,
            unassigned,
            teacherSlots
          );
          if (reCov.covered.length > 0) {
            assignTeacherToLessons(
              tid,
              teacher,
              reCov.covered,
              failedGroup
            );
            anyRepaired = true;
            break;
          }
        }
      }
    }

    if (!anyRepaired) break;
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
