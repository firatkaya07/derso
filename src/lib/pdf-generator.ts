import { DAY_NAMES } from "./types";
import { buildTimeSlots, slotsForDay, type TimeSlot } from "./schedule-rules";
import type { ClassScheduleDay, SlotTiming } from "./types";
import {
  academicYearLabel,
  DEFAULT_SETTINGS,
  locationLabel,
  type AppSettings,
} from "./settings";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Çıktı HTML'i blob URL'i üzerinden açıldığı için uygulamanın origin'ini
 * devralır; ders veya öğretmen adına yazılmış bir etiket orada çalışabilirdi.
 * Kullanıcıdan gelen her metin bu fonksiyondan geçmelidir.
 */
function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

const DAY_NAMES_UPPER = [
  "PAZARTESİ",
  "SALI",
  "ÇARŞAMBA",
  "PERŞEMBE",
  "CUMA",
  "CUMARTESİ",
  "PAZAR",
];

export interface LessonData {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectShortName: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotIndex: number;
}

function formatDate(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
}

/**
 * Belgelerin ortak başlığı: logo (varsa), T.C., il/ilçe, kurum adı.
 * Logo T.C. satırının üstünde, ortalanmış durur. Bilgiler Genel Tanımlar
 * sayfasından gelir; girilmemiş alanlar atlanır, böylece kurulumunu
 * tamamlamamış bir kurumda çıktı boş satırlarla dolmaz.
 */
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

/** İmza bloğu; ad girilmemişse yalnızca unvan yazılır. */
function signatureBlock(title: string, name: string | null): string {
  return `<div style="text-align:center">
    <div style="border-top:1px solid #000;width:150px;margin-bottom:5px"></div>
    ${name?.trim() ? `<div style="font-size:10px">${esc(name.trim())}</div>` : ""}
    <div style="font-weight:bold;font-size:10px">${esc(title)}</div>
  </div>`;
}

function getActiveDays(lessons: LessonData[]): number[] {
  const days = new Set<number>();
  for (const l of lessons) days.add(l.dayOfWeek);
  return [...days].sort((a, b) => a - b);
}

/**
 * Çıktı ızgarasının satırları. Önce sınıf saatlerinden üretilir; yoksa
 * mevcut derslerin başlangıç–bitiş saatleri kullanılır.
 */
function resolveTimeSlots(
  scheduleDays: ClassScheduleDay[],
  lessons: LessonData[],
  timing?: SlotTiming
): TimeSlot[] {
  const fromSchedule = buildTimeSlots(scheduleDays, timing);
  if (fromSchedule.length > 0) return fromSchedule;

  const unique = new Map<string, TimeSlot>();
  for (const lesson of lessons) {
    unique.set(lesson.startTime, {
      start: lesson.startTime,
      end: lesson.endTime,
    });
  }
  return [...unique.values()].sort((a, b) => a.start.localeCompare(b.start));
}

/** Program tablolarının sol sütunu: sıra + gerçek saat aralığı. */
function clockRowHeader(slotIndex: number, slot: TimeSlot): string {
  return `<td>
    <div>${slotIndex + 1}. Ders</div>
    <div style="font-size:8px;font-weight:normal;color:#333;margin-top:1px">${esc(slot.start)}–${esc(slot.end)}</div>
  </td>`;
}

/** Çarşaf listelerinin alt başlığı: sıra + başlangıç saati. */
function carsafSlotHeader(slotIndex: number, slot: TimeSlot, width: string): string {
  return `<th style="width:${width}">${slotIndex + 1}<div style="font-size:7px;font-weight:normal;line-height:1.1">${esc(slot.start)}</div></th>`;
}

export interface PdfScheduleContext {
  scheduleDays?: ClassScheduleDay[];
  timing?: SlotTiming;
}

export interface RawLessonRow {
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  class?: { id: string; name: string };
  subject?: { id: string; name: string; short_name: string | null };
  teacher?: { id: string; name: string };
}

