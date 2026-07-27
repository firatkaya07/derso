import * as XLSX from "xlsx";

export interface ParsedTeacher {
  name: string;
  specialization: string;
  offDays: number[];
}

export interface ParsedClassScheduleDay {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ParsedClassInfo {
  name: string;
  days: ParsedClassScheduleDay[];
}

export interface ParsedSubjectHours {
  subjectName: string;
  className: string;
  weeklyHours: number;
}

export interface ParsedData {
  teachers: ParsedTeacher[];
  classes: ParsedClassInfo[];
  subjectHours: ParsedSubjectHours[];
  subjects: string[];
}

const DAY_MAP: Record<string, number> = {
  pazartesi: 0,
  pazartes: 0,
  salı: 1,
  sali: 1,
  çarşamba: 2,
  carsamba: 2,
  perşembe: 3,
  persembe: 3,
  cuma: 4,
  cumartesi: 5,
  pazar: 6,
};

function parseDayName(name: string): number | undefined {
  return DAY_MAP[name.toLowerCase().trim()];
}

function parseTimeRange(str: string): { start: string; end: string } | null {
  if (!str) return null;
  const s = String(str).trim();
  const match = s.match(/(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})/);
  if (!match) return null;
  return {
    start: `${match[1].padStart(2, "0")}:${match[2]}`,
    end: `${match[3].padStart(2, "0")}:${match[4]}`,
  };
}

function normalizeClassName(name: string): string {
  return name
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace("ARİ", "ARI")
    .replace("ARI", "ARI");
}

