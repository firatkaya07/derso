import * as XLSX from "xlsx";
import {
  ASSIGNMENT_COLUMNS,
  CLASS_COLUMNS,
  DISTRIBUTION_ROW_HEADER,
  SCHEDULE_DAY_COLUMNS,
  SHEET_NAMES,
  SUBJECT_COLUMNS,
  TEACHER_COLUMNS,
  normalizeKey,
  parseDayName,
  parseTimeCell,
  splitList,
  trUpper,
} from "./excel-template";
import { DAY_NAMES, LEVELS, SUBJECT_COLORS } from "./types";
import { DEFAULT_FIELD_NAMES } from "./fields";

export interface ParsedTeacher {
  name: string;
  specialization: string | null;
  phone: string | null;
  email: string | null;
  offDays: number[];
  subjectNames: string[];
}

export interface ParsedSubject {
  name: string;
  shortName: string | null;
  color: string;
  levels: string | null;
  subgroups: string | null;
}

export interface ParsedClass {
  name: string;
  level: string | null;
  subgroup: string | null;
  description: string | null;
}

export interface ParsedScheduleDay {
  className: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ParsedClassSubject {
  className: string;
  subjectName: string;
  weeklyHours: number;
  teacherName: string | null;
}

export interface ParseIssue {
  sheet: string;
  /** Excel'deki 1 tabanlı satır numarası; sayfa geneli sorunlarda tanımsız. */
  row?: number;
  message: string;
}

export interface ParsedWorkbook {
  teachers: ParsedTeacher[];
  subjects: ParsedSubject[];
  classes: ParsedClass[];
  scheduleDays: ParsedScheduleDay[];
  classSubjects: ParsedClassSubject[];
  errors: ParseIssue[];
  warnings: ParseIssue[];
}

interface SheetTable {
  name: string;
  headers: string[];
  rows: unknown[][];
  /** İlk veri satırının Excel'deki satır numarası. */
  firstDataRow: number;
}

class IssueCollector {
  readonly errors: ParseIssue[] = [];
  readonly warnings: ParseIssue[] = [];

  error(sheet: string, message: string, row?: number) {
    this.errors.push({ sheet, message, row });
  }

  warn(sheet: string, message: string, row?: number) {
    this.warnings.push({ sheet, message, row });
  }
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readTable(
  workbook: XLSX.WorkBook,
  sheetName: string
): SheetTable | null {
  const target = normalizeKey(sheetName);
  const actualName = workbook.SheetNames.find(
    (name) => normalizeKey(name) === target
  );
  if (!actualName) return null;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[actualName], {
    header: 1,
    blankrows: true,
    defval: null,
  });
  if (rows.length === 0) {
    return { name: actualName, headers: [], rows: [], firstDataRow: 2 };
  }

