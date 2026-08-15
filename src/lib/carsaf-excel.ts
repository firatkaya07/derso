import * as XLSX from "xlsx";
import { DAY_NAMES_SHORT } from "./types";
import {
  buildOgretmenCarsafMatrix,
  buildSinifCarsafMatrix,
  sinifCarsafDataColChars,
  wrapWordsToLines,
  type CarsafMatrix,
  type LessonData,
  type PdfScheduleContext,
} from "./pdf-generator";

function dayHeader(day: number): string {
  return (DAY_NAMES_SHORT[day] ?? `G${day}`).toLocaleUpperCase("tr");
}

/**
 * Çarşaf matrisini Excel satırlarına çevirir.
 * İlk satır: gün adları (birleşik sütunlar), ikinci satır: ders sırası + saat.
 */
export function carsafMatrixToSheetRows(matrix: CarsafMatrix): {
  rows: (string | number)[][];
  merges: XLSX.Range[];
} {
  const slotCount = Math.max(matrix.slots.length, 1);
  const header1: (string | number)[] = [matrix.labelHeader];
  const header2: (string | number)[] = [""];
  const merges: XLSX.Range[] = [];

  let col = 1;
  for (const day of matrix.days) {
    header1.push(dayHeader(day));
    for (let s = 1; s < slotCount; s++) header1.push("");
    if (slotCount > 1) {
      merges.push({
        s: { r: 0, c: col },
        e: { r: 0, c: col + slotCount - 1 },
      });
    }
    for (let s = 0; s < slotCount; s++) {
      const slot = matrix.slots[s];
      header2.push(slot ? `${s + 1} (${slot.start})` : `${s + 1}`);
    }
    col += slotCount;
  }

  if (matrix.days.length === 0) {
    header1.push("");
    header2.push("");
  }

  const dataRows = matrix.rows.map((row) => [row.label, ...row.cells]);
  return { rows: [header1, header2, ...dataRows], merges };
}

function downloadCarsafWorkbook(
  matrix: CarsafMatrix,
  sheetName: string,
  fileName: string,
  dataColChars?: number
) {
  const { rows, merges } = carsafMatrixToSheetRows(matrix);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = merges;

  const labelWch = Math.max(
    matrix.labelHeader.length,
    8,
    ...matrix.rows.map((r) => r.label.length)
  );
  const dataWch = Math.max(dataColChars ?? 10, 10) + 1;
  sheet["!cols"] = [
    { wch: labelWch + 1 },
    ...Array.from({ length: Math.max(rows[0].length - 1, 0) }, () => ({
      wch: dataWch,
    })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName, { compression: true });
}

/**
 * Excel hücresi: ders üst satır, öğretmen kelime ortasından bölünmeden alt satır(lar).
 */
export function formatSinifCarsafExcelCell(
  plain: string,
  colChars: number
): string {
  const parts = plain.split("\n").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const subject = parts[0];
  const teacher = parts.slice(1).join(" ").trim();
  const teacherLines = wrapWordsToLines(teacher, colChars, 2);
  return [subject, ...teacherLines].join("\n");
}

export function downloadSinifCarsafExcel(
  lessons: LessonData[],
  context: PdfScheduleContext = {},
  fileName = "sinif-carsaf-listesi.xlsx"
) {
  const matrix = buildSinifCarsafMatrix(lessons, context);
  const colChars = sinifCarsafDataColChars(matrix, 2);
  downloadCarsafWorkbook(
    {
      ...matrix,
      rows: matrix.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) =>
          formatSinifCarsafExcelCell(cell, colChars)
        ),
      })),
    },
    "Sınıf Çarşaf",
    fileName,
    colChars
  );
}

export function downloadOgretmenCarsafExcel(
  lessons: LessonData[],
  context: PdfScheduleContext = {},
  fileName = "ogretmen-carsaf-listesi.xlsx"
) {
  const matrix = buildOgretmenCarsafMatrix(lessons, context);
  const lineLens = matrix.rows.flatMap((r) =>
    r.cells.flatMap((c) => c.split("\n").map((line) => line.length))
  );
  const colChars = Math.max(10, ...lineLens);
  downloadCarsafWorkbook(matrix, "Öğretmen Çarşaf", fileName, colChars);
}
