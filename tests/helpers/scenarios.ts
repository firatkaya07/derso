import type {
  ClassGroup,
  ClassScheduleDay,
  Subject,
  Teacher,
  TeacherSubject,
} from "@/lib/types";
import type { ClassSubjectInput } from "@/lib/scheduler";
import { generateTimeSlots } from "@/lib/types";

export interface Scenario {
  name: string;
  classes: ClassGroup[];
  scheduleDays: ClassScheduleDay[];
  subjects: Subject[];
  teachers: Teacher[];
  teacherSubjects: TeacherSubject[];
  classSubjects: ClassSubjectInput[];
  /** Senaryonun tasarım gereği eksiksiz çözülebilir olup olmadığı. */
  solvable: boolean;
}

/** Tohumlu, belirlenimci üreteç; senaryolar her çalıştırmada aynı olmalı. */
function makeRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

interface SubjectSpec {
  name: string;
  teacherCount: number;
  /** Sınıf başına haftalık saat. */
  hours: number;
}

interface ScenarioSpec {
  name: string;
  classCount: number;
  /** Tüm sınıfların ortak ders günleri (0=Pazartesi). */
  weekdays: number[];
  weekdayStart: string;
  weekdayEnd: string;
  /** Cumartesi saatleri; verilmezse hafta sonu dersi yok. */
  weekend?: { start: string; end: string };
  subjects: SubjectSpec[];
  /** Kaç öğretmene bir izin günü verilsin (0-1 arası oran). */
  offDayRatio: number;
  /** Sınıf-ders çiftlerinin kaçta birine sabit öğretmen atansın. */
  preAssignRatio: number;
  /** Sınıfları günlere yayarak çakışmayı azaltır; gerçek kurslarda nadirdir. */
  staggerDays?: boolean;
  solvable: boolean;
  seed: number;
}

function buildScenario(spec: ScenarioSpec): Scenario {
  const random = makeRandom(spec.seed);

  const classes: ClassGroup[] = Array.from(
    { length: spec.classCount },
    (_, i) => ({
      id: `class-${i}`,
      name: `S${String(i + 1).padStart(2, "0")}`,
      description: null,
      level: null,
      subgroup: null,
      created_at: "2026-01-01T00:00:00Z",
    })
  );

  const scheduleDays: ClassScheduleDay[] = [];
  classes.forEach((cls, classIndex) => {
    const days = spec.staggerDays
      ? spec.weekdays.map((day) => (day + classIndex) % 5)
      : spec.weekdays;
    for (const day of days) {
      scheduleDays.push({
        id: `day-${classIndex}-${day}`,
        class_id: cls.id,
        day_of_week: day,
        start_time: spec.weekdayStart,
        end_time: spec.weekdayEnd,
      });
    }
    if (spec.weekend) {
      scheduleDays.push({
        id: `day-${classIndex}-sat`,
        class_id: cls.id,
        day_of_week: 5,
        start_time: spec.weekend.start,
        end_time: spec.weekend.end,
      });
    }
  });

  const subjects: Subject[] = spec.subjects.map((subject, i) => ({
    id: `subject-${i}`,
    name: subject.name,
    short_name: subject.name.slice(0, 3).toUpperCase(),
    color: "#3B82F6",
    level: null,
    subgroups: null,
    created_at: "2026-01-01T00:00:00Z",
  }));

  const teachers: Teacher[] = [];
  const teacherSubjects: TeacherSubject[] = [];
  const teachersBySubject = new Map<string, string[]>();

  spec.subjects.forEach((subject, subjectIndex) => {
    const subjectId = `subject-${subjectIndex}`;
    const ids: string[] = [];
    for (let t = 0; t < subject.teacherCount; t++) {
      const id = `teacher-${subjectIndex}-${t}`;
      const offDays: number[] = [];
      if (random() < spec.offDayRatio) {
        offDays.push(Math.floor(random() * 6));
      }
      teachers.push({
        id,
        name: `${subject.name} Öğretmeni ${t + 1}`,
        phone: null,
        email: null,
        off_days: offDays,
        specialization: subject.name,
        created_at: "2026-01-01T00:00:00Z",
      });
      teacherSubjects.push({
        id: `ts-${id}`,
        teacher_id: id,
        subject_id: subjectId,
        created_at: "2026-01-01T00:00:00Z",
      });
      ids.push(id);
    }
    teachersBySubject.set(subjectId, ids);
  });

  const classSubjects: ClassSubjectInput[] = classes.flatMap((cls) =>
    spec.subjects.map((subject, subjectIndex) => {
      const subjectId = `subject-${subjectIndex}`;
      const candidates = teachersBySubject.get(subjectId)!;
      const preAssign = random() < spec.preAssignRatio;
      return {
        classId: cls.id,
        subjectId,
        subjectName: subject.name,
        weeklyHours: subject.hours,
        teacherId: preAssign
          ? candidates[Math.floor(random() * candidates.length)]
          : null,
      };
    })
  );

  return {
    name: spec.name,
    classes,
    scheduleDays,
    subjects,
    teachers,
    teacherSubjects,
    classSubjects,
    solvable: spec.solvable,
  };
}