  return {
    name: actualName,
    headers: (rows[0] as unknown[]).map((cell) => normalizeKey(text(cell))),
    rows: rows.slice(1) as unknown[][],
    firstDataRow: 2,
  };
}

function columnIndex(table: SheetTable, header: string): number {
  return table.headers.indexOf(normalizeKey(header));
}

/**
 * Zorunlu sütunların hepsinin var olduğunu doğrular; eksik olanları tek bir
 * hata mesajında toplar, böylece kullanıcı sütunları teker teker keşfetmez.
 */
function requireColumns(
  table: SheetTable,
  headers: string[],
  issues: IssueCollector
): Record<string, number> | null {
  const found: Record<string, number> = {};
  const missing: string[] = [];

  for (const header of headers) {
    const index = columnIndex(table, header);
    if (index < 0) missing.push(header);
    else found[header] = index;
  }

  if (missing.length > 0) {
    issues.error(
      table.name,
      `Zorunlu sütun bulunamadı: ${missing.join(", ")}. Başlık satırını şablondaki gibi bırakın.`
    );
    return null;
  }
  return found;
}

function parseOffDays(
  value: unknown,
  sheet: string,
  row: number,
  issues: IssueCollector
): number[] {
  const days: number[] = [];
  for (const part of splitList(value)) {
    const day = parseDayName(part);
    if (day === null) {
      issues.warn(
        sheet,
        `"${part}" bir gün adı olarak tanınmadı, yok sayıldı. Geçerli değerler: ${DAY_NAMES.join(", ")}.`,
        row
      );
      continue;
    }
    if (!days.includes(day)) days.push(day);
  }
  return days.sort((a, b) => a - b);
}

function parseTeachers(
  workbook: XLSX.WorkBook,
  issues: IssueCollector
): ParsedTeacher[] {
  const table = readTable(workbook, SHEET_NAMES.teachers);
  if (!table) {
    issues.error(
      SHEET_NAMES.teachers,
      `"${SHEET_NAMES.teachers}" sayfası bulunamadı.`
    );
    return [];
  }

  const columns = requireColumns(table, [TEACHER_COLUMNS.name], issues);
  if (!columns) return [];

  const nameCol = columns[TEACHER_COLUMNS.name];
  const specCol = columnIndex(table, TEACHER_COLUMNS.specialization);
  const offCol = columnIndex(table, TEACHER_COLUMNS.offDays);
  const phoneCol = columnIndex(table, TEACHER_COLUMNS.phone);
  const emailCol = columnIndex(table, TEACHER_COLUMNS.email);
  const subjectsCol = columnIndex(table, TEACHER_COLUMNS.subjects);

  const teachers: ParsedTeacher[] = [];
  const seen = new Map<string, number>();

  table.rows.forEach((row, index) => {
    const excelRow = table.firstDataRow + index;
    const name = text(row[nameCol]);
    if (!name) return;

    const key = normalizeKey(name);
    const previous = seen.get(key);
    if (previous !== undefined) {
      issues.error(
        table.name,
        `"${name}" öğretmeni ${previous}. satırda da geçiyor. Her öğretmen bir kez yazılmalı.`,
        excelRow
      );
      return;
    }
    seen.set(key, excelRow);

    teachers.push({
      name,
      specialization: specCol >= 0 ? text(row[specCol]) || null : null,
      phone: phoneCol >= 0 ? text(row[phoneCol]) || null : null,
      email: emailCol >= 0 ? text(row[emailCol]) || null : null,
      offDays:
        offCol >= 0
          ? parseOffDays(row[offCol], table.name, excelRow, issues)
          : [],
      subjectNames: subjectsCol >= 0 ? splitList(row[subjectsCol]) : [],
    });
  });

  return teachers;
}

function parseSubjects(
  workbook: XLSX.WorkBook,
  issues: IssueCollector,
  allowedFields: string[]
): ParsedSubject[] {
  const table = readTable(workbook, SHEET_NAMES.subjects);
  if (!table) {
    issues.error(
      SHEET_NAMES.subjects,
      `"${SHEET_NAMES.subjects}" sayfası bulunamadı.`
    );
    return [];
  }

  const columns = requireColumns(table, [SUBJECT_COLUMNS.name], issues);
  if (!columns) return [];

  const nameCol = columns[SUBJECT_COLUMNS.name];
  const shortCol = columnIndex(table, SUBJECT_COLUMNS.shortName);
  const colorCol = columnIndex(table, SUBJECT_COLUMNS.color);
  const levelCol = columnIndex(table, SUBJECT_COLUMNS.levels);
  const subgroupCol = columnIndex(table, SUBJECT_COLUMNS.subgroups);

  const subjects: ParsedSubject[] = [];
  const seen = new Map<string, number>();

  table.rows.forEach((row, index) => {
    const excelRow = table.firstDataRow + index;
    const name = text(row[nameCol]);
    if (!name) return;

    const key = normalizeKey(name);
    const previous = seen.get(key);
    if (previous !== undefined) {
      issues.error(
        table.name,
        `"${name}" dersi ${previous}. satırda da geçiyor. Her ders bir kez yazılmalı.`,
        excelRow
      );
      return;
    }
    seen.set(key, excelRow);

    let shortName = shortCol >= 0 ? text(row[shortCol]) : "";
    if (shortName.length > 5) {
      issues.warn(
        table.name,
        `"${name}" için kısa ad 5 karakterden uzun, kısaltıldı.`,
        excelRow
      );
      shortName = shortName.slice(0, 5);
    }

    let color = colorCol >= 0 ? text(row[colorCol]) : "";
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      issues.warn(
        table.name,
        `"${color}" geçerli bir renk kodu değil (#RRGGBB bekleniyor), otomatik renk atandı.`,
        excelRow
      );
      color = "";
    }
    if (!color) {
      color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    }

    const levels = levelCol >= 0 ? splitList(row[levelCol]) : [];
    const unknownLevels = levels.filter((level) => !LEVELS.includes(level));
    if (unknownLevels.length > 0) {
      issues.warn(
        table.name,
        `Tanınmayan seviye: ${unknownLevels.join(", ")}. Geçerli değerler: ${LEVELS.join(", ")}.`,
        excelRow
      );
    }

    const subgroups = subgroupCol >= 0 ? splitList(row[subgroupCol]) : [];
    const unknownSubgroups = subgroups.filter(
      (subgroup) =>
        !allowedFields.some((field) => trUpper(field) === trUpper(subgroup))
    );
    if (unknownSubgroups.length > 0) {
      issues.warn(
        table.name,
        `Tanınmayan alan: ${unknownSubgroups.join(", ")}. Geçerli değerler: ${allowedFields.join(", ")}.`,
        excelRow
      );
    }

    subjects.push({
      name,
      shortName: shortName || null,
      color,
      levels: levels.length > 0 ? levels.join(",") : null,
      subgroups:
        subgroups.length > 0
          ? subgroups.map((s) => trUpper(s)).join(",")
          : null,
    });
  });

