import { describe, expect, it } from "vitest";
import {
  buildOgretmenCarsafMatrix,
  buildSinifCarsafMatrix,
  buildSubjectTeacherRows,
  buildTeacherClassSubjectRows,
  formatSinifCarsafPlain,
  formatTeacherCarsafCell,
  formatTeacherCarsafPlain,
  formatTeacherProgramCell,
  longestCarsafCellLength,
  longestCarsafSubjectLength,
  type LessonData,
} from "@/lib/pdf-generator";
import {
  carsafMatrixToSheetRows,
  formatSinifCarsafExcelCell,
} from "@/lib/carsaf-excel";

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

describe("formatTeacherCarsafPlain", () => {
  it("Excel için sınıf ve dersi satır kırımlı verir", () => {
    expect(formatTeacherCarsafPlain(lesson({}))).toBe("10-A\nMAT1");
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

describe("çarşaf matrisleri", () => {
  const lessons: LessonData[] = [
    lesson({
      className: "10-A",
      subjectName: "MATEMATİK 1",
      subjectShortName: "MAT1",
      teacherName: "Ayşe",
      dayOfWeek: 0,
      startTime: "09:00",
    }),
    lesson({
      className: "10-A",
      subjectId: "prb",
      subjectName: "PROBLEM",
      subjectShortName: "PRB",
      teacherName: "Ayşe",
      dayOfWeek: 0,
      startTime: "09:50",
      endTime: "10:30",
      slotIndex: 1,
    }),
    lesson({
      classId: "c9",
      className: "9-A",
      subjectName: "TÜRKÇE",
      subjectShortName: "TÜR",
      teacherName: "Deniz",
      teacherId: "t2",
      dayOfWeek: 1,
      startTime: "09:00",
    }),
  ];

  it("sınıf çarşafında ders ve öğretmen adlarını yerleştirir", () => {
    const matrix = buildSinifCarsafMatrix(lessons);
    expect(matrix.labelHeader).toBe("Sınıf");
    expect(matrix.days).toEqual([0, 1]);
    const row10 = matrix.rows.find((r) => r.label === "10-A");
    expect(row10?.cells[0]).toBe("MATEMATİK 1\nAyşe");
    expect(row10?.cells[1]).toBe("PROBLEM\nAyşe");
  });

  it("öğretmen çarşafında sınıf+ders düz metnini yerleştirir", () => {
    const matrix = buildOgretmenCarsafMatrix(lessons);
    const ayse = matrix.rows.find((r) => r.label === "Ayşe");
    expect(ayse?.cells[0]).toBe("10-A\nMAT1");
    expect(ayse?.cells[1]).toBe("10-A\nPRB");
  });

  it("Excel satırlarına gün birleştirmesi ekler", () => {
    const matrix = buildSinifCarsafMatrix(lessons);
    const { rows, merges } = carsafMatrixToSheetRows(matrix);
    expect(rows[0][0]).toBe("Sınıf");
    expect(rows[0][1]).toBe("PZT");
    expect(merges.length).toBeGreaterThan(0);
    expect(rows.some((r) => r[0] === "10-A")).toBe(true);
    const dataRow = rows.find((r) => r[0] === "10-A");
    expect(dataRow?.[1]).toBe("MATEMATİK 1\nAyşe");
  });
});

describe("formatSinifCarsafPlain", () => {
  it("ders adı ve öğretmeni satır kırımlı verir", () => {
    expect(
      formatSinifCarsafPlain(
        lesson({
          subjectName: "MATEMATİK 1",
          subjectShortName: "MAT1",
          teacherName: "Ayşe Yılmaz",
        })
      )
    ).toBe("MATEMATİK 1\nAyşe Yılmaz");
  });
});

describe("formatSinifCarsafExcelCell", () => {
  it("ders ile öğretmen arasına boşluk koyar", () => {
    expect(formatSinifCarsafExcelCell("MATEMATİK 1\nAyşe Yılmaz")).toBe(
      "MATEMATİK 1 Ayşe Yılmaz"
    );
  });
});

describe("çarşaf sütun genişliği", () => {
  it("en uzun ders adı uzunluğunu bulur", () => {
    const matrix = buildSinifCarsafMatrix([
      lesson({
        subjectName: "KISA",
        teacherName: "A",
        dayOfWeek: 0,
        startTime: "09:00",
      }),
      lesson({
        className: "10-B",
        subjectName: "ÇOK UZUN DERS ADI BURADA",
        teacherName: "B",
        dayOfWeek: 0,
        startTime: "09:00",
      }),
    ]);
    expect(longestCarsafSubjectLength(matrix)).toBe(
      "ÇOK UZUN DERS ADI BURADA".length
    );
    expect(longestCarsafCellLength(matrix)).toBe(
      "ÇOK UZUN DERS ADI BURADA B".length
    );
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
