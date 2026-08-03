import { describe, expect, it } from "vitest";
import { assignTeachersToSchedule } from "@/lib/teacher-assignment";
import type { GeneratedLesson } from "@/lib/scheduler";
import {
  makeClassSubject,
  makeSubject,
  makeTeacher,
  makeTeacherSubject,
} from "./helpers/fixtures";

interface LessonSpec {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  dayOfWeek: number;
  startTime: string;
}

function lesson(spec: LessonSpec): GeneratedLesson {
  const [hours, minutes] = spec.startTime.split(":").map(Number);
  const end = hours * 60 + minutes + 40;
  return {
    ...spec,
    teacherId: "",
    teacherName: "",
    endTime: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
  };
}

describe("assignTeachersToSchedule", () => {
  it("dersi verebilen öğretmeni atar", () => {
    const matematik = makeSubject("Matematik");
    const ogretmen = makeTeacher("Ayşe Yılmaz");

    const result = assignTeachersToSchedule(
      [
        lesson({
          classId: "c1",
          className: "12-A",
          subjectId: matematik.id,
          subjectName: matematik.name,
          dayOfWeek: 0,
          startTime: "16:40",
        }),
      ],
      [ogretmen],
      [makeTeacherSubject(ogretmen.id, matematik.id)],
      [matematik]
    );

    expect(result.errors).toEqual([]);
    expect(result.lessons[0].teacherId).toBe(ogretmen.id);
    expect(result.lessons[0].teacherName).toBe("Ayşe Yılmaz");
    expect(result.stats.teacherLoads).toEqual([
      { teacherId: ogretmen.id, teacherName: "Ayşe Yılmaz", totalHours: 1 },
    ]);
  });

  it("aynı öğretmeni aynı saatte iki sınıfa atamaz", () => {
    const matematik = makeSubject("Matematik");
    const birinci = makeTeacher("Birinci");
    const ikinci = makeTeacher("İkinci");

    const result = assignTeachersToSchedule(
      [
        lesson({
          classId: "c1",
          className: "12-A",
          subjectId: matematik.id,
          subjectName: matematik.name,
          dayOfWeek: 0,
          startTime: "16:40",
        }),
        lesson({
          classId: "c2",
          className: "12-B",
          subjectId: matematik.id,
          subjectName: matematik.name,
          dayOfWeek: 0,
          startTime: "16:40",
        }),
      ],
      [birinci, ikinci],
      [
        makeTeacherSubject(birinci.id, matematik.id),
        makeTeacherSubject(ikinci.id, matematik.id),
      ],
      [matematik]
    );

    const [first, second] = result.lessons;
    expect(first.teacherId).toBeTruthy();
    expect(second.teacherId).toBeTruthy();
    expect(first.teacherId).not.toBe(second.teacherId);
  });

  it("öğretmenin izin gününe ders atamaz", () => {
    const matematik = makeSubject("Matematik");
    const izinli = makeTeacher("İzinli", { offDays: [0] });
    const musait = makeTeacher("Müsait");

    const result = assignTeachersToSchedule(
      [
        lesson({
          classId: "c1",
          className: "12-A",
          subjectId: matematik.id,
          subjectName: matematik.name,
          dayOfWeek: 0,
          startTime: "16:40",
        }),
      ],
      [izinli, musait],
      [
        makeTeacherSubject(izinli.id, matematik.id),
        makeTeacherSubject(musait.id, matematik.id),
      ],
      [matematik]
    );

    expect(result.lessons[0].teacherId).toBe(musait.id);
  });

  it("dersi verebilecek öğretmen yoksa hata döndürür", () => {
    const matematik = makeSubject("Matematik");

    const result = assignTeachersToSchedule(
      [
        lesson({
          classId: "c1",
          className: "12-A",
          subjectId: matematik.id,
          subjectName: matematik.name,
          dayOfWeek: 0,
          startTime: "16:40",
        }),
      ],
      [],
      [],
      [matematik]
    );

    expect(result.stats.failed).toBe(1);
    expect(result.errors[0]).toContain("öğretmen tanımlı değil");
    expect(result.lessons[0].teacherId).toBe("");
  });

  it("sabit atanmış öğretmeni tercih eder", () => {
    const matematik = makeSubject("Matematik");
    const sabit = makeTeacher("Sabit");
    const diger = makeTeacher("Diğer");

    const result = assignTeachersToSchedule(
      [
        lesson({
          classId: "c1",
          className: "12-A",
          subjectId: matematik.id,
          subjectName: matematik.name,
          dayOfWeek: 0,
          startTime: "16:40",
        }),
      ],
      [sabit, diger],
      [
        makeTeacherSubject(sabit.id, matematik.id),
        makeTeacherSubject(diger.id, matematik.id),
      ],
      [matematik],
      [makeClassSubject("c1", matematik.id, 1, sabit.id)]
    );

    expect(result.lessons[0].teacherId).toBe(sabit.id);
  });

  it("eşli dersleri aynı sınıfta farklı öğretmenlere verir", () => {
    const turkce = makeSubject("TÜRKÇE");
    const edebiyat = makeSubject("EDEBİYAT");
    const birinci = makeTeacher("Birinci");
    const ikinci = makeTeacher("İkinci");

    const result = assignTeachersToSchedule(
      [
        lesson({
          classId: "c1",
          className: "12-A",
          subjectId: turkce.id,
          subjectName: turkce.name,
          dayOfWeek: 0,
          startTime: "16:40",
        }),
        lesson({
          classId: "c1",
          className: "12-A",
          subjectId: edebiyat.id,
          subjectName: edebiyat.name,
          dayOfWeek: 1,
          startTime: "16:40",
        }),
      ],
      [birinci, ikinci],
      [
        makeTeacherSubject(birinci.id, turkce.id),
        makeTeacherSubject(birinci.id, edebiyat.id),
        makeTeacherSubject(ikinci.id, turkce.id),
        makeTeacherSubject(ikinci.id, edebiyat.id),
      ],
      [turkce, edebiyat]
    );

    const turkceLesson = result.lessons.find(
      (l) => l.subjectId === turkce.id
    )!;
    const edebiyatLesson = result.lessons.find(
      (l) => l.subjectId === edebiyat.id
    )!;
    expect(turkceLesson.teacherId).not.toBe(edebiyatLesson.teacherId);
  });

  it("yükü müsait öğretmenler arasında dengeler", () => {
    const matematik = makeSubject("Matematik");
    const birinci = makeTeacher("Birinci");
    const ikinci = makeTeacher("İkinci");

    // Dört ayrı sınıf, hepsi farklı saatlerde: yük iki öğretmene dağılmalı.
    const lessons = [0, 1, 2, 3].map((index) =>
      lesson({
        classId: `c${index}`,
        className: `Sınıf ${index}`,
        subjectId: matematik.id,
        subjectName: matematik.name,
        dayOfWeek: index,
        startTime: "16:40",
      })
    );

    const result = assignTeachersToSchedule(
      lessons,
      [birinci, ikinci],
      [
        makeTeacherSubject(birinci.id, matematik.id),
        makeTeacherSubject(ikinci.id, matematik.id),
      ],
      [matematik]
    );

    const loads = result.stats.teacherLoads.map((load) => load.totalHours);
    expect(result.stats.failed).toBe(0);
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(2);
  });
});
