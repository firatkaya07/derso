import * as XLSX from "xlsx";
import { DAY_NAMES, SUBGROUPS, SUBJECT_COLORS } from "./types";

/**
 * Derso Excel şablonu.
 *
 * Şablon veritabanı tablolarıyla birebir eşleşir: her sayfa bir tabloyu (veya
 * tablo çiftini) besler. Sayfa ve sütun adları hem şablonu üreten hem de
 * okuyan kod tarafından buradan alınır, böylece ikisi birbirinden ayrışamaz.
 *
 *   Öğretmenler ......... teachers + teacher_subjects
 *   Dersler ............. subjects
 *   Sınıflar ............ classes
 *   Sınıf Saatleri ...... class_schedule_days
 *   Ders Dağılımı ....... class_subjects (haftalık saat)
 *   Ders Öğretmenleri ... class_subjects (sabit öğretmen ataması, isteğe bağlı)
 */
export const SHEET_NAMES = {
  info: "Açıklama",
  teachers: "Öğretmenler",
  subjects: "Dersler",
  classes: "Sınıflar",
  scheduleDays: "Sınıf Saatleri",
  distribution: "Ders Dağılımı",
  assignments: "Ders Öğretmenleri",
} as const;

export const TEACHER_COLUMNS = {
  name: "Ad Soyad",
  specialization: "Branş",
  offDays: "İzin Günleri",
  phone: "Telefon",
  email: "E-posta",
  subjects: "Verdiği Dersler",
} as const;

export const SUBJECT_COLUMNS = {
  name: "Ders Adı",
  shortName: "Kısa Ad",
  color: "Renk",
  levels: "Seviyeler",
  subgroups: "Alanlar",
} as const;

export const CLASS_COLUMNS = {
  name: "Sınıf Adı",
  level: "Seviye",
  subgroup: "Alan",
  description: "Açıklama",
} as const;

export const SCHEDULE_DAY_COLUMNS = {
  className: "Sınıf Adı",
  days: "Günler",
  startTime: "Başlangıç",
  endTime: "Bitiş",
} as const;

export const ASSIGNMENT_COLUMNS = {
  className: "Sınıf Adı",
  subjectName: "Ders Adı",
  teacherName: "Öğretmen",
} as const;

/** "Ders Dağılımı" sayfasında sınıf sütunlarının başladığı ilk hücrenin başlığı. */
export const DISTRIBUTION_ROW_HEADER = "Ders";

const TURKISH_FOLD: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  İ: "i",
  I: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
  Â: "a",
  â: "a",
  Î: "i",
  î: "i",
  Û: "u",
  û: "u",
};

/**
 * Sayfa ve sütun adlarını karşılaştırmak için kullanılan normalleştirme.
 * Türkçe karakterler, büyük/küçük harf, yıldız işareti ve fazladan boşluklar
 * göz ardı edilir; böylece kullanıcı başlığı "ad soyad*" diye yazsa da eşleşir.
 */