function parseTeachers(wb: XLSX.WorkBook): ParsedTeacher[] {
  const sheet = wb.Sheets[wb.SheetNames[2]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const teachers: ParsedTeacher[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    const spec = String(row[1] || "").trim();
    const offStr = String(row[2] || "").trim();
    const offDays = offStr
      .split("-")
      .map((d) => parseDayName(d))
      .filter((d): d is number => d !== undefined);
    teachers.push({ name, specialization: spec, offDays });
  }

  return teachers;
}

function parseSubjectsAndHours(wb: XLSX.WorkBook): {
  subjects: string[];
  subjectHours: ParsedSubjectHours[];
  classNames: string[];
} {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { subjects: [], subjectHours: [], classNames: [] };
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  const classRow = rows[3] as unknown[];
  if (!classRow) return { subjects: [], subjectHours: [], classNames: [] };

  const classColMap: { name: string; col: number }[] = [];
  for (let col = 1; col <= 50; col++) {
    if (
      classRow[col] !== undefined &&
      classRow[col] !== null &&
      String(classRow[col]).trim()
    ) {
      classColMap.push({ name: String(classRow[col]).trim(), col });
    }
  }

  const subjects: string[] = [];
  const subjectHours: ParsedSubjectHours[] = [];

  for (let r = 4; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (!row || !row[0]) continue;
    const val = String(row[0]).trim();
    if (!val || val === "NaN") continue;

    let isTotal = false;
    for (const { col } of classColMap) {
      const v = row[col];
      if (v !== undefined && v !== null && !isNaN(Number(v)) && Number(v) > 10) {
        isTotal = true;
        break;
      }
    }
    if (isTotal) {
      let allHigh = true;
      for (const { col } of classColMap.slice(0, 5)) {
        const v = row[col];
        if (v !== undefined && v !== null && Number(v) < 8) {
          allHigh = false;
          break;
        }
      }
      if (allHigh) continue;
    }

    if (/^\d+$/.test(val)) continue;

    subjects.push(val);
    for (const { name: className, col } of classColMap) {
      const hours = row[col];
      if (
        hours !== undefined &&
        hours !== null &&
        !isNaN(Number(hours)) &&
        Number(hours) > 0
      ) {
        subjectHours.push({
          subjectName: val,
          className,
          weeklyHours: Math.round(Number(hours)),
        });
      }
    }
  }

  return {
    subjects: [...new Set(subjects)],
    subjectHours,
    classNames: classColMap.map((c) => c.name),
  };
}

interface SectionInfo {
  weekdayTime: { start: string; end: string } | null;
  weekendTime: { start: string; end: string } | null;
  classEntries: {
    classNames: string[];
    days: number[];
    hoursPerDay: number[];
  }[];
}

function parseClassSchedules(wb: XLSX.WorkBook): ParsedClassInfo[] {
  const sheet = wb.Sheets[wb.SheetNames[1]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  const sections: SectionInfo[] = [];
  let currentSection: SectionInfo | null = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row) continue;

    const col0 = row[0] ? String(row[0]).trim() : "";
    const col1 = row[1] ? String(row[1]).trim() : "";
    const col3 = row[3] ? String(row[3]).trim() : "";
    const col4 = row[4] ? String(row[4]).trim() : "";

    if (
      col0.match(/^\d+\.\s*S[IİıiÝý]N[IİıiÝý]F/i) ||
      col0.match(/^MEZUN/i)
    ) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        weekdayTime: null,
        weekendTime: null,
        classEntries: [],
      };
      continue;
    }

    if (!col0 && !col1) {
      const timeRange = parseTimeRange(col4);
      if (timeRange && currentSection && !currentSection.weekendTime) {
        currentSection.weekendTime = timeRange;
      }
      continue;
    }

    if (!col0) continue;
    if (!currentSection) {
      currentSection = {
        weekdayTime: null,
        weekendTime: null,
        classEntries: [],
      };
    }

    const classNames = col0.split("-").map((s) => s.trim());
    const dayNames = col1 ? col1.split("-").map((d) => d.trim()) : [];
    const days = dayNames
      .map((d) => parseDayName(d))
      .filter((d): d is number => d !== undefined);

    const hoursStr = row[2] ? String(row[2]).trim() : "";
    const hoursPerDay = hoursStr
      .split("+")
      .map(Number)
      .filter((n) => !isNaN(n));

    const timeRange = parseTimeRange(col4);

    if (col3.includes("HAFTA İÇİ") && timeRange && currentSection) {
      currentSection.weekdayTime = timeRange;
    }
    if (col3.includes("HAFTA SONU") && timeRange && currentSection) {
      currentSection.weekendTime = timeRange;
    }
    if (!col3 && timeRange && currentSection && !currentSection.weekdayTime) {
      currentSection.weekdayTime = timeRange;
    }

    if (days.length > 0) {
      currentSection.classEntries.push({ classNames, days, hoursPerDay });
    } else if (
      currentSection.classEntries.length > 0 &&
      classNames.length > 0
    ) {
      const prevEntry =
        currentSection.classEntries[currentSection.classEntries.length - 1];
      currentSection.classEntries.push({
        classNames,
        days: prevEntry.days,
        hoursPerDay: prevEntry.hoursPerDay,
      });
    }
  }

  if (currentSection) sections.push(currentSection);

  const classScheduleMap = new Map<string, ParsedClassScheduleDay[]>();

  for (const section of sections) {
    const wdTime = section.weekdayTime || { start: "16:40", end: "19:50" };
    const weTime = section.weekendTime || { start: "08:30", end: "13:30" };

    for (const entry of section.classEntries) {
      const schedule: ParsedClassScheduleDay[] = [];
      for (let d = 0; d < entry.days.length; d++) {
        const dayOfWeek = entry.days[d];
        const time = dayOfWeek >= 5 ? weTime : wdTime;
        schedule.push({
          dayOfWeek,
          startTime: time.start,
          endTime: time.end,
        });
      }
      for (const name of entry.classNames) {
        const normalized = normalizeClassName(name);
        classScheduleMap.set(normalized, schedule);
      }
    }
  }

  return Array.from(classScheduleMap.entries()).map(([name, days]) => ({
    name,
    days,
  }));
}

export function parseExcelFile(buffer: ArrayBuffer): ParsedData {
  const wb = XLSX.read(buffer, { type: "array" });

  const teachers = parseTeachers(wb);
  const { subjects, subjectHours, classNames } = parseSubjectsAndHours(wb);
  const parsedSchedules = parseClassSchedules(wb);

  const scheduleMap = new Map<string, ParsedClassScheduleDay[]>();
  for (const ps of parsedSchedules) {
    scheduleMap.set(ps.name, ps.days);
  }

  const classes: ParsedClassInfo[] = [];
  const seen = new Set<string>();

  for (const rawName of classNames) {
    const normalized = normalizeClassName(rawName);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const schedule = scheduleMap.get(normalized);
    classes.push({
      name: rawName,
      days: schedule || [],
    });
  }

  return { teachers, classes, subjectHours, subjects };
}
