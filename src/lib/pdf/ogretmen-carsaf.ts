import {
  academicYearLabel,
  baseStyle,
  buildOgretmenCarsafMatrix,
  carsafSlotHeader,
  DAY_NAMES_UPPER,
  DEFAULT_SETTINGS,
  documentHeader,
  esc,
  formatCarsafMultilineHtml,
  formatDate,
  openPrintWindow,
  type LessonData,
  type PdfScheduleContext,
  type PrintOutcome,
} from "./shared";
import type { AppSettings } from "../settings";

export function generateOgretmenCarsafPdf(
  lessons: LessonData[],
  settings: AppSettings = DEFAULT_SETTINGS,
  context: PdfScheduleContext = {}
): PrintOutcome {
  const matrix = buildOgretmenCarsafMatrix(lessons, context);

  let tableHtml = `<tr><th rowspan="2" style="width:110px">${esc(matrix.labelHeader)}</th>`;
  for (const day of matrix.days) {
    tableHtml += `<th colspan="${Math.max(matrix.slots.length, 1)}">${DAY_NAMES_UPPER[day]}</th>`;
  }
  tableHtml += `</tr><tr>`;
  for (let d = 0; d < matrix.days.length; d++) {
    for (let s = 0; s < matrix.slots.length; s++) {
      tableHtml += carsafSlotHeader(s, matrix.slots[s], "24px");
    }
  }
  tableHtml += `</tr>`;

  for (const row of matrix.rows) {
    tableHtml += `<tr><td style="font-size:9px;text-align:left;padding-left:5px">${esc(row.label)}</td>`;
    for (const cell of row.cells) {
      tableHtml += `<td style="font-size:7px">${formatCarsafMultilineHtml(cell, "6px")}</td>`;
    }
    tableHtml += `</tr>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle}
    @page { size: landscape; margin: 8mm; }
    body { padding: 10px; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
    .date { text-align: center; font-size: 12px; margin-bottom: 10px; }
  </style></head><body>
    ${documentHeader(settings, { compact: true })}
    <h1>ÖĞRETMEN ÇARŞAF LİSTESİ</h1>
    <div class="date">${esc(academicYearLabel(settings))} Eğitim-Öğretim Yılı · ${formatDate()}</div>
    <table>${tableHtml}</table>
  </body></html>`;

  return openPrintWindow(html, "Öğretmen Çarşaf Listesi");
}