export function classCapacity(scenario: Scenario): number {
  return scenario.scheduleDays.reduce(
    (sum, day) => sum + generateTimeSlots(day.start_time, day.end_time).length,
    0
  );
}

export function totalDemand(scenario: Scenario): number {
  return scenario.classSubjects.reduce((sum, cs) => sum + cs.weeklyHours, 0);
}

/**
 * Gerçek kurslarda tüm şubeler aynı akşamlarda ders görür; bu yüzden
 * senaryoların çoğunda günler ortaktır. Öğretmen sayıları teorik alt sınıra
 * yakın tutulmuştur: bir dersin toplam talebi, o dersi verebilen öğretmen
 * sayısı çarpı slot sayısını aşmamalıdır.
 */
export const SCENARIOS: Scenario[] = [
  buildScenario({
    name: "Küçük kurs (8 sınıf, ortak günler)",
    classCount: 8,
    weekdays: [0, 2, 4],
    weekdayStart: "16:40",
    weekdayEnd: "19:50",
    weekend: { start: "08:30", end: "13:30" },
    subjects: [
      { name: "Matematik", teacherCount: 2, hours: 5 },
      { name: "Türkçe", teacherCount: 2, hours: 4 },
      { name: "Fizik", teacherCount: 1, hours: 3 },
      { name: "Kimya", teacherCount: 1, hours: 3 },
    ],
    offDayRatio: 0.3,
    preAssignRatio: 0,
    solvable: true,
    seed: 11,
  }),
  buildScenario({
    name: "Orta kurs (14 sınıf, tek saatlik bloklar)",
    classCount: 14,
    weekdays: [0, 1, 2, 3],
    weekdayStart: "16:40",
    weekdayEnd: "19:50",
    weekend: { start: "08:30", end: "13:30" },
    subjects: [
      { name: "Matematik", teacherCount: 4, hours: 5 },
      { name: "Türkçe", teacherCount: 3, hours: 3 },
      { name: "Fizik", teacherCount: 3, hours: 3 },
      { name: "Kimya", teacherCount: 2, hours: 3 },
      { name: "Biyoloji", teacherCount: 2, hours: 3 },
      { name: "Tarih", teacherCount: 2, hours: 3 },
    ],
    offDayRatio: 0.35,
    preAssignRatio: 0,
    solvable: true,
    seed: 22,
  }),
  buildScenario({
    name: "Sabit öğretmenli kurs (12 sınıf, %40 sabit atama)",
    classCount: 12,
    weekdays: [0, 1, 2, 3],
    weekdayStart: "16:40",
    weekdayEnd: "19:50",
    weekend: { start: "08:30", end: "13:30" },
    subjects: [
      { name: "Matematik", teacherCount: 4, hours: 5 },
      { name: "Türkçe", teacherCount: 3, hours: 4 },
      { name: "Fizik", teacherCount: 3, hours: 3 },
      { name: "Kimya", teacherCount: 2, hours: 3 },
      { name: "Biyoloji", teacherCount: 2, hours: 2 },
    ],
    offDayRatio: 0.3,
    preAssignRatio: 0.4,
    solvable: true,
    seed: 33,
  }),
  buildScenario({
    name: "Büyük kurs (24 sınıf, 8 ders)",
    classCount: 24,
    weekdays: [0, 1, 2, 3, 4],
    weekdayStart: "16:40",
    weekdayEnd: "19:50",
    weekend: { start: "08:30", end: "13:30" },
    subjects: [
      { name: "Matematik", teacherCount: 6, hours: 5 },
      { name: "Türkçe", teacherCount: 5, hours: 4 },
      { name: "Fizik", teacherCount: 4, hours: 3 },
      { name: "Kimya", teacherCount: 3, hours: 3 },
      { name: "Biyoloji", teacherCount: 3, hours: 3 },
      { name: "Tarih", teacherCount: 3, hours: 2 },
      { name: "Coğrafya", teacherCount: 2, hours: 2 },
      { name: "İngilizce", teacherCount: 2, hours: 2 },
    ],
    offDayRatio: 0.35,
    preAssignRatio: 0.15,
    solvable: true,
    seed: 44,
  }),
  buildScenario({
    name: "Dolu program (kapasitenin tamamı kullanılıyor)",
    classCount: 10,
    weekdays: [0, 1, 2, 3],
    weekdayStart: "16:40",
    weekdayEnd: "19:50",
    weekend: undefined,
    // 4 gün x 4 slot = 16 slot, talep de tam 16 saat.
    subjects: [
      { name: "Matematik", teacherCount: 4, hours: 6 },
      { name: "Türkçe", teacherCount: 3, hours: 4 },
      { name: "Fizik", teacherCount: 3, hours: 4 },
      { name: "Kimya", teacherCount: 2, hours: 2 },
    ],
    offDayRatio: 0.2,
    preAssignRatio: 0,
    solvable: true,
    seed: 55,
  }),
];