  return subjects;
}

function parseClasses(
  workbook: XLSX.WorkBook,
  issues: IssueCollector,
  allowedFields: string[]
): ParsedClass[] {
  const table = readTable(workbook, SHEET_NAMES.classes);
  if (!table) {
    issues.error(
      SHEET_NAMES.classes,
      `"${SHEET_NAMES.classes}" sayfası bulunamadı.`
    );
    return [];
  }

  const columns = requireColumns(table, [CLASS_COLUMNS.name], issues);
  if (!columns) return [];

  const nameCol = columns[CLASS_COLUMNS.name];
  const levelCol = columnIndex(table, CLASS_COLUMNS.level);
  const subgroupCol = columnIndex(table, CLASS_COLUMNS.subgroup);
  const descriptionCol = columnIndex(table, CLASS_COLUMNS.description);

  const classes: ParsedClass[] = [];
  const seen = new Map<string, number>();

  table.rows.forEach((row, index) => {
    const excelRow = table.firstDataRow + index;
    const name = text(row[nameCol]);
    if (!name) return;

    const key = normalizeKey(name);
    const previous = seen.get(key);
    if (previous !== undefined) {
      issues.error(
        table.name,
        `"${name}" sınıfı ${previous}. satırda da geçiyor. Her sınıf bir kez yazılmalı.`,
        excelRow
      );
      return;
    }
    seen.set(key, excelRow);

    const level = levelCol >= 0 ? text(row[levelCol]) : "";
    if (level && !LEVELS.includes(level)) {
      issues.warn(
        table.name,
        `"${level}" tanınmayan bir seviye. Geçerli değerler: ${LEVELS.join(", ")}.`,
        excelRow
      );
    }

    const subgroup = subgroupCol >= 0 ? trUpper(text(row[subgroupCol])) : "";
    if (
      subgroup &&
      !allowedFields.some((field) => trUpper(field) === subgroup)
    ) {
      issues.warn(
        table.name,
        `"${subgroup}" tanınmayan bir alan. Geçerli değerler: ${allowedFields.join(", ")}.`,
        excelRow
      );
    }

    classes.push({
      name,
      level: level || null,
      subgroup: subgroup || null,
      description:
        descriptionCol >= 0 ? text(row[descriptionCol]) || null : null,
    });
  });

  return classes;
}