/**
 * Ders satırlarını çıktı biçimine çevirir ve her dersin o günün kaçıncı ders
 * saati olduğunu hesaplar.
 *
 * Sıra numarası sınıf-gün çifti bazında hesaplanır: hafta içi 16:40'ta,
 * hafta sonu 08:30'da başlayan bir sınıfta her iki ders de "1. Ders"tir.
 * Önceden sınıfın en erken başlangıcı ile en geç bitişinden tek bir liste
 * üretiliyordu ve farklı saatte başlayan günler yanlış satıra düşüyordu.
 */
export function prepareLessons(
  rawLessons: RawLessonRow[],
  scheduleDays: ClassScheduleDay[],
  timing?: SlotTiming
): LessonData[] {
  const slotsByClassDay = new Map<string, string[]>();
  for (const day of scheduleDays) {
    slotsByClassDay.set(
      `${day.class_id}:${day.day_of_week}`,
      slotsForDay(day, timing).map((slot) => slot.start)
    );
  }

  return rawLessons.map((lesson) => {
    const slots = slotsByClassDay.get(
      `${lesson.class_id}:${lesson.day_of_week}`
    );
    const startTime = lesson.start_time.slice(0, 5);
    const slotIndex = slots ? slots.indexOf(startTime) : -1;

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
      slotIndex: slotIndex >= 0 ? slotIndex : 0,
    };
  });
}

/** Çıktının nasıl teslim edildiği; arayüz kullanıcıyı buna göre bilgilendirir. */
export type PrintOutcome = "printed" | "downloaded";

/**
 * Çıktıyı yeni sekmede açıp yazdırma penceresini tetikler. Kullanıcı oradan
 * "PDF olarak kaydet" seçebilir. Açılır pencere engelliyse belge HTML dosyası
 * olarak indirilir.
 */
function openPrintWindow(html: string, title: string): PrintOutcome {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");

  if (printWindow) {
    printWindow.onload = () => {
      printWindow.document.title = title;
      setTimeout(() => printWindow.print(), 300);
    };
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return "printed";
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/\s+/g, "_")}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "downloaded";
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

