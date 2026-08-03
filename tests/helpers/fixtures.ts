import type {
  ClassGroup,
  ClassScheduleDay,
  ClassSubject,
  Subject,
  Teacher,
  TeacherSubject,
} from "@/lib/types";

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

export function makeTeacher(
  name: string,
  options: { offDays?: number[]; id?: string } = {}
): Teacher {
  return {
    id: options.id ?? nextId("teacher"),
    name,
    phone: null,
    email: null,
    off_days: options.offDays ?? [],
    specialization: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

export function makeSubject(name: string, id?: string): Subject {
  return {
    id: id ?? nextId("subject"),
    name,
    short_name: name.slice(0, 3).toUpperCase(),
    color: "#3B82F6",
    level: null,
    subgroups: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

export function makeClass(name: string, id?: string): ClassGroup {
  return {
    id: id ?? nextId("class"),
    name,
    description: null,
    level: null,
    subgroup: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

export function makeScheduleDay(
  classId: string,
  dayOfWeek: number,
  startTime = "16:40",
  endTime = "19:50"
): ClassScheduleDay {
  return {
    id: nextId("day"),
    class_id: classId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  };
}

export function makeTeacherSubject(
  teacherId: string,
  subjectId: string
): TeacherSubject {
  return {
    id: nextId("ts"),
    teacher_id: teacherId,
    subject_id: subjectId,
    created_at: "2026-01-01T00:00:00Z",
  };
}

export function makeClassSubject(
  classId: string,
  subjectId: string,
  weeklyHours: number,
  teacherId: string | null = null
): ClassSubject {
  return {
    id: nextId("cs"),
    class_id: classId,
    subject_id: subjectId,
    weekly_hours: weeklyHours,
    teacher_id: teacherId,
    created_at: "2026-01-01T00:00:00Z",
  };
}