function parseScheduleDays(
  workbook: XLSX.WorkBook,
  classLookup: Map<string, string>,
  issues: IssueCollector
): ParsedScheduleDay[] {
  const table = readTable(workbook, SHEET_NAMES.scheduleDays);
  if (!table) {
    issues.error(
      SHEET_NAMES.scheduleDays,
      `"${SHEET_NAMES.scheduleDays}" sayfası bulunamadı.`
    );
    return [];
  }

  const columns = requireColumns(
    table,
    [
      SCHEDULE_DAY_COLUMNS.className,
      SCHEDULE_DAY_COLUMNS.days,
      SCHEDULE_DAY_COLUMNS.startTime,
      SCHEDULE_DAY_COLUMNS.endTime,
    ],
    issues
  );
  if (!columns) return [];

  const scheduleDays: ParsedScheduleDay[] = [];
  // Bir sınıf-gün çifti yalnızca bir saat aralığına sahip olabilir.
  const seen = new Map<string, number>();

  table.rows.forEach((row, index) => {
    const excelRow = table.firstDataRow + index;
    const rawClassName = text(row[columns[SCHEDULE_DAY_COLUMNS.className]]);
    if (!rawClassName) return;

    const className = classLookup.get(normalizeKey(rawClassName));
    if (!className) {
      issues.error(
        table.name,
        `"${rawClassName}" sınıfı "${SHEET_NAMES.classes}" sayfasında tanımlı değil.`,
        excelRow
      );
      return;
    }

    const startTime = parseTimeCell(row[columns[SCHEDULE_DAY_COLUMNS.startTime]]);
    const endTime = parseTimeCell(row[columns[SCHEDULE_DAY_COLUMNS.endTime]]);
    if (!startTime || !endTime) {
      issues.error(
        table.name,
        `${className}: başlangıç veya bitiş saati okunamadı. SS:DD biçiminde yazın (örnek: 16:40).`,
        excelRow
      );
      return;
    }
    if (endTime <= startTime) {
      issues.error(
        table.name,
        `${className}: bitiş saati (${endTime}) başlangıç saatinden (${startTime}) sonra olmalı.`,
        excelRow
      );
      return;
    }

    const dayCells = splitList(row[columns[SCHEDULE_DAY_COLUMNS.days]]);
    if (dayCells.length === 0) {
      issues.error(
        table.name,
        `${className}: gün belirtilmemiş. Örnek: Pazartesi, Çarşamba`,
        excelRow
      );
      return;
    }

    for (const dayCell of dayCells) {
      const dayOfWeek = parseDayName(dayCell);
      if (dayOfWeek === null) {
        issues.error(
          table.name,
          `"${dayCell}" bir gün adı olarak tanınmadı. Geçerli değerler: ${DAY_NAMES.join(", ")}.`,
          excelRow
        );
        continue;
      }

      const key = `${normalizeKey(className)}:${dayOfWeek}`;
      const previous = seen.get(key);
      if (previous !== undefined) {
        issues.error(
          table.name,
          `${className} için ${DAY_NAMES[dayOfWeek]} günü ${previous}. satırda da tanımlı. Bir gün yalnızca tek saat aralığına sahip olabilir.`,
          excelRow
        );
        continue;
      }
      seen.set(key, excelRow);

      scheduleDays.push({ className, dayOfWeek, startTime, endTime });
    }
  });

  return scheduleDays;
}