// 1. SINIF ÇARŞAF LİSTESİ
export function generateSinifCarsafPdf(
  lessons: LessonData[],
  settings: AppSettings = DEFAULT_SETTINGS,
  context: PdfScheduleContext = {}
): PrintOutcome {
  const activeDays = getActiveDays(lessons);
  const slots = resolveTimeSlots(
    context.scheduleDays ?? [],
    lessons,
    context.timing
  );
  const classes = [...new Set(lessons.map((l) => l.className))].sort((a, b) =>
    a.localeCompare(b, "tr")
  );

  let tableHtml = `<tr><th rowspan="2" style="width:100px">Sınıf</th>`;
  for (const day of activeDays) {
    tableHtml += `<th colspan="${Math.max(slots.length, 1)}">${DAY_NAMES_UPPER[day]}</th>`;
  }
  tableHtml += `</tr><tr>`;
  for (let d = 0; d < activeDays.length; d++) {
    for (let s = 0; s < slots.length; s++) {
      tableHtml += carsafSlotHeader(s, slots[s], "30px");
    }
  }
  tableHtml += `</tr>`;

  for (const cls of classes) {
    tableHtml += `<tr><td style="font-size:10px">${esc(cls)}</td>`;
    for (const day of activeDays) {
      for (const slot of slots) {
        const lesson = lessons.find(
          (l) =>
            l.className === cls &&
            l.dayOfWeek === day &&
            l.startTime === slot.start
        );
        tableHtml += `<td style="font-size:9px">${lesson ? esc(lesson.subjectShortName) : ""}</td>`;
      }
    }
    tableHtml += `</tr>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle}
    @page { size: landscape; margin: 8mm; }
    body { padding: 10px; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
    .date { text-align: center; font-size: 12px; margin-bottom: 10px; }
    td, th { font-size: 9px; padding: 2px 3px; }
  </style></head><body>
    ${documentHeader(settings, { compact: true })}
    <h1>SINIF ÇARŞAF LİSTESİ</h1>
    <div class="date">${esc(academicYearLabel(settings))} Eğitim-Öğretim Yılı · ${formatDate()}</div>
    <table>${tableHtml}</table>
  </body></html>`;

  return openPrintWindow(html, "Sınıf Çarşaf Listesi");
}

// 2. ÖĞRETMEN ÇARŞAF LİSTESİ
export function generateOgretmenCarsafPdf(
  lessons: LessonData[],
  settings: AppSettings = DEFAULT_SETTINGS,
  context: PdfScheduleContext = {}
): PrintOutcome {
  const activeDays = getActiveDays(lessons);
  const slots = resolveTimeSlots(
    context.scheduleDays ?? [],
    lessons,
    context.timing
  );
  const teacherNames = [
    ...new Set(lessons.filter((l) => l.teacherName).map((l) => l.teacherName)),
  ].sort((a, b) => a.localeCompare(b, "tr"));

  let tableHtml = `<tr><th rowspan="2" style="width:110px">Öğretmen</th>`;
  for (const day of activeDays) {
    tableHtml += `<th colspan="${Math.max(slots.length, 1)}">${DAY_NAMES_UPPER[day]}</th>`;
  }
  tableHtml += `</tr><tr>`;
  for (let d = 0; d < activeDays.length; d++) {
    for (let s = 0; s < slots.length; s++) {
      tableHtml += carsafSlotHeader(s, slots[s], "24px");
    }
  }
  tableHtml += `</tr>`;

  for (const teacher of teacherNames) {
    tableHtml += `<tr><td style="font-size:9px;text-align:left;padding-left:5px">${esc(teacher)}</td>`;
    for (const day of activeDays) {
      for (const slot of slots) {
        const lesson = lessons.find(
          (l) =>
            l.teacherName === teacher &&
            l.dayOfWeek === day &&
            l.startTime === slot.start
        );
        tableHtml += `<td style="font-size:7px">${lesson ? esc(lesson.className) : ""}</td>`;
      }
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

// 3. SINIF DERS PROGRAMLARI
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

    const subjectMap = new Map<
      string,
      { name: string; hours: number; teacher: string }
    >();
    for (const l of classLessons) {
      if (!subjectMap.has(l.subjectName)) {
        subjectMap.set(l.subjectName, {
          name: l.subjectName,
          hours: 0,
          teacher: l.teacherName || "-",
        });
      }
      subjectMap.get(l.subjectName)!.hours++;
    }
    const subjectRows = [...subjectMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "tr")
    );

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

// 4. ÖĞRETMEN PROGRAMLARI LİSTESİ
export function generateOgretmenProgramlariPdf(
  lessons: LessonData[],
  settings: AppSettings = DEFAULT_SETTINGS,
  context: PdfScheduleContext = {}
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

    let scheduleTable = `<tr><th style="width:72px">Saat</th>`;
    for (const day of activeDays) {
      scheduleTable += `<th>${DAY_NAMES[day]}</th>`;
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
          scheduleTable += `<td><div style="font-size:10px">${esc(lesson.className)}</div><div style="font-size:9px;color:#333">${esc(lesson.subjectShortName)}</div></td>`;
        } else {
          scheduleTable += `<td></td>`;
        }
      }
      scheduleTable += `</tr>`;
    }

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
        <table style="margin-bottom:12px">${scheduleTable}</table>
        <div style="font-size:10px;margin-bottom:3px">Toplam Ders Saati: <strong>${totalHours}</strong></div>
        <div style="font-size:10px;margin-bottom:3px">Sınıf Rehber Öğretmenliği: -</div>
        <div style="font-size:10px;margin-bottom:30px">Nöbet Görevi: -</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding-top:30px">
          <div style="border:1px solid #000;padding:8px 10px;width:140px;font-size:9px">
            <div style="font-weight:bold;margin-bottom:4px">ASLINI ALDIM</div>
            <div>Tarih: ..... / ..... / .........</div>
            <div>İmza:</div>
          </div>
          <div style="text-align:center">
            <div style="font-weight:bold;font-size:10px">UYGUNDUR</div>
            <div style="font-size:9px;margin:4px 0">..... / ..... / .........</div>
            ${settings.vicePrincipalName?.trim() ? `<div style="font-size:9px">${esc(settings.vicePrincipalName.trim())}</div>` : ""}
            <div style="font-weight:bold;font-size:9px">Müdür Yardımcısı</div>
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
