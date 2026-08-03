import { describe, expect, it } from "vitest";
import { autoSchedule, DEFAULT_RULES, type ClassSubjectInput } from "@/lib/scheduler";
import {
  makeClass,
  makeScheduleDay,
  makeSubject,
  makeTeacher,
  makeTeacherSubject,
} from "./helpers/fixtures";

/** Bir sınıfın aynı gün ve saatte iki dersi olamaz. */
function hasClassConflict(
  lessons: { classId: string; dayOfWeek: number; startTime: string }[]
): boolean {
  const seen = new Set<string>();
  for (const lesson of lessons) {
    const key = `${lesson.classId}:${lesson.dayOfWeek}:${lesson.startTime}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

describe("autoSchedule", () => {
  it("tüm haftalık saatleri yerleştirir ve sınıfı çakıştırmaz", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");
    const turkce = makeSubject("Türkçe");

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
      DEFAULT_RULES
    );

    expect(result.errors).toEqual([]);
    expect(result.lessons).toHaveLength(7);
    expect(hasClassConflict(result.lessons)).toBe(false);

    const matematikSaatleri = result.lessons.filter(
      (lesson) => lesson.subjectId === matematik.id
    );
    expect(matematikSaatleri).toHaveLength(4);
  });

  it("ders günü tanımlanmamış sınıf için hata döndürür", () => {
    const sinif = makeClass("11-C");
    const fizik = makeSubject("Fizik");

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
      DEFAULT_RULES
    );

    expect(result.lessons).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Ders günü tanımlanmamış");
  });

  it("sabit atanmış öğretmeni aynı saatte iki sınıfa koymaz", () => {
    const a = makeClass("12-A");
    const b = makeClass("12-B");
    const matematik = makeSubject("Matematik");
    const ogretmen = makeTeacher("Ayşe Yılmaz");

    const result = autoSchedule(
      [a, b],
      [makeScheduleDay(a.id, 0), makeScheduleDay(b.id, 0)],
      [matematik],
      [
        {
          classId: a.id,
          subjectId: matematik.id,
          subjectName: matematik.name,
          weeklyHours: 2,
          teacherId: ogretmen.id,
        },
        {
          classId: b.id,
          subjectId: matematik.id,
          subjectName: matematik.name,
          weeklyHours: 2,
          teacherId: ogretmen.id,
        },
      ],
      DEFAULT_RULES,
      [makeTeacherSubject(ogretmen.id, matematik.id)],
      [ogretmen]
    );

    const slots = result.lessons.map(
      (lesson) => `${lesson.dayOfWeek}:${lesson.startTime}`
    );
    expect(new Set(slots).size).toBe(slots.length);
  });

  it("sabit atanmış öğretmenin izin gününe ders koymaz", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");
    // Pazartesi izinli; sınıf pazartesi ve çarşamba ders görüyor.
    const ogretmen = makeTeacher("Ayşe Yılmaz", { offDays: [0] });

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
          teacherId: ogretmen.id,
        },
      ],
      DEFAULT_RULES,
      [makeTeacherSubject(ogretmen.id, matematik.id)],
      [ogretmen]
    );

    expect(result.lessons).toHaveLength(2);
    expect(result.lessons.every((lesson) => lesson.dayOfWeek !== 0)).toBe(true);
  });

  it("bir dersi aynı anda öğretmen sayısından fazla sınıfa koymaz", () => {
    const siniflar = [makeClass("A"), makeClass("B"), makeClass("C")];
    const matematik = makeSubject("Matematik");
    // Tek matematik öğretmeni var: aynı saatte yalnızca bir sınıf ders görebilir.
    const ogretmen = makeTeacher("Tek Öğretmen");

    const result = autoSchedule(
      siniflar,
      siniflar.flatMap((sinif) => [
        makeScheduleDay(sinif.id, 0),
        makeScheduleDay(sinif.id, 1),
        makeScheduleDay(sinif.id, 2),
      ]),
      [matematik],
      siniflar.map((sinif) => ({
        classId: sinif.id,
        subjectId: matematik.id,
        subjectName: matematik.name,
        weeklyHours: 2,
      })),
      DEFAULT_RULES,
      [makeTeacherSubject(ogretmen.id, matematik.id)],
      [ogretmen]
    );

    const perSlot = new Map<string, number>();
    for (const lesson of result.lessons) {
      const key = `${lesson.dayOfWeek}:${lesson.startTime}`;
      perSlot.set(key, (perSlot.get(key) ?? 0) + 1);
    }
    expect(Math.max(...perSlot.values())).toBe(1);
  });

  it("aynı tohum aynı sonucu üretir", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");
    const turkce = makeSubject("Türkçe");
    const scheduleDays = [
      makeScheduleDay(sinif.id, 0),
      makeScheduleDay(sinif.id, 2),
    ];
    const classSubjects: ClassSubjectInput[] = [
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
    ];

    const first = autoSchedule(
      [sinif],
      scheduleDays,
      [matematik, turkce],
      classSubjects,
      DEFAULT_RULES,
      undefined,
      undefined,
      7
    );
    const second = autoSchedule(
      [sinif],
      scheduleDays,
      [matematik, turkce],
      classSubjects,
      DEFAULT_RULES,
      undefined,
      undefined,
      7
    );

    expect(first.lessons).toEqual(second.lessons);
  });

  it("bölme kuralına göre dersi arka arkaya bloklara yerleştirir", () => {
    const sinif = makeClass("12-A");
    const matematik = makeSubject("Matematik");

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
      { splitRules: { 2: [2] } }
    );

    expect(result.lessons).toHaveLength(2);
    const [first, second] = [...result.lessons].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    expect(first.dayOfWeek).toBe(second.dayOfWeek);
    // 40 dakika ders + 10 dakika teneffüs: bloklar bitişik olmalı.
    expect(first.endTime).not.toBe(second.startTime);
    expect(second.startTime > first.endTime).toBe(true);
  });
});