function parseDistribution(
  workbook: XLSX.WorkBook,
  classLookup: Map<string, string>,
  subjectLookup: Map<string, string>,
  issues: IssueCollector
): ParsedClassSubject[] {
  const table = readTable(workbook, SHEET_NAMES.distribution);
  if (!table) {
    issues.error(
      SHEET_NAMES.distribution,
      `"${SHEET_NAMES.distribution}" sayfası bulunamadı.`
    );
    return [];
  }
  if (table.headers.length === 0) {
    issues.error(SHEET_NAMES.distribution, "Sayfa boş.");
    return [];
  }

  if (table.headers[0] !== normalizeKey(DISTRIBUTION_ROW_HEADER)) {
    issues.warn(
      table.name,
      `İlk sütunun başlığı "${DISTRIBUTION_ROW_HEADER}" olmalı; ders adları bu sütundan okunuyor.`
    );
  }

  // 1. satırın ikinci hücresinden itibaren sınıf adları yer alır.
  const headerRow = XLSX.utils.sheet_to_json<unknown[]>(
    workbook.Sheets[table.name],
    { header: 1, blankrows: true, defval: null }
  )[0] as unknown[];

  const classColumns: { className: string; index: number }[] = [];
  for (let index = 1; index < headerRow.length; index++) {
    const rawName = text(headerRow[index]);
    if (!rawName) continue;
    const className = classLookup.get(normalizeKey(rawName));
    if (!className) {
      issues.error(
        table.name,
        `Başlık satırındaki "${rawName}" sınıfı "${SHEET_NAMES.classes}" sayfasında tanımlı değil.`,
        1
      );
      continue;
    }
    classColumns.push({ className, index });
  }

  if (classColumns.length === 0) {
    issues.error(
      table.name,
      "Başlık satırında hiç sınıf bulunamadı. İlk satıra B sütunundan itibaren sınıf adlarını yazın."
    );
    return [];
  }

  const result: ParsedClassSubject[] = [];
  const seenSubjects = new Map<string, number>();

  table.rows.forEach((row, index) => {
    const excelRow = table.firstDataRow + index;
    const rawSubjectName = text(row[0]);
    if (!rawSubjectName) return;

    const subjectName = subjectLookup.get(normalizeKey(rawSubjectName));
    if (!subjectName) {
      issues.error(
        table.name,
        `"${rawSubjectName}" dersi "${SHEET_NAMES.subjects}" sayfasında tanımlı değil.`,
        excelRow
      );
      return;
    }

    const previous = seenSubjects.get(normalizeKey(subjectName));
    if (previous !== undefined) {
      issues.error(
        table.name,
        `"${subjectName}" dersi ${previous}. satırda da geçiyor.`,
        excelRow
      );
      return;
    }
    seenSubjects.set(normalizeKey(subjectName), excelRow);

    for (const { className, index: columnIdx } of classColumns) {
      const raw = row[columnIdx];
      if (raw === null || raw === undefined || text(raw) === "") continue;

      const hours = Number(raw);
      if (!Number.isFinite(hours)) {
        issues.error(
          table.name,
          `${className} / ${subjectName}: "${text(raw)}" sayı değil.`,
          excelRow
        );
        continue;
      }
      if (hours < 0 || hours > 40) {
        issues.error(
          table.name,
          `${className} / ${subjectName}: haftalık saat 0–40 aralığında olmalı.`,
          excelRow
        );
        continue;
      }
      if (hours === 0) continue;
      if (!Number.isInteger(hours)) {
        issues.warn(
          table.name,
          `${className} / ${subjectName}: ${hours} tam sayı değil, ${Math.round(hours)} olarak alındı.`,
          excelRow
        );
      }

      result.push({
        className,
        subjectName,
        weeklyHours: Math.round(hours),
        teacherName: null,
      });
    }
  });

  return result;
}

function applyAssignments(
  workbook: XLSX.WorkBook,
  classSubjects: ParsedClassSubject[],
  classLookup: Map<string, string>,
  subjectLookup: Map<string, string>,
  teacherLookup: Map<string, string>,
  issues: IssueCollector
) {
  const table = readTable(workbook, SHEET_NAMES.assignments);
  // Sabit öğretmen ataması isteğe bağlıdır; sayfa yoksa sorun değil.
  if (!table || table.headers.length === 0) return;

  const columns = requireColumns(
    table,
    [
      ASSIGNMENT_COLUMNS.className,
      ASSIGNMENT_COLUMNS.subjectName,
      ASSIGNMENT_COLUMNS.teacherName,
    ],
    issues
  );
  if (!columns) return;

  const byKey = new Map<string, ParsedClassSubject>();
  for (const cs of classSubjects) {
    byKey.set(`${normalizeKey(cs.className)}:${normalizeKey(cs.subjectName)}`, cs);
  }

  table.rows.forEach((row, index) => {
    const excelRow = table.firstDataRow + index;
    const rawClassName = text(row[columns[ASSIGNMENT_COLUMNS.className]]);
    const rawSubjectName = text(row[columns[ASSIGNMENT_COLUMNS.subjectName]]);
    const rawTeacherName = text(row[columns[ASSIGNMENT_COLUMNS.teacherName]]);
    if (!rawClassName && !rawSubjectName && !rawTeacherName) return;

    const className = classLookup.get(normalizeKey(rawClassName));
    const subjectName = subjectLookup.get(normalizeKey(rawSubjectName));
    const teacherName = teacherLookup.get(normalizeKey(rawTeacherName));

    if (!className) {
      issues.error(
        table.name,
        `"${rawClassName}" sınıfı "${SHEET_NAMES.classes}" sayfasında tanımlı değil.`,
        excelRow
      );
      return;
    }
    if (!subjectName) {
      issues.error(
        table.name,
        `"${rawSubjectName}" dersi "${SHEET_NAMES.subjects}" sayfasında tanımlı değil.`,
        excelRow
      );
      return;
    }
    if (!teacherName) {
      issues.error(
        table.name,
        `"${rawTeacherName}" öğretmeni "${SHEET_NAMES.teachers}" sayfasında tanımlı değil.`,
        excelRow
      );
      return;
    }

    const entry = byKey.get(`${normalizeKey(className)}:${normalizeKey(subjectName)}`);
    if (!entry) {
      issues.error(
        table.name,
        `${className} sınıfında ${subjectName} dersi yok. Önce "${SHEET_NAMES.distribution}" sayfasında haftalık saat girin.`,
        excelRow
      );
      return;
    }

    entry.teacherName = teacherName;
  });
}

