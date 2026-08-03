import { describe, expect, it } from "vitest";
import {
  autoSchedule,
  DEFAULT_RULES,
  type ClassSubjectInput,
  type GeneratedLesson,
} from "@/lib/scheduler";
import {
  makeClass,
  makeScheduleDay,
  makeSubject,
  makeTeacher,
  makeTeacherSubject,
} from "./helpers/fixtures";

/** Bir sınıfın aynı gün ve saatte iki dersi olamaz. */
function classConflicts(lessons: GeneratedLesson[]): number {
  const seen = new Set<string>();
  let conflicts = 0;
  for (const lesson of lessons) {
    const key = `${lesson.classId}:${lesson.dayOfWeek}:${lesson.startTime}`;
    if (seen.has(key)) conflicts++;
    seen.add(key);
  }
  return conflicts;
}

/** Bir öğretmen aynı anda iki sınıfta olamaz. */
function teacherConflicts(lessons: GeneratedLesson[]): number {
  const seen = new Set<string>();
  let conflicts = 0;
  for (const lesson of lessons) {
    if (!lesson.teacherId) continue;
    const key = `${lesson.teacherId}:${lesson.dayOfWeek}:${lesson.startTime}`;
    if (seen.has(key)) conflicts++;
    seen.add(key);
  }
  return conflicts;
}

/** Bir sınıf-ders çiftini birden çok öğretmenin vermesi kabul edilemez. */
function splitCourses(lessons: GeneratedLesson[]): string[] {
  const byCourse = new Map<string, Set<string>>();
  for (const lesson of lessons) {
    const key = `${lesson.className} - ${lesson.subjectName}`;
    const set = byCourse.get(key) ?? new Set<string>();
    set.add(lesson.teacherId);
    byCourse.set(key, set);
  }
  return [...byCourse.entries()]
    .filter(([, teachers]) => teachers.size > 1)
    .map(([course]) => course);
}

