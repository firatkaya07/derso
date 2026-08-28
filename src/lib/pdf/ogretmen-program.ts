import { DAY_NAMES } from "../types";
import {
  academicYearLabel,
  baseStyle,
  buildTeacherClassSubjectRows,
  clockRowHeader,
  DEFAULT_SETTINGS,
  documentHeader,
  esc,
  formatDate,
  formatTeacherProgramCell,
  getActiveDays,
  openPrintWindow,
  resolveTimeSlots,
  type LessonData,
  type PdfScheduleContext,
  type PrintOutcome,
} from "./shared";
import type { AppSettings } from "../settings";

export function generateOgretmenProgramlariPdf(
  lessons: LessonData[],
  settings: AppSettings = DEFAULT_SETTINGS,
  context: PdfScheduleContext = {},
  teacherOffDays?: Map<string, number[]>
): PrintOutcome {
  const teacherNames = [
    ...new Set(lessons.filter((l) => l.teacherName).map((l) => l.teacherName)),
  ].sort((a, b) => a.localeCompare(b, "tr"));
  const scheduleDays = context.scheduleDays ?? [];
  const academicYear = academicYearLabel(settings);

  let pagesHtml = "";

  for (let ti = 0; ti < teacherNames.length; ti++) {
    const teacher = teacherNames[ti];
    const tLessons = lessons.filter((l) => l.teacherName === teacher);
    const totalHours = tLessons.length;
    const classIds = new Set(tLessons.map((l) => l.classId));
    const teacherDays = scheduleDays.filter((day) => classIds.has(day.class_id));
    const activeDays =
      teacherDays.length > 0
        ? [...new Set(teacherDays.map((day) => day.day_of_week))].sort(
            (a, b) => a - b
          )
        : getActiveDays(tLessons);
    const slots = resolveTimeSlots(teacherDays, tLessons, context.timing);

    const dayColWidth =
      activeDays.length > 0
        ? `${Math.floor((100 - 12) / activeDays.length)}%`
        : "auto";

    let scheduleTable = `<tr><th style="width:12%">Saat</th>`;
    for (const day of activeDays) {
      scheduleTable += `<th style="width:${dayColWidth}">${DAY_NAMES[day]}</th>`;
    }
    scheduleTable += `</tr>`;

    for (let s = 0; s < slots.length; s++) {
      const slot = slots[s];
      scheduleTable += `<tr>${clockRowHeader(s, slot)}`;
      for (const day of activeDays) {
        const lesson = tLessons.find(
          (l) => l.dayOfWeek === day && l.startTime === slot.start
        );
        if (lesson) {
          scheduleTable += `<td>${formatTeacherProgramCell(lesson)}</td>`;
        } else {
          scheduleTable += `<td></td>`;
        }
      }
      scheduleTable += `</tr>`;
    }

    const workloadRows = buildTeacherClassSubjectRows(tLessons);
    let workloadTable = `<tr><th style="text-align:left;padding-left:8px">Sınıf</th><th style="text-align:left;padding-left:8px">Ders</th><th style="width:70px">Ders Saati</th></tr>`;
    for (const row of workloadRows) {
      workloadTable += `<tr><td style="text-align:left;padding-left:8px">${esc(row.className)}</td><td style="text-align:left;padding-left:8px">${esc(row.subjectName)}</td><td>${row.hours}</td></tr>`;
    }

    const teacherId = tLessons[0]?.teacherId;
    const offDays = teacherId ? (teacherOffDays?.get(teacherId) ?? []) : [];
    const offDaysLabel =
      offDays.length > 0
        ? offDays
            .slice()
            .sort((a, b) => a - b)
            .map((d) => DAY_NAMES[d])
            .join(", ")
        : "-";

    pagesHtml += `
      ${ti > 0 ? '<div class="page-break"></div>' : ""}
      <div class="page">
        ${documentHeader(settings)}
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <div>
            <div style="font-size:10px">Sayı  : .......................</div>
            <div style="font-size:10px">Konu : Haftalık Ders Programı</div>
          </div>
          <div style="font-size:10px">Tarih: ${formatDate()}</div>
        </div>
        <div style="font-weight:bold;font-size:12px;margin:15px 0 8px">Sayın ${esc(teacher)},</div>
        <div style="font-size:10px;line-height:1.5;margin-bottom:5px">
          ${esc(academicYear)} Eğitim-Öğretim Yılında ${formatDate()} tarihinden itibaren uygulanacak programda haftalık ders dağılımınız aşağıya çıkartılmıştır.
        </div>
        <div style="font-size:10px;margin-bottom:12px">Bilgilerinizi ve gereğini rica ederim.</div>
        <table style="margin-bottom:12px;table-layout:fixed">${scheduleTable}</table>
        <div style="font-weight:bold;font-size:11px;margin:4px 0 5px">Sınıf / Ders Dağılımı</div>
        <table style="width:auto;min-width:55%;margin-bottom:12px">${workloadTable}</table>
        <div style="font-size:10px;margin-bottom:3px">Toplam Ders Saati: <strong>${totalHours}</strong></div>
        <div style="font-size:10px;margin-bottom:3px">İzin Günleri: <strong>${esc(offDaysLabel)}</strong></div>
        <div style="font-size:10px;margin-bottom:3px">Sınıf Rehber Öğretmenliği: -</div>
        <div style="font-size:10px;margin-bottom:30px">Nöbet Görevi: -</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding-top:30px">
          <div style="border:1px solid #000;padding:8px 10px;width:140px;font-size:9px">
            <div style="font-weight:bold;margin-bottom:4px">ASLINI ALDIM</div>
            <div>Tarih: ..... / ..... / .........</div>
            <div>İmza:</div>
          </div>
          <div style="text-align:center">
            <div style="font-weight:bold;font-size:10px">OLUR</div>
            <div style="font-size:9px;margin:4px 0">..... / ..... / .........</div>
            ${settings.principalName?.trim() ? `<div style="font-size:9px">${esc(settings.principalName.trim())}</div>` : ""}
            <div style="font-weight:bold;font-size:9px">Kurum Müdürü</div>
          </div>
        </div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle}
    @page { size: portrait; margin: 12mm 18mm; }
    body { padding: 10px 20px; }
    td, th { font-size: 10px; padding: 5px 6px; }
    .page { min-height: 93vh; display: flex; flex-direction: column; }
  </style></head><body>${pagesHtml}</body></html>`;

  return openPrintWindow(html, "Öğretmen Programları");
}
