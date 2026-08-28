/**
 * V2 PDF / Excel çıktıları — hafta içi ve hafta sonu ayrı tablolar.
 */
import type { AppSettings } from "@/lib/settings";
import {
  academicYearLabel,
  DEFAULT_SETTINGS,
  locationLabel,
} from "@/lib/settings";
import type { ClassScheduleDay } from "@/lib/types";
import { DAY_NAMES } from "@/lib/types";
import {
  buildOgretmenCarsafMatrix,
  buildSinifCarsafMatrix,
  buildSubjectTeacherRows,
  buildTeacherClassSubjectRows,
  formatSinifCarsafPdfHtml,
  formatTeacherProgramCell,
  printHtmlDocument,
  sinifCarsafDataColChars,
  type CarsafMatrix,
  type LessonData,
  type PrintOutcome,
  type RawLessonRow,
} from "@/lib/pdf-generator";
import type { ScheduleProfilesV2 } from "@/lib/v2/profiles";
import {
  dayGroupOf,
  generateProfileSlots,
  WEEKDAY_DAYS,
  WEEKEND_DAYS,
  type DayGroup,
} from "@/lib/v2/timeline";
import type { TimeSlot } from "@/lib/schedule-rules";

const DAY_NAMES_UPPER = [
  "PAZARTESİ",
  "SALI",
  "ÇARŞAMBA",
  "PERŞEMBE",
  "CUMA",
  "CUMARTESİ",
  "PAZAR",
];

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

function formatDate(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
}