/** Sınıf kapasitesinin yetmediği, tasarım gereği çözülemeyen senaryo. */
export const OVERSUBSCRIBED_SCENARIO: Scenario = buildScenario({
  name: "Kapasite yetersiz (bilerek çözülemez)",
  classCount: 4,
  weekdays: [0, 2],
  weekdayStart: "16:40",
  weekdayEnd: "19:50",
  subjects: [
    { name: "Matematik", teacherCount: 3, hours: 6 },
    { name: "Türkçe", teacherCount: 3, hours: 6 },
  ],
  offDayRatio: 0,
  preAssignRatio: 0,
  solvable: false,
  seed: 66,
});

/** Dersi verebilecek öğretmeni olmayan senaryo. */
export const NO_TEACHER_SCENARIO: Scenario = (() => {
  const scenario = buildScenario({
    name: "Öğretmensiz ders (bilerek çözülemez)",
    classCount: 3,
    weekdays: [0, 2, 4],
    weekdayStart: "16:40",
    weekdayEnd: "19:50",
    subjects: [
      { name: "Matematik", teacherCount: 2, hours: 4 },
      { name: "Astronomi", teacherCount: 1, hours: 2 },
    ],
    offDayRatio: 0,
    preAssignRatio: 0,
    solvable: false,
    seed: 77,
  });
  // Astronomi öğretmenini kaldır: ders programa girer ama atanamaz.
  const astronomyId = "subject-1";
  scenario.teacherSubjects = scenario.teacherSubjects.filter(
    (ts) => ts.subject_id !== astronomyId
  );
  scenario.teachers = scenario.teachers.filter(
    (teacher) => teacher.specialization !== "Astronomi"
  );
  return scenario;
})();
