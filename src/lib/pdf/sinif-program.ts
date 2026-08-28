import { DAY_NAMES } from "../types";
import {
  academicYearLabel,
  baseStyle,
  buildSubjectTeacherRows,
  clockRowHeader,
  DEFAULT_SETTINGS,
  documentHeader,
  esc,
  formatDate,
  getActiveDays,
  openPrintWindow,
  resolveTimeSlots,
  signatureBlock,
  type LessonData,
  type PdfScheduleContext,
  type PrintOutcome,
} from "./shared";
import type { AppSettings } from "../settings";

export function generateSinifDersProgramlariPdf(
  lessons: LessonData[],
  settings: AppSettings = DEFAULT_SETTINGS,
  context: PdfScheduleContext = {}
): PrintOutcome {
  const classes = [...new Set(lessons.map((l) => l.className))].sort((a, b) =>
    a.localeCompare(b, "tr")
  );
  const scheduleDays = context.scheduleDays ?? [];

  let pagesHtml = "";

  for (let ci = 0; ci < classes.length; ci++) {
    const cls = classes[ci];
    const classLessons = lessons.filter((l) => l.className === cls);
    const classId = classLessons[0]?.classId;
    const classDays = classId
      ? scheduleDays.filter((day) => day.class_id === classId)
      : [];
    const activeDays =
      classDays.length > 0
        ? [...new Set(classDays.map((day) => day.day_of_week))].sort(
            (a, b) => a - b
          )
        : getActiveDays(classLessons);
    const slots = resolveTimeSlots(classDays, classLessons, context.timing);

    let scheduleTable = `<tr><th style="width:72px">Saat</th>`;
    for (const day of activeDays) {
      scheduleTable += `<th>${DAY_NAMES[day]}</th>`;
    }
    scheduleTable += `</tr>`;

    for (let s = 0; s < slots.length; s++) {
      const slot = slots[s];
      scheduleTable += `<tr>${clockRowHeader(s, slot)}`;
      for (const day of activeDays) {
        const lesson = classLessons.find(
          (l) => l.dayOfWeek === day && l.startTime === slot.start
        );
        if (lesson) {
          scheduleTable += `<td><div style="font-size:11px;font-weight:bold">${esc(lesson.subjectShortName)}</div><div style="font-size:9px;color:#333">${esc(lesson.teacherName)}</div></td>`;
        } else {
          scheduleTable += `<td></td>`;
        }
      }
      scheduleTable += `</tr>`;
    }

    const subjectRows = buildSubjectTeacherRows(classLessons);

    let infoTable = `<tr><th style="text-align:left;padding-left:8px">Dersin Adı</th><th style="width:60px">HDS</th><th>Öğretmenin Adı</th></tr>`;
    for (const s of subjectRows) {
      infoTable += `<tr><td style="text-align:left;padding-left:8px">${esc(s.name)}</td><td>${s.hours}</td><td>${esc(s.teacher)}</td></tr>`;
    }

    pagesHtml += `
      ${ci > 0 ? '<div class="page-break"></div>' : ""}
      <div class="page">
        ${documentHeader(settings)}
        <h2 style="text-align:center;font-size:15px;margin-bottom:3px">${esc(cls)} SINIFI HAFTALIK DERS PROGRAMI</h2>
        <div style="text-align:center;font-size:10px;margin-bottom:12px">${esc(academicYearLabel(settings))} Eğitim-Öğretim Yılı · ${formatDate()}</div>
        <table style="margin-bottom:15px">${scheduleTable}</table>
        <div style="font-weight:bold;font-size:11px;margin-bottom:5px">Ders ve Öğretmen Bilgileri</div>
        <table style="width:auto;min-width:60%">${infoTable}</table>
        <div style="position:relative;margin-top:60px;display:flex;justify-content:space-between;padding:0 30px">
          ${signatureBlock("Müdür Yardımcısı", settings.vicePrincipalName)}
          ${signatureBlock("Kurum Müdürü", settings.principalName)}
        </div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle}
    @page { size: portrait; margin: 15mm 20mm; }
    body { padding: 15px 25px; }
    td, th { font-size: 10px; padding: 5px 6px; }
    .page { min-height: 90vh; }
  </style></head><body>${pagesHtml}</body></html>`;

  return openPrintWindow(html, "Sınıf Ders Programları");
}