export function normalizeKey(value: string): string {
  return Array.from(String(value ?? ""))
    .map((ch) => TURKISH_FOLD[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[*:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const DAY_LOOKUP: Map<string, number> = (() => {
  const map = new Map<string, number>();
  DAY_NAMES.forEach((name, index) => {
    map.set(normalizeKey(name), index);
    map.set(normalizeKey(name).slice(0, 3), index);
  });
  // Şablonda kullanılmasa da elle doldurulmuş dosyalarda sık görülen yazımlar.
  map.set("pzt", 0);
  map.set("sal", 1);
  map.set("car", 2);
  map.set("per", 3);
  map.set("cum", 4);
  map.set("cmt", 5);
  map.set("paz", 6);
  return map;
})();

/** Gün adını 0 (Pazartesi) – 6 (Pazar) aralığında bir indekse çevirir. */
export function parseDayName(value: string): number | null {
  const key = normalizeKey(value);
  if (!key) return null;
  return DAY_LOOKUP.get(key) ?? null;
}

/**
 * Saat hücresini "HH:MM" biçimine çevirir. Excel saatleri gün kesri olarak
 * (16:40 → 0.6944) saklar; kullanıcı elle yazdığında ise metin gelir.
 */
export function parseTimeCell(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const fraction = value - Math.floor(value);
    const totalMinutes = Math.round(fraction * 24 * 60);
    if (totalMinutes < 0 || totalMinutes >= 24 * 60) return null;
    return formatMinutes(totalMinutes);
  }

  if (value instanceof Date) {
    return formatMinutes(value.getHours() * 60 + value.getMinutes());
  }

  const match = String(value)
    .trim()
    .match(/^(\d{1,2})[.:](\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return formatMinutes(hours * 60 + minutes);
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "Matematik, Fizik" gibi hücreleri listeye çevirir. */
export function splitList(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  return String(value)
    .split(/[,;/\n]|(?<=\S)\s-\s(?=\S)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const INFO_LINES: string[][] = [
  ["DERSO — VERİ AKTARIM ŞABLONU"],
  [],
  [
    "Bu dosyadaki her sayfa uygulamadaki bir veri kümesine karşılık gelir.",
  ],
  [
    "Başlık satırlarını (1. satır) değiştirmeyin; sütunların sırasını değiştirebilirsiniz.",
  ],
  ["Yıldızlı (*) sütunlar zorunludur. Örnek satırları silip kendi verinizi girin."],
  [],
  ["Sayfa", "Ne işe yarar", "Zorunlu sütunlar"],
  [
    SHEET_NAMES.teachers,
    "Öğretmenler ve verebildikleri dersler",
    `${TEACHER_COLUMNS.name}`,
  ],
  [
    SHEET_NAMES.subjects,
    "Ders tanımları, seviyeleri ve renkleri",
    `${SUBJECT_COLUMNS.name}`,
  ],
  [
    SHEET_NAMES.classes,
    "Sınıf (şube) tanımları",
    `${CLASS_COLUMNS.name}`,
  ],
  [
    SHEET_NAMES.scheduleDays,
    "Her sınıfın hangi gün, hangi saatler arasında ders gördüğü",
    `${SCHEDULE_DAY_COLUMNS.className}, ${SCHEDULE_DAY_COLUMNS.days}, ${SCHEDULE_DAY_COLUMNS.startTime}, ${SCHEDULE_DAY_COLUMNS.endTime}`,
  ],
  [
    SHEET_NAMES.distribution,
    "Hangi sınıfta hangi dersin haftada kaç saat okutulduğu",
    "Satırlar ders, sütunlar sınıf",
  ],
  [
    SHEET_NAMES.assignments,
    "Belirli bir dersi belirli bir öğretmenin vermesi şartsa (isteğe bağlı)",
    `${ASSIGNMENT_COLUMNS.className}, ${ASSIGNMENT_COLUMNS.subjectName}, ${ASSIGNMENT_COLUMNS.teacherName}`,
  ],
  [],
  ["Biçim kuralları"],
  [
    "Gün adları",
    DAY_NAMES.join(", "),
  ],
  [
    "Birden fazla değer",
    "Aynı hücrede virgülle ayırın. Örnek: Cumartesi, Pazar",
  ],
  ["Saatler", "SS:DD biçiminde yazın. Örnek: 16:40"],
  [
    "Seviyeler",
    "1–12 arası sayılar veya Mezun. Örnek: 9,10,11,12",
  ],
  ["Alanlar", SUBGROUPS.join(", ")],
  ["Renk", "#RRGGBB biçiminde. Boş bırakılırsa otomatik atanır."],
  [
    "Ders saati",
    "Bir ders saati 40 dakika, teneffüs 10 dakikadır; slotlar başlangıç saatinden itibaren otomatik hesaplanır.",
  ],
  [],
  ["Adlandırma"],
  [
    "Sınıf ve ders adları sayfalar arasında birebir aynı yazılmalıdır.",
  ],
  [
    "Büyük/küçük harf farkı sorun değildir; 'Matematik' ile 'MATEMATİK' aynı sayılır.",
  ],
];

const EXAMPLE_TEACHERS = [
  ["Ayşe Yılmaz", "Matematik", "Cumartesi, Pazar", "0555 111 22 33", "ayse@ornek.com", "Matematik 1, Matematik 2"],
  ["Mehmet Demir", "Türkçe", "Pazar", "0555 222 33 44", "mehmet@ornek.com", "Türkçe, Edebiyat"],
  ["Zeynep Kaya", "Fen Bilimleri", "", "", "", "Fizik, Kimya"],
];

const EXAMPLE_SUBJECTS = [
  ["Matematik 1", "MAT1", SUBJECT_COLORS[0], "9,10,11,12", "TM, MF"],
  ["Matematik 2", "MAT2", SUBJECT_COLORS[1], "11,12", "MF"],
  ["Türkçe", "TÜR", SUBJECT_COLORS[2], "9,10,11,12", ""],
  ["Edebiyat", "EDB", SUBJECT_COLORS[3], "11,12", "TM, SÖZ"],
  ["Fizik", "FİZ", SUBJECT_COLORS[4], "10,11,12", "MF"],
  ["Kimya", "KİM", SUBJECT_COLORS[5], "10,11,12", "MF"],
];

const EXAMPLE_CLASSES = [
  ["12-A", "12", "MF", "Sabah grubu"],
  ["12-B", "12", "TM", "Sabah grubu"],
  ["11-A", "11", "MF", ""],
];

const EXAMPLE_SCHEDULE_DAYS = [
  ["12-A", "Pazartesi, Çarşamba, Cuma", "16:40", "19:50"],
  ["12-A", "Cumartesi", "08:30", "13:30"],
  ["12-B", "Salı, Perşembe", "16:40", "19:50"],
  ["11-A", "Pazartesi, Çarşamba", "16:40", "19:50"],
];

const EXAMPLE_DISTRIBUTION: (string | number)[][] = [
  [DISTRIBUTION_ROW_HEADER, "12-A", "12-B", "11-A"],
  ["Matematik 1", 4, 4, 4],
  ["Matematik 2", 2, "", 2],
  ["Türkçe", 2, 3, 2],
  ["Edebiyat", "", 3, ""],
  ["Fizik", 3, "", 3],
  ["Kimya", 2, "", 2],
];

const EXAMPLE_ASSIGNMENTS = [["12-A", "Matematik 1", "Ayşe Yılmaz"]];

function sheetFromRows(
  rows: (string | number | null)[][],
  widths: number[]
): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  return sheet;
}

/** Boş şablonu (örnek satırlarla birlikte) bir çalışma kitabı olarak üretir. */
export function buildTemplateWorkbook(): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(INFO_LINES, [26, 62, 46]),
    SHEET_NAMES.info
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        [
          `${TEACHER_COLUMNS.name}*`,
          TEACHER_COLUMNS.specialization,
          TEACHER_COLUMNS.offDays,
          TEACHER_COLUMNS.phone,
          TEACHER_COLUMNS.email,
          TEACHER_COLUMNS.subjects,
        ],
        ...EXAMPLE_TEACHERS,
      ],
      [24, 18, 24, 18, 26, 34]
    ),
    SHEET_NAMES.teachers
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        [
          `${SUBJECT_COLUMNS.name}*`,
          SUBJECT_COLUMNS.shortName,
          SUBJECT_COLUMNS.color,
          SUBJECT_COLUMNS.levels,
          SUBJECT_COLUMNS.subgroups,
        ],
        ...EXAMPLE_SUBJECTS,
      ],
      [24, 12, 12, 22, 18]
    ),
    SHEET_NAMES.subjects
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        [
          `${CLASS_COLUMNS.name}*`,
          CLASS_COLUMNS.level,
          CLASS_COLUMNS.subgroup,
          CLASS_COLUMNS.description,
        ],
        ...EXAMPLE_CLASSES,
      ],
      [18, 12, 12, 26]
    ),
    SHEET_NAMES.classes
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        [
          `${SCHEDULE_DAY_COLUMNS.className}*`,
          `${SCHEDULE_DAY_COLUMNS.days}*`,
          `${SCHEDULE_DAY_COLUMNS.startTime}*`,
          `${SCHEDULE_DAY_COLUMNS.endTime}*`,
        ],
        ...EXAMPLE_SCHEDULE_DAYS,
      ],
      [18, 34, 14, 14]
    ),
    SHEET_NAMES.scheduleDays
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(EXAMPLE_DISTRIBUTION, [24, 12, 12, 12]),
    SHEET_NAMES.distribution
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        [
          `${ASSIGNMENT_COLUMNS.className}*`,
          `${ASSIGNMENT_COLUMNS.subjectName}*`,
          `${ASSIGNMENT_COLUMNS.teacherName}*`,
        ],
        ...EXAMPLE_ASSIGNMENTS,
      ],
      [18, 24, 24]
    ),
    SHEET_NAMES.assignments
  );

  return workbook;
}

/** Şablonu kullanıcının bilgisayarına indirir. */
export function downloadTemplate(fileName = "derso-sablon.xlsx") {
  XLSX.writeFile(buildTemplateWorkbook(), fileName, { compression: true });
}