function documentHeader(
  settings: AppSettings,
  options: { compact?: boolean } = {}
): string {
  const location = locationLabel(settings);
  const name = settings.institutionName?.trim();
  const logoSize = options.compact ? 34 : 52;
  const nameSize = options.compact ? 12 : 14;
  const logo = settings.logoDataUrl
    ? `<img src="${esc(settings.logoDataUrl)}" width="${logoSize}" height="${logoSize}" style="display:block;margin:0 auto ${options.compact ? 4 : 6}px;object-fit:contain" alt="" />`
    : "";
  const lines = [
    logo,
    `<div style="font-size:${options.compact ? 9 : 11}px">T.C.</div>`,
    location
      ? `<div style="font-size:${options.compact ? 9 : 11}px">${esc(location.toLocaleUpperCase("tr"))}</div>`
      : "",
    name
      ? `<div style="font-size:${nameSize}px;font-weight:bold">${esc(name.toLocaleUpperCase("tr"))}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("");
  return `<div style="text-align:center;line-height:1.3;margin-bottom:${options.compact ? 4 : 8}px">${lines}</div>`;
}

function signatureBlock(title: string, name: string | null): string {
  return `<div style="text-align:center">
    <div style="border-top:1px solid #000;width:150px;margin-bottom:5px"></div>
    ${name?.trim() ? `<div style="font-size:10px">${esc(name.trim())}</div>` : ""}
    <div style="font-weight:bold;font-size:10px">${esc(title)}</div>
  </div>`;
}

const baseStyle = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, "Helvetica Neue", sans-serif; color: #000; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #000; padding: 3px 4px; text-align: center; vertical-align: middle; }
  th { background: #e6e6e6; font-weight: bold; }
  @media print {
    @page { margin: 10mm; }
    .page-break { page-break-before: always; }
  }
`;

export function profileSlotsAsTimeSlots(
  profiles: ScheduleProfilesV2,
  group: DayGroup
): TimeSlot[] {
  const profile = group === "weekday" ? profiles.weekday : profiles.weekend;
  return generateProfileSlots(profile).map((s) => ({
    start: s.start,
    end: s.end,
  }));
}

export function filterLessonsByGroup(
  lessons: LessonData[],
  group: DayGroup
): LessonData[] {
  return lessons.filter((l) => dayGroupOf(l.dayOfWeek) === group);
}

export function activeDaysInGroup(
  lessons: LessonData[],
  group: DayGroup,
  scheduleDays?: ClassScheduleDay[],
  classId?: string
): number[] {
  const pool = group === "weekday" ? WEEKDAY_DAYS : WEEKEND_DAYS;
  if (scheduleDays && classId) {
    const active = new Set(
      scheduleDays
        .filter((d) => d.class_id === classId)
        .map((d) => d.day_of_week)
    );
    return pool.filter((d) => active.has(d));
  }
  const fromLessons = new Set(
    lessons.filter((l) => dayGroupOf(l.dayOfWeek) === group).map((l) => l.dayOfWeek)
  );
  return pool.filter((d) => fromLessons.has(d));
}

export function prepareLessonsV2(
  rawLessons: RawLessonRow[],
  profiles: ScheduleProfilesV2
): LessonData[] {
  const weekdayStarts = new Map(
    generateProfileSlots(profiles.weekday).map((s, i) => [s.start, i])
  );
  const weekendStarts = new Map(
    generateProfileSlots(profiles.weekend).map((s, i) => [s.start, i])
  );

  return rawLessons.map((lesson) => {
    const startTime = lesson.start_time.slice(0, 5);
    const group = dayGroupOf(lesson.day_of_week);
    const indexMap = group === "weekday" ? weekdayStarts : weekendStarts;
    const slotIndex = indexMap.get(startTime) ?? 0;

    return {
      classId: lesson.class_id,
      className: lesson.class?.name || "",
      subjectId: lesson.subject_id,
      subjectName: lesson.subject?.name || "",
      subjectShortName: lesson.subject?.short_name || lesson.subject?.name || "",
      teacherId: lesson.teacher_id,
      teacherName: lesson.teacher?.name || "",
      dayOfWeek: lesson.day_of_week,
      startTime,
      endTime: lesson.end_time.slice(0, 5),
      slotIndex,
    };
  });
}

function carsafSlotHeader(slotIndex: number, slot: TimeSlot, width: string): string {
  return `<th style="width:${width}">${slotIndex + 1}<div style="font-size:7px;font-weight:normal;line-height:1.1">${esc(slot.start)}</div></th>`;
}

function clockRowHeader(slotIndex: number, slot: TimeSlot): string {
  return `<td>
    <div>${slotIndex + 1}. Ders</div>
    <div style="font-size:8px;font-weight:normal;color:#333;margin-top:1px">${esc(slot.start)}–${esc(slot.end)}</div>
  </td>`;
}

function renderSinifCarsafTable(matrix: CarsafMatrix): string {
  if (matrix.days.length === 0 || matrix.slots.length === 0) {
    return `<p style="font-size:11px;color:#666;margin:8px 0">Bu dönemde ders yok.</p>`;
  }
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

  return `<table class="carsaf" style="--label-w:${labelColWidth};--data-w:${dataColWidth}">${tableHtml}</table>`;
}

function renderOgretmenCarsafTable(matrix: CarsafMatrix): string {
  if (matrix.days.length === 0 || matrix.slots.length === 0) {
    return `<p style="font-size:11px;color:#666;margin:8px 0">Bu dönemde ders yok.</p>`;
  }
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
    tableHtml += `<tr><td style="font-weight:bold;font-size:9px">${esc(row.label)}</td>`;
    for (const cell of row.cells) {
      const parts = cell.split("\n").filter(Boolean);
      const html =
        parts.length <= 1
          ? esc(parts[0] ?? "")
          : `${esc(parts[0])}<div style="font-size:6px;color:#333">${esc(parts.slice(1).join(" "))}</div>`;
      tableHtml += `<td style="font-size:7px">${html}</td>`;
    }
    tableHtml += `</tr>`;
  }
  return `<table>${tableHtml}</table>`;
}

function groupSection(
  title: string,
  body: string,
  pageBreakBefore = false
): string {
  return `${pageBreakBefore ? '<div class="page-break"></div>' : ""}
    <h2 style="text-align:center;font-size:14px;margin:12px 0 6px">${esc(title)}</h2>
    ${body}`;
}

function buildGroupMatrix(
  kind: "sinif" | "ogretmen",
  lessons: LessonData[],
  profiles: ScheduleProfilesV2,
  group: DayGroup
): CarsafMatrix | null {
  const groupLessons = filterLessonsByGroup(lessons, group);
  if (groupLessons.length === 0) return null;
  const days = [...(group === "weekday" ? WEEKDAY_DAYS : WEEKEND_DAYS)].filter(
    (d) => groupLessons.some((l) => l.dayOfWeek === d)
  );
  if (days.length === 0) return null;
  const slots = profileSlotsAsTimeSlots(profiles, group);
  const context = { days, slots };
  return kind === "sinif"
    ? buildSinifCarsafMatrix(groupLessons, context)
    : buildOgretmenCarsafMatrix(groupLessons, context);
}

export function generateSinifCarsafPdfV2(
  lessons: LessonData[],
  profiles: ScheduleProfilesV2,
  settings: AppSettings = DEFAULT_SETTINGS
): PrintOutcome {
  const weekday = buildGroupMatrix("sinif", lessons, profiles, "weekday");
  const weekend = buildGroupMatrix("sinif", lessons, profiles, "weekend");
  const sections = [
    weekday
      ? groupSection("HAFTA İÇİ (Pazartesi–Cuma)", renderSinifCarsafTable(weekday))
      : "",
    weekend
      ? groupSection(
          "HAFTA SONU (Cumartesi–Pazar)",
          renderSinifCarsafTable(weekend),
          Boolean(weekday)
        )
      : "",
  ]
    .filter(Boolean)
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle}
    @page { size: landscape; margin: 8mm; }
    body { padding: 10px; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
    .date { text-align: center; font-size: 12px; margin-bottom: 10px; }
    table { table-layout: fixed; width: max-content; max-width: none; }
    th, td { font-size: 8px; padding: 2px 3px; }
    td.row-label { font-size: 9px; font-weight: bold; white-space: nowrap; }
    td.slot-cell { height: 46px; font-size: 7.5px; font-weight: bold; line-height: 1.15; }
    td.slot-cell .subject, td.slot-cell .teacher-line { display: block; white-space: nowrap; overflow: hidden; }
  </style></head><body>
    ${documentHeader(settings, { compact: true })}
    <h1>SINIF ÇARŞAF LİSTESİ (V2)</h1>
    <div class="date">${esc(academicYearLabel(settings))} Eğitim-Öğretim Yılı · ${formatDate()}</div>
    ${sections || "<p>Programda ders yok.</p>"}
  </body></html>`;

  return printHtmlDocument(html, "Sınıf Çarşaf Listesi V2");
}

export function generateOgretmenCarsafPdfV2(
  lessons: LessonData[],
  profiles: ScheduleProfilesV2,
  settings: AppSettings = DEFAULT_SETTINGS
): PrintOutcome {
  const weekday = buildGroupMatrix("ogretmen", lessons, profiles, "weekday");
  const weekend = buildGroupMatrix("ogretmen", lessons, profiles, "weekend");
  const sections = [
    weekday
      ? groupSection(
          "HAFTA İÇİ (Pazartesi–Cuma)",
          renderOgretmenCarsafTable(weekday)
        )
      : "",
    weekend
      ? groupSection(
          "HAFTA SONU (Cumartesi–Pazar)",
          renderOgretmenCarsafTable(weekend),
          Boolean(weekday)
        )
      : "",
  ]
    .filter(Boolean)
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle}
    @page { size: landscape; margin: 8mm; }
    body { padding: 10px; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
    .date { text-align: center; font-size: 12px; margin-bottom: 10px; }
    th, td { font-size: 8px; padding: 2px; }
  </style></head><body>
    ${documentHeader(settings, { compact: true })}
    <h1>ÖĞRETMEN ÇARŞAF LİSTESİ (V2)</h1>
    <div class="date">${esc(academicYearLabel(settings))} Eğitim-Öğretim Yılı · ${formatDate()}</div>
    ${sections || "<p>Programda ders yok.</p>"}
  </body></html>`;

  return printHtmlDocument(html, "Öğretmen Çarşaf Listesi V2");
}

function renderScheduleTable(
  lessons: LessonData[],
  days: number[],
  slots: TimeSlot[],
  cellHtml: (lesson: LessonData | undefined) => string
): string {
  if (days.length === 0 || slots.length === 0) {
    return `<p style="font-size:10px;color:#666;margin:6px 0">Bu dönemde ders günü yok.</p>`;
  }
  let html = `<tr><th style="width:72px">Saat</th>`;
  for (const day of days) html += `<th>${DAY_NAMES[day]}</th>`;
  html += `</tr>`;
  for (let s = 0; s < slots.length; s++) {
    const slot = slots[s];
    html += `<tr>${clockRowHeader(s, slot)}`;
    for (const day of days) {
      const lesson = lessons.find(
        (l) => l.dayOfWeek === day && l.startTime === slot.start
      );
      html += `<td>${cellHtml(lesson)}</td>`;
    }
    html += `</tr>`;
  }
  return `<table style="margin-bottom:12px">${html}</table>`;
}

export function generateSinifDersProgramlariPdfV2(
  lessons: LessonData[],
  profiles: ScheduleProfilesV2,
  scheduleDays: ClassScheduleDay[],
  settings: AppSettings = DEFAULT_SETTINGS
): PrintOutcome {
  const classes = [...new Set(lessons.map((l) => l.className))].sort((a, b) =>
    a.localeCompare(b, "tr")
  );

  let pagesHtml = "";
  for (let ci = 0; ci < classes.length; ci++) {
    const cls = classes[ci];
    const classLessons = lessons.filter((l) => l.className === cls);
    const classId = classLessons[0]?.classId;
    const weekdayDays = activeDaysInGroup(
      classLessons,
      "weekday",
      scheduleDays,
      classId
    );
    const weekendDays = activeDaysInGroup(
      classLessons,
      "weekend",
      scheduleDays,
      classId
    );
    const weekdaySlots = profileSlotsAsTimeSlots(profiles, "weekday");
    const weekendSlots = profileSlotsAsTimeSlots(profiles, "weekend");

    const weekdayTable = renderScheduleTable(
      classLessons,
      weekdayDays,
      weekdaySlots,
      (lesson) =>
        lesson
          ? `<div style="font-size:11px;font-weight:bold">${esc(lesson.subjectShortName)}</div><div style="font-size:9px;color:#333">${esc(lesson.teacherName)}</div>`
          : ""
    );
    const weekendTable =
      weekendDays.length > 0
        ? renderScheduleTable(
            classLessons,
            weekendDays,
            weekendSlots,
            (lesson) =>
              lesson
                ? `<div style="font-size:11px;font-weight:bold">${esc(lesson.subjectShortName)}</div><div style="font-size:9px;color:#333">${esc(lesson.teacherName)}</div>`
                : ""
          )
        : "";

    const subjectRows = buildSubjectTeacherRows(classLessons);
    let infoTable = `<tr><th style="text-align:left;padding-left:8px">Dersin Adı</th><th style="width:60px">HDS</th><th>Öğretmenin Adı</th></tr>`;
    for (const s of subjectRows) {
      infoTable += `<tr><td style="text-align:left;padding-left:8px">${esc(s.name)}</td><td>${s.hours}</td><td>${esc(s.teacher)}</td></tr>`;
    }

    pagesHtml += `
      ${ci > 0 ? '<div class="page-break"></div>' : ""}
      <div class="page">
        ${documentHeader(settings)}
        <h2 style="text-align:center;font-size:15px;margin-bottom:3px">${esc(cls)} SINIFI HAFTALIK DERS PROGRAMI (V2)</h2>
        <div style="text-align:center;font-size:10px;margin-bottom:12px">${esc(academicYearLabel(settings))} Eğitim-Öğretim Yılı · ${formatDate()}</div>
        <div style="font-weight:bold;font-size:11px;margin-bottom:4px">Hafta içi (Pazartesi–Cuma)</div>
        ${weekdayTable}
        ${
          weekendTable
            ? `<div style="font-weight:bold;font-size:11px;margin:10px 0 4px">Hafta sonu (Cumartesi–Pazar)</div>${weekendTable}`
            : ""
        }
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

  return printHtmlDocument(html, "Sınıf Ders Programları V2");
}

export function generateOgretmenProgramlariPdfV2(
  lessons: LessonData[],
  profiles: ScheduleProfilesV2,
  scheduleDays: ClassScheduleDay[],
  settings: AppSettings = DEFAULT_SETTINGS,
  teacherOffDays?: Map<string, number[]>
): PrintOutcome {
  const teacherNames = [
    ...new Set(lessons.filter((l) => l.teacherName).map((l) => l.teacherName)),
  ].sort((a, b) => a.localeCompare(b, "tr"));
  const academicYear = academicYearLabel(settings);

  let pagesHtml = "";
  for (let ti = 0; ti < teacherNames.length; ti++) {
    const teacher = teacherNames[ti];
    const tLessons = lessons.filter((l) => l.teacherName === teacher);
    const totalHours = tLessons.length;
    const classIds = new Set(tLessons.map((l) => l.classId));
    const teacherDays = scheduleDays.filter((day) => classIds.has(day.class_id));

    const weekdayFromSchedule = [
      ...new Set(
        teacherDays
          .map((d) => d.day_of_week)
          .filter((d) => d >= 0 && d <= 4)
      ),
    ].sort((a, b) => a - b);
    const weekendFromSchedule = [
      ...new Set(
        teacherDays
          .map((d) => d.day_of_week)
          .filter((d) => d >= 5)
      ),
    ].sort((a, b) => a - b);

    const wd =
      weekdayFromSchedule.length > 0
        ? weekdayFromSchedule
        : [...new Set(tLessons.filter((l) => l.dayOfWeek <= 4).map((l) => l.dayOfWeek))].sort(
              (a, b) => a - b
            );
    const we =
      weekendFromSchedule.length > 0
        ? weekendFromSchedule
        : [...new Set(tLessons.filter((l) => l.dayOfWeek >= 5).map((l) => l.dayOfWeek))].sort(
            (a, b) => a - b
          );

    const weekdayTable = renderScheduleTable(
      tLessons,
      wd,
      profileSlotsAsTimeSlots(profiles, "weekday"),
      (lesson) => (lesson ? formatTeacherProgramCell(lesson) : "")
    );
    const weekendTable =
      we.length > 0
        ? renderScheduleTable(
            tLessons,
            we,
            profileSlotsAsTimeSlots(profiles, "weekend"),
            (lesson) => (lesson ? formatTeacherProgramCell(lesson) : "")
          )
        : "";

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
        <div style="font-weight:bold;font-size:11px;margin-bottom:4px">Hafta içi (Pazartesi–Cuma)</div>
        ${weekdayTable}
        ${
          weekendTable
            ? `<div style="font-weight:bold;font-size:11px;margin:10px 0 4px">Hafta sonu (Cumartesi–Pazar)</div>${weekendTable}`
            : ""
        }
        <div style="font-weight:bold;font-size:11px;margin:4px 0 5px">Sınıf / Ders Dağılımı</div>
        <table style="width:auto;min-width:55%;margin-bottom:12px">${workloadTable}</table>
        <div style="font-size:10px;margin-bottom:3px">Toplam Ders Saati: <strong>${totalHours}</strong></div>
        <div style="font-size:10px;margin-bottom:3px">İzin Günleri: <strong>${esc(offDaysLabel)}</strong></div>
        <div style="font-size:10px;margin-bottom:30px">Sınıf Rehber Öğretmenliği: -</div>
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
    td, th { font-size: 10px; padding: 4px 5px; }
    .page { min-height: 90vh; display: flex; flex-direction: column; }
  </style></head><body>${pagesHtml}</body></html>`;

  return printHtmlDocument(html, "Öğretmen Programları V2");
}

export async function downloadSinifCarsafExcelV2(
  lessons: LessonData[],
  profiles: ScheduleProfilesV2,
  fileName = "sinif-carsaf-v2.xlsx"
) {
  const XLSX = await import("xlsx");
  const { carsafMatrixToSheetRows, formatSinifCarsafExcelCell } = await import(
    "@/lib/carsaf-excel"
  );
  const workbook = XLSX.utils.book_new();

  const append = (group: DayGroup, sheetName: string) => {
    const matrix = buildGroupMatrix("sinif", lessons, profiles, group);
    if (!matrix) return;
    const colChars = sinifCarsafDataColChars(matrix, 2);
    const prepared = {
      ...matrix,
      rows: matrix.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) =>
          formatSinifCarsafExcelCell(cell, colChars)
        ),
      })),
    };
    const { rows, merges } = carsafMatrixToSheetRows(prepared);
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!merges"] = merges;
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  };

  append("weekday", "Hafta içi");
  append("weekend", "Hafta sonu");
  if ((workbook.SheetNames?.length ?? 0) === 0) {
    throw new Error("İndirilecek ders yok");
  }
  XLSX.writeFile(workbook, fileName, { compression: true });
}

export async function downloadOgretmenCarsafExcelV2(
  lessons: LessonData[],
  profiles: ScheduleProfilesV2,
  fileName = "ogretmen-carsaf-v2.xlsx"
) {
  const XLSX = await import("xlsx");
  const { carsafMatrixToSheetRows } = await import("@/lib/carsaf-excel");
  const workbook = XLSX.utils.book_new();

  const append = (group: DayGroup, sheetName: string) => {
    const matrix = buildGroupMatrix("ogretmen", lessons, profiles, group);
    if (!matrix) return;
    const { rows, merges } = carsafMatrixToSheetRows(matrix);
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!merges"] = merges;
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  };

  append("weekday", "Hafta içi");
  append("weekend", "Hafta sonu");
  if ((workbook.SheetNames?.length ?? 0) === 0) {
    throw new Error("İndirilecek ders yok");
  }
  XLSX.writeFile(workbook, fileName, { compression: true });
}