/**
 * Derso şablonuna uygun bir Excel dosyasını okur.
 *
 * Ayrıştırma hiçbir zaman istisna fırlatmaz: bulunan her sorun `errors` veya
 * `warnings` içinde satır numarasıyla birlikte döner. Böylece kullanıcı
 * dosyasındaki tüm hataları tek seferde görüp düzeltebilir. `errors` boş
 * değilse içe aktarma yapılmamalıdır.
 */
export function parseExcelFile(
  buffer: ArrayBuffer,
  options?: { allowedFields?: string[] }
): ParsedWorkbook {
  const issues = new IssueCollector();
  const allowedFields = options?.allowedFields?.length
    ? options.allowedFields
    : [...DEFAULT_FIELD_NAMES];

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch (error) {
    issues.error(
      "",
      `Dosya okunamadı: ${(error as Error).message}. Geçerli bir .xlsx dosyası seçtiğinizden emin olun.`
    );
    return {
      teachers: [],
      subjects: [],
      classes: [],
      scheduleDays: [],
      classSubjects: [],
      errors: issues.errors,
      warnings: issues.warnings,
    };
  }

  const teachers = parseTeachers(workbook, issues);
  const subjects = parseSubjects(workbook, issues, allowedFields);
  const classes = parseClasses(workbook, issues, allowedFields);

  const teacherLookup = new Map(
    teachers.map((teacher) => [normalizeKey(teacher.name), teacher.name])
  );
  const subjectLookup = new Map(
    subjects.map((subject) => [normalizeKey(subject.name), subject.name])
  );
  const classLookup = new Map(
    classes.map((cls) => [normalizeKey(cls.name), cls.name])
  );

  // Öğretmenlerin verebildiği derslerin gerçekten tanımlı olduğunu doğrula.
  for (const teacher of teachers) {
    const resolved: string[] = [];
    for (const rawName of teacher.subjectNames) {
      const subjectName = subjectLookup.get(normalizeKey(rawName));
      if (!subjectName) {
        issues.error(
          SHEET_NAMES.teachers,
          `${teacher.name}: "${rawName}" dersi "${SHEET_NAMES.subjects}" sayfasında tanımlı değil.`
        );
        continue;
      }
      if (!resolved.includes(subjectName)) resolved.push(subjectName);
    }
    teacher.subjectNames = resolved;
    if (resolved.length === 0) {
      issues.warn(
        SHEET_NAMES.teachers,
        `${teacher.name} için ders tanımlanmamış; otomatik atamada bu öğretmen kullanılamaz.`
      );
    }
  }

  const scheduleDays = parseScheduleDays(workbook, classLookup, issues);
  const classSubjects = parseDistribution(
    workbook,
    classLookup,
    subjectLookup,
    issues
  );
  applyAssignments(
    workbook,
    classSubjects,
    classLookup,
    subjectLookup,
    teacherLookup,
    issues
  );

  // Programı oluşturulamayacak sınıfları önceden bildir.
  const classesWithDays = new Set(scheduleDays.map((day) => day.className));
  const classesWithHours = new Map<string, number>();
  for (const cs of classSubjects) {
    classesWithHours.set(
      cs.className,
      (classesWithHours.get(cs.className) ?? 0) + cs.weeklyHours
    );
  }

  for (const cls of classes) {
    if (!classesWithDays.has(cls.name)) {
      issues.warn(
        SHEET_NAMES.scheduleDays,
        `${cls.name} için ders günü tanımlanmamış; bu sınıfa program oluşturulamaz.`
      );
    }
    if (!classesWithHours.has(cls.name)) {
      issues.warn(
        SHEET_NAMES.distribution,
        `${cls.name} için haftalık ders saati girilmemiş.`
      );
    }
  }

  return {
    teachers,
    subjects,
    classes,
    scheduleDays,
    classSubjects,
    errors: issues.errors,
    warnings: issues.warnings,
  };
}
