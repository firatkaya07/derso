import { buildTimeSlots, slotsForDay, type TimeSlot } from "../schedule-rules";
import type { ClassScheduleDay, SlotTiming } from "../types";
import {
  academicYearLabel,
  DEFAULT_SETTINGS,
  locationLabel,
  type AppSettings,
} from "../settings";

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
export function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

export const DAY_NAMES_UPPER = [
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

export function formatDate(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
}

/**
 * Belgelerin ortak başlığı: logo (varsa), T.C., il/ilçe, kurum adı.
 * Logo T.C. satırının üstünde, ortalanmış durur. Bilgiler Genel Tanımlar
 * sayfasından gelir; girilmemiş alanlar atlanır, böylece kurulumunu
 * tamamlamamış bir kurumda çıktı boş satırlarla dolmaz.
 */
export function documentHeader(
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
export function signatureBlock(title: string, name: string | null): string {
  return `<div style="text-align:center">
    <div style="border-top:1px solid #000;width:150px;margin-bottom:5px"></div>
    ${name?.trim() ? `<div style="font-size:10px">${esc(name.trim())}</div>` : ""}
    <div style="font-weight:bold;font-size:10px">${esc(title)}</div>
  </div>`;
}

export function getActiveDays(lessons: LessonData[]): number[] {
  const days = new Set<number>();
  for (const l of lessons) days.add(l.dayOfWeek);
  return [...days].sort((a, b) => a - b);
}

/**
 * Çıktı ızgarasının satırları. Önce sınıf saatlerinden üretilir; yoksa
 * mevcut derslerin başlangıç–bitiş saatleri kullanılır.
 */
export function resolveTimeSlots(
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
export function clockRowHeader(slotIndex: number, slot: TimeSlot): string {
  return `<td>
    <div>${slotIndex + 1}. Ders</div>
    <div style="font-size:8px;font-weight:normal;color:#333;margin-top:1px">${esc(slot.start)}–${esc(slot.end)}</div>
  </td>`;
}

/** Çarşaf listelerinin alt başlığı: sıra + başlangıç saati. */
export function carsafSlotHeader(
  slotIndex: number,
  slot: TimeSlot,
  width: string
): string {
  return `<th style="width:${width}">${slotIndex + 1}<div style="font-size:7px;font-weight:normal;line-height:1.1">${esc(slot.start)}</div></th>`;
}

/**
 * Öğretmen çarşaf hücresi: sınıf + ders kısa adı.
 * Aynı öğretmene aynı sınıfta birden fazla ders düşünce yalnızca sınıf adı
 * hangi dersin olduğunu göstermez; kısa ad ayırt eder.
 */
export function formatTeacherCarsafCell(lesson: LessonData): string {
  const subject = lesson.subjectShortName || lesson.subjectName;
  if (!lesson.className && !subject) return "";
  if (!subject) return esc(lesson.className);
  if (!lesson.className) return esc(subject);
  return `${esc(lesson.className)}<div style="font-size:6px;color:#333">${esc(subject)}</div>`;
}

/** Excel / düz metin için sınıf + ders kısa adı (satır kırımlı). */
export function formatTeacherCarsafPlain(lesson: LessonData): string {
  const subject = lesson.subjectShortName || lesson.subjectName;
  if (!lesson.className && !subject) return "";
  if (!subject) return lesson.className;
  if (!lesson.className) return subject;
  return `${lesson.className}\n${subject}`;
}

/**
 * Sınıf çarşaf hücresi: ders adı + öğretmen adı.
 * PDF ve Excel aynı düz metni kullanır; satırlar \\n ile ayrılır.
 */
export function formatSinifCarsafPlain(lesson: LessonData): string {
  const subject = lesson.subjectName || lesson.subjectShortName;
  const teacher = lesson.teacherName?.trim() || "";
  if (!subject && !teacher) return "";
  if (!teacher) return subject;
  if (!subject) return teacher;
  return `${subject}\n${teacher}`;
}

/** Çarşaf PDF hücresinde \\n ile ayrılmış satırları HTML'e çevirir. */
export function formatCarsafMultilineHtml(
  cell: string,
  secondarySize: string
): string {
  if (!cell) return "";
  const parts = cell.split("\n").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return esc(parts[0]);
  return `${esc(parts[0])}<div style="font-size:${secondarySize};color:#333;font-weight:normal;margin-top:1px">${esc(parts.slice(1).join(" "))}</div>`;
}

/**
 * Kelimeleri ortadan bölmeden, en fazla maxLines satıra sığdırır.
 * Örn. width=14 → "Ahmet Muhammet" / "Veli"
 */
export function wrapWordsToLines(
  text: string,
  width: number,
  maxLines = 2
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (maxLines < 1) return [words.join(" ")];

  const lines: string[] = [];
  let i = 0;
  while (i < words.length && lines.length < maxLines - 1) {
    let cur = words[i++];
    while (i < words.length) {
      const trial = `${cur} ${words[i]}`;
      if (trial.length > width) break;
      cur = trial;
      i++;
    }
    lines.push(cur);
  }
  if (i < words.length) {
    lines.push(words.slice(i).join(" "));
  }
  return lines;
}

function canPackWords(words: string[], width: number, maxLines: number): boolean {
  let lines = 1;
  let cur = 0;
  for (const w of words) {
    if (w.length > width) return false;
    const next = cur === 0 ? w.length : cur + 1 + w.length;
    if (next <= width) {
      cur = next;
    } else {
      lines += 1;
      cur = w.length;
      if (lines > maxLines) return false;
    }
  }
  return true;
}

/** Kelime ortasından bölmeden maxLines satıra sığmak için gereken min karakter genişliği. */
export function minWidthForWordWrap(text: string, maxLines = 2): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const longestWord = Math.max(...words.map((w) => w.length));
  if (words.length === 1) return words[0].length;

  let lo = longestWord;
  let hi = text.trim().length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (canPackWords(words, mid, maxLines)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export interface CarsafMatrix {
  labelHeader: string;
  days: number[];
  slots: TimeSlot[];
  rows: { label: string; cells: string[] }[];
}

/** Hücredeki ilk satır (ders adı) — sütun genişliği hesabı için. */
export function longestCarsafSubjectLength(matrix: CarsafMatrix): number {
  let max = 0;
  for (const row of matrix.rows) {
    for (const cell of row.cells) {
      const subject = (cell.split("\n")[0] ?? "").trim();
      if (subject.length > max) max = subject.length;
    }
  }
  return max;
}

/** Excel tek satır hücreleri dahil en uzun metin uzunluğu. */
export function longestCarsafCellLength(matrix: CarsafMatrix): number {
  let max = longestCarsafSubjectLength(matrix);
  for (const row of matrix.rows) {
    for (const cell of row.cells) {
      const joined = cell.replace(/\n+/g, " ").trim();
      if (joined.length > max) max = joined.length;
    }
  }
  return max;
}

/**
 * Sınıf çarşaf veri sütunu: ders adı tek satır + öğretmen en fazla 2 satır
 * (kelime ortasından bölünmeden) sığacak ortak genişlik.
 */
export function sinifCarsafDataColChars(
  matrix: CarsafMatrix,
  teacherMaxLines = 2
): number {
  let max = Math.max(longestCarsafSubjectLength(matrix), 4);
  for (const row of matrix.rows) {
    for (const cell of row.cells) {
      if (!cell) continue;
      const parts = cell.split("\n").filter(Boolean);
      const teacher =
        parts.length > 1 ? parts.slice(1).join(" ").trim() : "";
      if (teacher) {
        max = Math.max(max, minWidthForWordWrap(teacher, teacherMaxLines));
      }
    }
  }
  return max;
}

/** Sınıf çarşaf PDF hücresi: ders tek satır, öğretmen kelime sınırında kırılır. */
export function formatSinifCarsafPdfHtml(
  cell: string,
  colChars: number,
  secondarySize: string
): string {
  if (!cell) return "";
  const parts = cell.split("\n").filter(Boolean);
  if (parts.length === 0) return "";

  if (parts.length === 1) {
    return `<span class="subject">${esc(parts[0])}</span>`;
  }

  const subject = parts[0];
  const teacher = parts.slice(1).join(" ").trim();
  const teacherLines = wrapWordsToLines(teacher, colChars, 2);
  const teacherHtml = teacherLines
    .map(
      (line) =>
        `<div class="teacher-line" style="font-size:${secondarySize};color:#333;font-weight:normal;margin-top:1px">${esc(line)}</div>`
    )
    .join("");
  return `<span class="subject">${esc(subject)}</span>${teacherHtml}`;
}

/** Sınıf çarşaf ızgarası — PDF ve Excel ortak veri kaynağı. */
export function buildSinifCarsafMatrix(
  lessons: LessonData[],
  context: PdfScheduleContext = {}
): CarsafMatrix {
  const days = context.days?.length ? context.days : getActiveDays(lessons);
  const slots =
    context.slots?.length
      ? context.slots
      : resolveTimeSlots(context.scheduleDays ?? [], lessons, context.timing);
  const classes = [...new Set(lessons.map((l) => l.className))].sort((a, b) =>
    a.localeCompare(b, "tr")
  );

  const rows = classes.map((cls) => {
    const cells: string[] = [];
    for (const day of days) {
      for (const slot of slots) {
        const lesson = lessons.find(
          (l) =>
            l.className === cls &&
            l.dayOfWeek === day &&
            l.startTime === slot.start
        );
        cells.push(lesson ? formatSinifCarsafPlain(lesson) : "");
      }
    }
    return { label: cls, cells };
  });

  return { labelHeader: "Sınıf", days, slots, rows };
}

/** Öğretmen çarşaf ızgarası — PDF ve Excel ortak veri kaynağı. */
export function buildOgretmenCarsafMatrix(
  lessons: LessonData[],
  context: PdfScheduleContext = {}
): CarsafMatrix {
  const days = context.days?.length ? context.days : getActiveDays(lessons);
  const slots =
    context.slots?.length
      ? context.slots
      : resolveTimeSlots(context.scheduleDays ?? [], lessons, context.timing);
  const teacherNames = [
    ...new Set(lessons.filter((l) => l.teacherName).map((l) => l.teacherName)),
  ].sort((a, b) => a.localeCompare(b, "tr"));

  const rows = teacherNames.map((teacher) => {
    const cells: string[] = [];
    for (const day of days) {
      for (const slot of slots) {
        const lesson = lessons.find(
          (l) =>
            l.teacherName === teacher &&
            l.dayOfWeek === day &&
            l.startTime === slot.start
        );
        cells.push(lesson ? formatTeacherCarsafPlain(lesson) : "");
      }
    }
    return { label: teacher, cells };
  });

  return { labelHeader: "Öğretmen", days, slots, rows };
}

/**
 * Sınıf programındaki "Ders ve Öğretmen Bilgileri" satırları.
 * subjectId ile gruplanır; böylece aynı adlı dersler karışmaz ve bir
 * öğretmenin aynı sınıftaki farklı dersleri ayrı satırda kalır.
 */
export function buildSubjectTeacherRows(
  classLessons: LessonData[]
): { name: string; hours: number; teacher: string }[] {
  const subjectMap = new Map<
    string,
    { name: string; hours: number; teacher: string }
  >();
  for (const lesson of classLessons) {
    const key = lesson.subjectId || lesson.subjectName;
    if (!key) continue;
    const existing = subjectMap.get(key);
    if (!existing) {
      subjectMap.set(key, {
        name: lesson.subjectName || lesson.subjectShortName || "—",
        hours: 1,
        teacher: lesson.teacherName || "-",
      });
    } else {
      existing.hours += 1;
    }
  }
  return [...subjectMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );
}

/**
 * Öğretmen programı alt özeti: her sınıf–ders çifti ve haftalık saati.
 * Aynı sınıfa birden fazla ders giren öğretmenlerde her ders ayrı satırdır.
 */
export function buildTeacherClassSubjectRows(
  teacherLessons: LessonData[]
): { className: string; subjectName: string; hours: number }[] {
  const map = new Map<
    string,
    { className: string; subjectName: string; hours: number }
  >();
  for (const lesson of teacherLessons) {
    const key = `${lesson.classId}:${lesson.subjectId || lesson.subjectName}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        className: lesson.className || "—",
        subjectName: lesson.subjectName || lesson.subjectShortName || "—",
        hours: 1,
      });
    } else {
      existing.hours += 1;
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      a.className.localeCompare(b.className, "tr") ||
      a.subjectName.localeCompare(b.subjectName, "tr")
  );
}

/** Öğretmen programı takvim hücresi: sınıf + ders adı (tam ad tercih). */
export function formatTeacherProgramCell(lesson: LessonData): string {
  const subject = lesson.subjectName || lesson.subjectShortName;
  const classLine = lesson.className ? esc(lesson.className) : "";
  const subjectLine = subject ? esc(subject) : "";
  if (!classLine && !subjectLine) return "";
  if (!subjectLine) {
    return `<div style="font-size:10px">${classLine}</div>`;
  }
  if (!classLine) {
    return `<div style="font-size:9px;color:#333">${subjectLine}</div>`;
  }
  return `<div style="font-size:10px">${classLine}</div><div style="font-size:9px;color:#333">${subjectLine}</div>`;
}

export interface PdfScheduleContext {
  scheduleDays?: ClassScheduleDay[];
  timing?: SlotTiming;
  /** Verilirse aktif günler bununla sabitle nir (V2 hafta içi/sonu ayrımı). */
  days?: number[];
  /** Verilirse satır saatleri bununla sabitlenir (V2 kurum profili). */
  slots?: TimeSlot[];
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
  teacher?: { id: string; name: string; off_days?: number[] };
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
export function printHtmlDocument(html: string, title: string): PrintOutcome {
  return openPrintWindow(html, title);
}

export function openPrintWindow(html: string, title: string): PrintOutcome {
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

export const baseStyle = `
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

export { DEFAULT_SETTINGS, academicYearLabel };
