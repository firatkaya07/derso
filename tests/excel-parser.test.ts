import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelFile } from "@/lib/excel-parser";
import {
  buildTemplateWorkbook,
  SHEET_NAMES,
  parseDayName,
  parseTimeCell,
  splitList,
  trUpper,
} from "@/lib/excel-template";

function toBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
}

function replaceSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  rows: (string | number | null)[][]
) {
  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
}

describe("parseTimeCell", () => {
  it("metin saatleri okur", () => {
    expect(parseTimeCell("16:40")).toBe("16:40");
    expect(parseTimeCell("8.30")).toBe("08:30");
    expect(parseTimeCell("08:30:00")).toBe("08:30");
  });

  it("Excel'in gün kesri biçimini okur", () => {
    // 16:40 = (16 * 60 + 40) / 1440
    expect(parseTimeCell(1000 / 1440)).toBe("16:40");
    expect(parseTimeCell(0)).toBe("00:00");
  });

  it("geçersiz değerlerde null döner", () => {
    expect(parseTimeCell("akşam")).toBeNull();
    expect(parseTimeCell("25:00")).toBeNull();
    expect(parseTimeCell("")).toBeNull();
  });
});

describe("parseDayName", () => {
  it("Türkçe karakterlerden ve kısaltmalardan bağımsız eşleşir", () => {
    expect(parseDayName("Pazartesi")).toBe(0);
    expect(parseDayName("çarşamba")).toBe(2);
    expect(parseDayName("CARSAMBA")).toBe(2);
    expect(parseDayName("Cmt")).toBe(5);
    expect(parseDayName("yarın")).toBeNull();
  });
});

describe("splitList", () => {
  it("virgül ve noktalı virgülle ayrılmış değerleri böler", () => {
    expect(splitList("Matematik, Fizik")).toEqual(["Matematik", "Fizik"]);
    expect(splitList("Cumartesi - Pazar")).toEqual(["Cumartesi", "Pazar"]);
    expect(splitList(null)).toEqual([]);
  });
});

describe("trUpper", () => {
  it("Türkçe i/İ dönüşümünü doğru yapar", () => {
    expect(trUpper("dil")).toBe("DİL");
    expect(trUpper("söz")).toBe("SÖZ");
    expect(trUpper("DİL")).toBe("DİL");
  });
});

