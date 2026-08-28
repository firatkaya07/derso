import {
  academicYearLabel,
  baseStyle,
  buildSinifCarsafMatrix,
  carsafSlotHeader,
  DAY_NAMES_UPPER,
  DEFAULT_SETTINGS,
  documentHeader,
  esc,
  formatDate,
  formatSinifCarsafPdfHtml,
  openPrintWindow,
  sinifCarsafDataColChars,
  type LessonData,
  type PdfScheduleContext,
  type PrintOutcome,
} from "./shared";
import type { AppSettings } from "../settings";

export function generateSinifCarsafPdf(
  lessons: LessonData[],
  settings: AppSettings = DEFAULT_SETTINGS,
  context: PdfScheduleContext = {}
): PrintOutcome {
  const matrix = buildSinifCarsafMatrix(lessons, context);
  const colChars = sinifCarsafDataColChars(matrix, 2);
  const labelCh = Math.max(
    matrix.labelHeader.length,
    4,
    ...matrix.rows.map((r) => r.label.length)
  );
  const dataColWidth = `${colChars + 1}ch`;
  const labelColWidth = `${labelCh + 1}ch`;

  let tableHtml = `<tr><th rowspan="2" style="width:${labelColWidth}">${esc(matrix.labelHeader)}</th>`;
  for (const day of matrix.days) {
    tableHtml += `<th colspan="${Math.max(matrix.slots.length, 1)}">${DAY_NAMES_UPPER[day]}</th>`;
  }
  tableHtml += `</tr><tr>`;
  for (let d = 0; d < matrix.days.length; d++) {
    for (let s = 0; s < matrix.slots.length; s++) {
      tableHtml += carsafSlotHeader(s, matrix.slots[s], dataColWidth);
    }
  }
  tableHtml += `</tr>`;

  for (const row of matrix.rows) {
    tableHtml += `<tr><td class="row-label">${esc(row.label)}</td>`;
    for (const cell of row.cells) {
      tableHtml += `<td class="slot-cell">${formatSinifCarsafPdfHtml(cell, colChars, "6.5px")}</td>`;
    }
    tableHtml += `</tr>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle}
    @page { size: landscape; margin: 8mm; }
    body { padding: 10px; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
    .date { text-align: center; font-size: 12px; margin-bottom: 10px; }
    table { table-layout: fixed; width: max-content; max-width: none; }
    th, td { font-size: 8px; padding: 2px 3px; overflow: hidden; word-break: normal; }
    td.row-label {
      font-size: 9px;
      font-weight: bold;
      width: ${labelColWidth};
      white-space: nowrap;
    }
    td.slot-cell {
      width: ${dataColWidth};
      min-width: ${dataColWidth};
      height: 46px;
      font-size: 7.5px;
      font-weight: bold;
      line-height: 1.15;
      vertical-align: middle;
      white-space: normal;
      overflow-wrap: normal;
      word-break: keep-all;
    }
    td.slot-cell .subject,
    td.slot-cell .teacher-line {
      display: block;
      white-space: nowrap;
      overflow: hidden;
    }
  </style></head><body>
    ${documentHeader(settings, { compact: true })}
    <h1>SINIF ÇARŞAF LİSTESİ</h1>
    <div class="date">${esc(academicYearLabel(settings))} Eğitim-Öğretim Yılı · ${formatDate()}</div>
    <table>${tableHtml}</table>
  </body></html>`;

  return openPrintWindow(html, "Sınıf Çarşaf Listesi");
}