describe("autoSchedule", () => {
  it("tüm haftalık saatleri yerleştirir ve öğretmenlerini atar", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");
    const turkce = makeSubject("Türkçe");
    const matOgretmeni = makeTeacher("Mat Öğretmeni");
    const turOgretmeni = makeTeacher("Türkçe Öğretmeni");

    const classSubjects: ClassSubjectInput[] = [
      {
        classId: sinif.id,
        subjectId: matematik.id,
        subjectName: matematik.name,
        weeklyHours: 4,
      },
      {
        classId: sinif.id,
        subjectId: turkce.id,
        subjectName: turkce.name,
        weeklyHours: 3,
      },
    ];

    const result = autoSchedule(
      [sinif],
      [
        makeScheduleDay(sinif.id, 0),
        makeScheduleDay(sinif.id, 2),
        makeScheduleDay(sinif.id, 4),
      ],
      [matematik, turkce],
      classSubjects,
      DEFAULT_RULES,
      [
        makeTeacherSubject(matOgretmeni.id, matematik.id),
        makeTeacherSubject(turOgretmeni.id, turkce.id),
      ],
      [matOgretmeni, turOgretmeni]
    );

    expect(result.errors).toEqual([]);
    expect(result.lessons).toHaveLength(7);
    expect(result.stats.placedHours).toBe(7);
    expect(result.stats.coverage).toBe(1);
    expect(classConflicts(result.lessons)).toBe(0);
    expect(teacherConflicts(result.lessons)).toBe(0);
    expect(result.lessons.every((lesson) => lesson.teacherId)).toBe(true);
  });

  it("bir sınıfın dersini iki öğretmene bölmez", () => {
    // İki öğretmen de matematik verebiliyor; algoritma sıkışsa bile dersin
    // saatlerini ikiye bölerek doldurmamalı.
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");
    const birinci = makeTeacher("Birinci");
    const ikinci = makeTeacher("İkinci");

    const result = autoSchedule(
      [sinif],
      [makeScheduleDay(sinif.id, 0), makeScheduleDay(sinif.id, 2)],
      [matematik],
      [
        {
          classId: sinif.id,
          subjectId: matematik.id,
          subjectName: matematik.name,
          weeklyHours: 6,
        },
      ],
      DEFAULT_RULES,
      [
        makeTeacherSubject(birinci.id, matematik.id),
        makeTeacherSubject(ikinci.id, matematik.id),
      ],
      [birinci, ikinci]
    );

    expect(splitCourses(result.lessons)).toEqual([]);
    const teachers = new Set(result.lessons.map((lesson) => lesson.teacherId));
    expect(teachers.size).toBe(1);
  });

  it("öğretmen yetmediğinde dersi bölmek yerine açıkta bırakır", () => {
    // Tek öğretmen, iki sınıfa 4'er saat: sınıflar aynı günlerde ders görüyor
    // ve öğretmenin toplam müsait süresi 8 saat olsa da her ders tek kişiye
    // ait olmak zorunda.
    const a = makeClass("12-A");
    const b = makeClass("12-B");
    const matematik = makeSubject("Matematik");
    const ogretmen = makeTeacher("Tek Öğretmen");

    const result = autoSchedule(
      [a, b],
      [makeScheduleDay(a.id, 0), makeScheduleDay(b.id, 0)],
      [matematik],
      [a, b].map((cls) => ({
        classId: cls.id,
        subjectId: matematik.id,
        subjectName: matematik.name,
        weeklyHours: 4,
      })),
      DEFAULT_RULES,
      [makeTeacherSubject(ogretmen.id, matematik.id)],
      [ogretmen]
    );

    expect(splitCourses(result.lessons)).toEqual([]);
    expect(teacherConflicts(result.lessons)).toBe(0);
    // Bir günde 4 slot var; öğretmen ikisine birden yetişemez.
    expect(result.stats.placedHours).toBeLessThan(8);
    expect(result.unplaced.length).toBeGreaterThan(0);
  });

  it("ders günü tanımlanmamış sınıfı raporlar", () => {
    const sinif = makeClass("11-C");
    const fizik = makeSubject("Fizik");
    const ogretmen = makeTeacher("Fizik Öğretmeni");

    const result = autoSchedule(
      [sinif],
      [],
      [fizik],
      [
        {
          classId: sinif.id,
          subjectId: fizik.id,
          subjectName: fizik.name,
          weeklyHours: 2,
        },
      ],
      DEFAULT_RULES,
      [makeTeacherSubject(ogretmen.id, fizik.id)],
      [ogretmen]
    );

    expect(result.lessons).toEqual([]);
    expect(result.errors.join(" ")).toContain("ders günü tanımlanmamış");
    expect(result.feasibility.issues[0].kind).toBe("class-capacity");
  });

  it("dersi verebilecek öğretmen yoksa nedenini söyler", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");

    const result = autoSchedule(
      [sinif],
      [makeScheduleDay(sinif.id, 0)],
      [matematik],
      [
        {
          classId: sinif.id,
          subjectId: matematik.id,
          subjectName: matematik.name,
          weeklyHours: 2,
        },
      ],
      DEFAULT_RULES,
      [],
      []
    );

    expect(result.lessons).toEqual([]);
    expect(result.feasibility.issues[0].kind).toBe("no-teacher");
    expect(result.errors.join(" ")).toContain("öğretmen tanımlı değil");
  });

  it("sabit atanmış öğretmeni kullanır ve izin gününe ders koymaz", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");
    const sabit = makeTeacher("Sabit Öğretmen", { offDays: [0] });
    const diger = makeTeacher("Diğer Öğretmen");

    const result = autoSchedule(
      [sinif],
      [makeScheduleDay(sinif.id, 0), makeScheduleDay(sinif.id, 2)],
      [matematik],
      [
        {
          classId: sinif.id,
          subjectId: matematik.id,
          subjectName: matematik.name,
          weeklyHours: 2,
          teacherId: sabit.id,
        },
      ],
      DEFAULT_RULES,
      [
        makeTeacherSubject(sabit.id, matematik.id),
        makeTeacherSubject(diger.id, matematik.id),
      ],
      [sabit, diger]
    );

    expect(result.lessons).toHaveLength(2);
    expect(result.lessons.every((l) => l.teacherId === sabit.id)).toBe(true);
    expect(result.lessons.every((l) => l.dayOfWeek !== 0)).toBe(true);
  });

  it("aynı öğretmeni aynı saatte iki sınıfa koymaz", () => {
    const a = makeClass("12-A");
    const b = makeClass("12-B");
    const matematik = makeSubject("Matematik");
    const ogretmen = makeTeacher("Tek Öğretmen");

    const result = autoSchedule(
      [a, b],
      [
        makeScheduleDay(a.id, 0),
        makeScheduleDay(a.id, 2),
        makeScheduleDay(b.id, 0),
        makeScheduleDay(b.id, 2),
      ],
      [matematik],
      [a, b].map((cls) => ({
        classId: cls.id,
        subjectId: matematik.id,
        subjectName: matematik.name,
        weeklyHours: 2,
        teacherId: ogretmen.id,
      })),
      DEFAULT_RULES,
      [makeTeacherSubject(ogretmen.id, matematik.id)],
      [ogretmen]
    );

    expect(teacherConflicts(result.lessons)).toBe(0);
    expect(result.stats.placedHours).toBe(4);
  });

  it("eşli dersleri aynı sınıfta farklı öğretmenlere verir", () => {
    const sinif = makeClass("12-A");
    const turkce = makeSubject("TÜRKÇE");
    const edebiyat = makeSubject("EDEBİYAT");
    const birinci = makeTeacher("Birinci");
    const ikinci = makeTeacher("İkinci");

    const result = autoSchedule(
      [sinif],
      [makeScheduleDay(sinif.id, 0), makeScheduleDay(sinif.id, 2)],
      [turkce, edebiyat],
      [turkce, edebiyat].map((subject) => ({
        classId: sinif.id,
        subjectId: subject.id,
        subjectName: subject.name,
        weeklyHours: 2,
      })),
      DEFAULT_RULES,
      [
        makeTeacherSubject(birinci.id, turkce.id),
        makeTeacherSubject(birinci.id, edebiyat.id),
        makeTeacherSubject(ikinci.id, turkce.id),
        makeTeacherSubject(ikinci.id, edebiyat.id),
      ],
      [birinci, ikinci]
    );

    const turkceTeacher = result.lessons.find(
      (l) => l.subjectId === turkce.id
    )?.teacherId;
    const edebiyatTeacher = result.lessons.find(
      (l) => l.subjectId === edebiyat.id
    )?.teacherId;
    expect(turkceTeacher).toBeTruthy();
    expect(edebiyatTeacher).toBeTruthy();
    expect(turkceTeacher).not.toBe(edebiyatTeacher);
  });

  it("bölme kuralına göre dersi arka arkaya bloklara yerleştirir", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");
    const ogretmen = makeTeacher("Mat Öğretmeni");

    const result = autoSchedule(
      [sinif],
      [makeScheduleDay(sinif.id, 0), makeScheduleDay(sinif.id, 2)],
      [matematik],
      [
        {
          classId: sinif.id,
          subjectId: matematik.id,
          subjectName: matematik.name,
          weeklyHours: 2,
        },
      ],
      { splitRules: { 2: [2] } },
      [makeTeacherSubject(ogretmen.id, matematik.id)],
      [ogretmen]
    );

    expect(result.lessons).toHaveLength(2);
    const [first, second] = [...result.lessons].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    expect(first.dayOfWeek).toBe(second.dayOfWeek);
    // 40 dakika ders + 10 dakika teneffüs: ikinci saat birincinin hemen ardından.
    expect(second.startTime > first.endTime).toBe(true);
  });

  it("aynı tohum aynı sonucu üretir", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");
    const turkce = makeSubject("Türkçe");
    const matOgretmeni = makeTeacher("Mat");
    const turOgretmeni = makeTeacher("Tür");

    const run = () =>
      autoSchedule(
        [sinif],
        [makeScheduleDay(sinif.id, 0), makeScheduleDay(sinif.id, 2)],
        [matematik, turkce],
        [
          {
            classId: sinif.id,
            subjectId: matematik.id,
            subjectName: matematik.name,
            weeklyHours: 3,
          },
          {
            classId: sinif.id,
            subjectId: turkce.id,
            subjectName: turkce.name,
            weeklyHours: 2,
          },
        ],
        DEFAULT_RULES,
        [
          makeTeacherSubject(matOgretmeni.id, matematik.id),
          makeTeacherSubject(turOgretmeni.id, turkce.id),
        ],
        [matOgretmeni, turOgretmeni],
        7
      );

    expect(run().lessons).toEqual(run().lessons);
  });

  it("aynı dersten bir günde en fazla 2 saat verir", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");
    const ogretmen = makeTeacher("Mat Öğretmeni");

    // 6 saat matematik, 3 gün × 4 slot: günlük limit olmasa hepsi bir güne
    // yığılabilir; sert kural günde en fazla 2 saat ister.
    const result = autoSchedule(
      [sinif],
      [
        makeScheduleDay(sinif.id, 0),
        makeScheduleDay(sinif.id, 1),
        makeScheduleDay(sinif.id, 2),
      ],
      [matematik],
      [
        {
          classId: sinif.id,
          subjectId: matematik.id,
          subjectName: matematik.name,
          weeklyHours: 6,
        },
      ],
      DEFAULT_RULES,
      [makeTeacherSubject(ogretmen.id, matematik.id)],
      [ogretmen],
      3,
      { restarts: 4, maxIterations: 8000, timeLimitMs: 5000 }
    );

    expect(result.stats.placedHours).toBe(6);
    expect(classConflicts(result.lessons)).toBe(0);

    const hoursByDay = new Map<number, number>();
    for (const lesson of result.lessons) {
      hoursByDay.set(
        lesson.dayOfWeek,
        (hoursByDay.get(lesson.dayOfWeek) ?? 0) + 1
      );
    }
    for (const hours of hoursByDay.values()) {
      expect(hours).toBeLessThanOrEqual(2);
    }
  });

  it("gün sayısı yetmezse günlük limit yüzünden açık bırakır", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");
    const ogretmen = makeTeacher("Mat Öğretmeni");

    // 6 saat, yalnızca 2 gün → günde en fazla 2 ile en fazla 4 saat yerleşir.
    const result = autoSchedule(
      [sinif],
      [makeScheduleDay(sinif.id, 0), makeScheduleDay(sinif.id, 1)],
      [matematik],
      [
        {
          classId: sinif.id,
          subjectId: matematik.id,
          subjectName: matematik.name,
          weeklyHours: 6,
        },
      ],
      DEFAULT_RULES,
      [makeTeacherSubject(ogretmen.id, matematik.id)],
      [ogretmen],
      5,
      { restarts: 3, maxIterations: 5000, timeLimitMs: 3000 }
    );

    expect(result.stats.maxPlaceableHours).toBe(4);
    expect(result.stats.placedHours).toBeLessThanOrEqual(4);
    expect(
      result.feasibility.issues.some((issue) => issue.kind === "daily-subject-limit")
    ).toBe(true);

    const hoursByDay = new Map<number, number>();
    for (const lesson of result.lessons) {
      hoursByDay.set(
        lesson.dayOfWeek,
        (hoursByDay.get(lesson.dayOfWeek) ?? 0) + 1
      );
    }
    for (const hours of hoursByDay.values()) {
      expect(hours).toBeLessThanOrEqual(2);
    }
  });
});
