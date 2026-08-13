import { describe, expect, it } from "vitest";
import {
  buildSubjectTeacherRows,
  buildTeacherClassSubjectRows,
  formatTeacherCarsafCell,
  formatTeacherProgramCell,
  type LessonData,
} from "@/lib/pdf-generator";

function lesson(overrides: Partial<LessonData>): LessonData {
  return {
    classId: "class-a",
    className: "10-A",
    subjectId: "sub-1",
    subjectName: "MATEMATİK 1",
    subjectShortName: "MAT1",
    teacherId: "teacher-1",
    teacherName: "Ayşe Yılmaz",
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "09:40",
    slotIndex: 0,
    ...overrides,
  };
}

describe("formatTeacherCarsafCell", () => {
  it("aynı sınıftaki farklı dersleri kısa ad ile ayırt eder", () => {
    const mat = formatTeacherCarsafCell(
      lesson({ subjectId: "mat", subjectName: "MATEMATİK 1", subjectShortName: "MAT1" })
    );
    const prb = formatTeacherCarsafCell(
      lesson({
        subjectId: "prb",
        subjectName: "PROBLEM",
        subjectShortName: "PRB",
      })
    );

    expect(mat).toContain("10-A");
    expect(mat).toContain("MAT1");
    expect(prb).toContain("10-A");
    expect(prb).toContain("PRB");
    expect(mat).not.toEqual(prb);
  });

  it("HTML özel karakterlerini kaçışlar", () => {
    const html = formatTeacherCarsafCell(
      lesson({ className: "10-A <X>", subjectShortName: "M&A" })
    );
    expect(html).toContain("10-A &lt;X&gt;");
    expect(html).toContain("M&amp;A");
  });
});

describe("formatTeacherProgramCell", () => {
  it("takvim hücresinde tam ders adını gösterir", () => {
    const html = formatTeacherProgramCell(
      lesson({
        className: "9-A",
        subjectName: "MATEMATİK 2",
        subjectShortName: "MAT2",
      })
    );
    expect(html).toContain("9-A");
    expect(html).toContain("MATEMATİK 2");
    expect(html).not.toContain("MAT2");
  });
});

describe("öğretmen programı hücre eşlemesi", () => {
  it("aynı sınıfın farklı derslerini startTime ile doğru bulur", () => {
    const lessons: LessonData[] = [
      lesson({
        subjectId: "mat",
        subjectName: "MATEMATİK 2",
        subjectShortName: "MAT2",
        dayOfWeek: 3,
        startTime: "09:00",
        slotIndex: 0,
        className: "9-A",
      }),
      lesson({
        subjectId: "prb",
        subjectName: "PROBLEM",
        subjectShortName: "PRB",
        dayOfWeek: 3,
        startTime: "11:30",
        slotIndex: 3,
        className: "9-A",
      }),
      lesson({
        subjectId: "prb",
        subjectName: "PROBLEM",
        subjectShortName: "PRB",
        dayOfWeek: 3,
        startTime: "12:20",
        slotIndex: 4,
        className: "9-A",
      }),
    ];

    const at = (day: number, start: string) =>
      lessons.find((l) => l.dayOfWeek === day && l.startTime === start);

    expect(at(3, "09:00")?.subjectName).toBe("MATEMATİK 2");
    expect(at(3, "11:30")?.subjectName).toBe("PROBLEM");
    expect(at(3, "12:20")?.subjectName).toBe("PROBLEM");
    expect(at(3, "09:50")).toBeUndefined();
  });
});

describe("buildTeacherClassSubjectRows", () => {
  it("aynı sınıftaki farklı dersleri ayrı satırda ve doğru saatle listeler", () => {
    const rows = buildTeacherClassSubjectRows([
      lesson({
        classId: "c10",
        className: "10-A",
        subjectId: "mat",
        subjectName: "MATEMATİK 1",
      }),
      lesson({
        classId: "c10",
        className: "10-A",
        subjectId: "mat",
        subjectName: "MATEMATİK 1",
        startTime: "09:50",
      }),
      lesson({
        classId: "c10",
        className: "10-A",
        subjectId: "prb",
        subjectName: "PROBLEM",
        dayOfWeek: 2,
        startTime: "11:30",
      }),
      lesson({
        classId: "c9",
        className: "9-A",
        subjectId: "mat2",
        subjectName: "MATEMATİK 2",
        dayOfWeek: 3,
      }),
    ]);

    expect(rows).toEqual([
      { className: "10-A", subjectName: "MATEMATİK 1", hours: 2 },
      { className: "10-A", subjectName: "PROBLEM", hours: 1 },
      { className: "9-A", subjectName: "MATEMATİK 2", hours: 1 },
    ]);
  });
});

describe("buildSubjectTeacherRows", () => {
  it("aynı öğretmenin aynı sınıftaki farklı derslerini ayrı satırda tutar", () => {
    const rows = buildSubjectTeacherRows([
      lesson({
        subjectId: "mat",
        subjectName: "MATEMATİK 1",
        subjectShortName: "MAT1",
      }),
      lesson({
        subjectId: "mat",
        subjectName: "MATEMATİK 1",
        subjectShortName: "MAT1",
        startTime: "09:50",
        slotIndex: 1,
      }),
      lesson({
        subjectId: "prb",
        subjectName: "PROBLEM",
        subjectShortName: "PRB",
        dayOfWeek: 2,
        startTime: "11:30",
        slotIndex: 3,
      }),
      lesson({
        subjectId: "prb",
        subjectName: "PROBLEM",
        subjectShortName: "PRB",
        dayOfWeek: 2,
        startTime: "12:20",
        slotIndex: 4,
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.name)).toEqual(["MATEMATİK 1", "PROBLEM"]);
    expect(rows.find((r) => r.name === "MATEMATİK 1")).toMatchObject({
      hours: 2,
      teacher: "Ayşe Yılmaz",
    });
    expect(rows.find((r) => r.name === "PROBLEM")).toMatchObject({
      hours: 2,
      teacher: "Ayşe Yılmaz",
    });
  });

  it("dersleri subjectId ile gruplar (ad çakışmasında karışmaz)", () => {
    const rows = buildSubjectTeacherRows([
      lesson({
        subjectId: "a",
        subjectName: "Deneme",
        subjectShortName: "A",
      }),
      lesson({
        subjectId: "b",
        subjectName: "Deneme",
        subjectShortName: "B",
        startTime: "09:50",
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.name === "Deneme")).toBe(true);
    expect(rows.every((r) => r.hours === 1)).toBe(true);
  });
});