describe("parseExcelFile", () => {
  it("kendi ürettiği şablonu hatasız okur", () => {
    const parsed = parseExcelFile(toBuffer(buildTemplateWorkbook()));

    expect(parsed.errors).toEqual([]);
    expect(parsed.teachers).toHaveLength(5);
    expect(parsed.subjects).toHaveLength(6);
    expect(parsed.classes).toHaveLength(3);

    const ayse = parsed.teachers.find((t) => t.name === "Ayşe Yılmaz");
    expect(ayse?.offDays).toEqual([5, 6]);
    expect(ayse?.subjectNames).toEqual(["Matematik 1", "Matematik 2"]);

    // 12-A hem hafta içi üç gün hem cumartesi ders görüyor.
    const gunler = parsed.scheduleDays.filter((d) => d.className === "12-A");
    expect(gunler.map((d) => d.dayOfWeek).sort()).toEqual([0, 2, 4, 5]);
    expect(gunler.find((d) => d.dayOfWeek === 5)).toMatchObject({
      startTime: "08:30",
      endTime: "13:30",
    });

    const matematik = parsed.classSubjects.find(
      (cs) => cs.className === "12-A" && cs.subjectName === "Matematik 1"
    );
    expect(matematik?.weeklyHours).toBe(4);
    expect(matematik?.teacherName).toBe("Ayşe Yılmaz");
  });

  it("sütun sırasından ve harf/Türkçe karakter farkından etkilenmez", () => {
    const workbook = buildTemplateWorkbook();
    replaceSheet(workbook, SHEET_NAMES.teachers, [
      ["İZİN GÜNLERİ", "verdigi dersler", "ad soyad*", "branş"],
      ["Pazar", "Türkçe", "Mehmet Demir", "Türkçe"],
    ]);
    // Şablondaki örnek sabit atama artık var olmayan bir öğretmene işaret ediyor.
    replaceSheet(workbook, SHEET_NAMES.assignments, [
      ["Sınıf Adı", "Ders Adı", "Öğretmen"],
    ]);

    const parsed = parseExcelFile(toBuffer(workbook));

    expect(parsed.errors).toEqual([]);
    expect(parsed.teachers).toEqual([
      {
        name: "Mehmet Demir",
        specialization: "Türkçe",
        phone: null,
        email: null,
        offDays: [6],
        subjectNames: ["Türkçe"],
      },
    ]);
  });

  it("zorunlu sütun eksikse anlaşılır hata verir", () => {
    const workbook = buildTemplateWorkbook();
    replaceSheet(workbook, SHEET_NAMES.scheduleDays, [
      ["Sınıf Adı", "Günler", "Başlangıç"],
      ["12-A", "Pazartesi", "16:40"],
    ]);

    const parsed = parseExcelFile(toBuffer(workbook));

    expect(
      parsed.errors.some(
        (issue) =>
          issue.sheet === SHEET_NAMES.scheduleDays &&
          issue.message.includes("Bitiş")
      )
    ).toBe(true);
  });

  it("tanımsız sınıfa saat girilmişse satır numarasıyla hata verir", () => {
    const workbook = buildTemplateWorkbook();
    replaceSheet(workbook, SHEET_NAMES.distribution, [
      ["Ders", "12-A", "13-Z"],
      ["Matematik 1", 4, 4],
    ]);

    const parsed = parseExcelFile(toBuffer(workbook));

    expect(
      parsed.errors.some((issue) => issue.message.includes("13-Z"))
    ).toBe(true);
  });

  it("bozuk saat ve ters saat aralığını yakalar", () => {
    const workbook = buildTemplateWorkbook();
    replaceSheet(workbook, SHEET_NAMES.scheduleDays, [
      ["Sınıf Adı", "Günler", "Başlangıç", "Bitiş"],
      ["12-A", "Pazartesi", "akşamüstü", "19:50"],
      ["12-B", "Salı", "19:50", "16:40"],
    ]);

    const parsed = parseExcelFile(toBuffer(workbook));
    const messages = parsed.errors.map((issue) => issue.message).join(" ");

    expect(messages).toContain("okunamadı");
    expect(messages).toContain("sonra olmalı");
    expect(parsed.errors.map((issue) => issue.row)).toEqual([2, 3]);
  });

  it("aynı sınıf-gün ikilisinin iki kez tanımlanmasını engeller", () => {
    const workbook = buildTemplateWorkbook();
    replaceSheet(workbook, SHEET_NAMES.scheduleDays, [
      ["Sınıf Adı", "Günler", "Başlangıç", "Bitiş"],
      ["12-A", "Pazartesi", "16:40", "19:50"],
      ["12-A", "Pazartesi", "17:00", "20:00"],
    ]);

    const parsed = parseExcelFile(toBuffer(workbook));

    expect(
      parsed.errors.some((issue) => issue.message.includes("Pazartesi"))
    ).toBe(true);
  });

  it("öğretmene tanımsız ders yazılmışsa hata verir", () => {
    const workbook = buildTemplateWorkbook();
    replaceSheet(workbook, SHEET_NAMES.teachers, [
      ["Ad Soyad", "Verdiği Dersler"],
      ["Ayşe Yılmaz", "Astronomi"],
    ]);

    const parsed = parseExcelFile(toBuffer(workbook));

    expect(
      parsed.errors.some((issue) => issue.message.includes("Astronomi"))
    ).toBe(true);
  });

  it("eksik sayfayı bildirir", () => {
    const workbook = buildTemplateWorkbook();
    workbook.SheetNames = workbook.SheetNames.filter(
      (name) => name !== SHEET_NAMES.classes
    );

    const parsed = parseExcelFile(toBuffer(workbook));

    expect(
      parsed.errors.some((issue) =>
        issue.message.includes(`"${SHEET_NAMES.classes}" sayfası bulunamadı`)
      )
    ).toBe(true);
  });

  it("ders günü olmayan sınıf için uyarı üretir", () => {
    const workbook = buildTemplateWorkbook();
    replaceSheet(workbook, SHEET_NAMES.scheduleDays, [
      ["Sınıf Adı", "Günler", "Başlangıç", "Bitiş"],
      ["12-A", "Pazartesi", "16:40", "19:50"],
    ]);

    const parsed = parseExcelFile(toBuffer(workbook));

    expect(parsed.errors).toEqual([]);
    expect(
      parsed.warnings.some((issue) => issue.message.includes("12-B"))
    ).toBe(true);
  });
});
