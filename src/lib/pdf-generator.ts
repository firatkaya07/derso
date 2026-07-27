import { DAY_NAMES } from "./types";

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

function getActiveDays(lessons: LessonData[]): number[] {
  const days = new Set<number>();
  for (const l of lessons) days.add(l.dayOfWeek);
  return [...days].sort((a, b) => a - b);
}

function getMaxSlots(lessons: LessonData[]): number {
  let max = 0;
  for (const l of lessons) {
    if (l.slotIndex + 1 > max) max = l.slotIndex + 1;
  }
  return max;
}

export function prepareLessons(
  rawLessons: Array<{
    class_id: string;
    subject_id: string;
    teacher_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    class?: { id: string; name: string };
    subject?: { id: string; name: string; short_name: string | null };
    teacher?: { id: string; name: string };
  }>,
  allSlots: Map<string, { start: string; end: string }[]>
): LessonData[] {
  return rawLessons.map((l) => {
    const classId = l.class_id;
    const slots = allSlots.get(classId) || [];
    const slotIndex = slots.findIndex((s) => s.start === l.start_time);
    return {
      classId,
      className: l.class?.name || "",
      subjectId: l.subject_id,
      subjectName: l.subject?.name || "",
      subjectShortName: l.subject?.short_name || l.subject?.name || "",
      teacherId: l.teacher_id,
      teacherName: l.teacher?.name || "",
      dayOfWeek: l.day_of_week,
      startTime: l.start_time,
      endTime: l.end_time,
      slotIndex: slotIndex >= 0 ? slotIndex : 0,
    };
  });
}

function openPrintWindow(html: string, title: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.onload = () => {
      w.document.title = title;
      setTimeout(() => w.print(), 300);
    };
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
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
export function generateSinifCarsafPdf(lessons: LessonData[]) {
  const activeDays = getActiveDays(lessons);
  const maxSlots = getMaxSlots(lessons);
  const classes = [...new Set(lessons.map((l) => l.className))].sort((a, b) =>
    a.localeCompare(b, "tr")
  );

  let tableHtml = `<tr><th rowspan="2" style="width:100px">Sınıf</th>`;
  for (const day of activeDays) {
    tableHtml += `<th colspan="${maxSlots}">${DAY_NAMES_UPPER[day]}</th>`;
  }
  tableHtml += `</tr><tr>`;
  for (const _day of activeDays) {
    for (let s = 0; s < maxSlots; s++) {
      tableHtml += `<th style="width:30px">${s + 1}</th>`;
    }
  }
  tableHtml += `</tr>`;

  for (const cls of classes) {
    tableHtml += `<tr><td style="font-size:10px">${cls}</td>`;
    for (const day of activeDays) {
      for (let s = 0; s < maxSlots; s++) {
        const lesson = lessons.find(
          (l) => l.className === cls && l.dayOfWeek === day && l.slotIndex === s
        );
        tableHtml += `<td style="font-size:9px">${lesson ? lesson.subjectShortName : ""}</td>`;
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
    <h1>SINIF ÇARŞAF LİSTESİ</h1>
    <div class="date">Tarih: ${formatDate()}</div>
    <table>${tableHtml}</table>
  </body></html>`;

  openPrintWindow(html, "Sınıf Çarşaf Listesi");
}

// 2. ÖĞRETMEN ÇARŞAF LİSTESİ
export function generateOgretmenCarsafPdf(lessons: LessonData[]) {
  const activeDays = getActiveDays(lessons);
  const maxSlots = getMaxSlots(lessons);
  const teacherNames = [
    ...new Set(lessons.filter((l) => l.teacherName).map((l) => l.teacherName)),
  ].sort((a, b) => a.localeCompare(b, "tr"));

  let tableHtml = `<tr><th rowspan="2" style="width:110px">Öğretmen</th>`;
  for (const day of activeDays) {
    tableHtml += `<th colspan="${maxSlots}">${DAY_NAMES_UPPER[day]}</th>`;
  }
  tableHtml += `</tr><tr>`;
  for (const _day of activeDays) {
    for (let s = 0; s < maxSlots; s++) {
      tableHtml += `<th style="width:24px;font-size:8px">${s + 1}</th>`;
    }
  }
  tableHtml += `</tr>`;

  for (const teacher of teacherNames) {
    tableHtml += `<tr><td style="font-size:9px;text-align:left;padding-left:5px">${teacher}</td>`;
    for (const day of activeDays) {
      for (let s = 0; s < maxSlots; s++) {
        const lesson = lessons.find(
          (l) =>
            l.teacherName === teacher &&
            l.dayOfWeek === day &&
            l.slotIndex === s
        );
        tableHtml += `<td style="font-size:7px">${lesson ? lesson.className : ""}</td>`;
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
    <h1>ÖĞRETMEN ÇARŞAF LİSTESİ</h1>
    <div class="date">Tarih: ${formatDate()}</div>
    <table>${tableHtml}</table>
  </body></html>`;

  openPrintWindow(html, "Öğretmen Çarşaf Listesi");
}

// 3. SINIF DERS PROGRAMLARI
export function generateSinifDersProgramlariPdf(lessons: LessonData[]) {
  const classes = [...new Set(lessons.map((l) => l.className))].sort((a, b) =>
    a.localeCompare(b, "tr")
  );
  const activeDays = getActiveDays(lessons);
  const maxSlots = getMaxSlots(lessons);

  let pagesHtml = "";

  for (let ci = 0; ci < classes.length; ci++) {
    const cls = classes[ci];
    const classLessons = lessons.filter((l) => l.className === cls);

    let scheduleTable = `<tr><th style="width:60px">Saat</th>`;
    for (const day of activeDays) {
      scheduleTable += `<th>${DAY_NAMES[day]}</th>`;
    }
    scheduleTable += `</tr>`;

    for (let s = 0; s < maxSlots; s++) {
      scheduleTable += `<tr><td>${s + 1}. Ders</td>`;
      for (const day of activeDays) {
        const lesson = classLessons.find(
          (l) => l.dayOfWeek === day && l.slotIndex === s
        );
        if (lesson) {
          scheduleTable += `<td><div style="font-size:11px;font-weight:bold">${lesson.subjectShortName}</div><div style="font-size:9px;color:#333">${lesson.teacherName}</div></td>`;
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
      infoTable += `<tr><td style="text-align:left;padding-left:8px">${s.name}</td><td>${s.hours}</td><td>${s.teacher}</td></tr>`;
    }

    pagesHtml += `
      ${ci > 0 ? '<div class="page-break"></div>' : ""}
      <div class="page">
        <div style="text-align:center;margin-bottom:3px;font-size:11px">T.C.</div>
        <h2 style="text-align:center;font-size:15px;margin-bottom:3px">${cls} SINIFI HAFTALIK DERS PROGRAMI</h2>
        <div style="text-align:center;font-size:10px;margin-bottom:12px">Tarih: ${formatDate()}</div>
        <table style="margin-bottom:15px">${scheduleTable}</table>
        <div style="font-weight:bold;font-size:11px;margin-bottom:5px">Ders ve Öğretmen Bilgileri</div>
        <table style="width:auto;min-width:60%">${infoTable}</table>
        <div style="position:relative;margin-top:60px;display:flex;justify-content:space-between;padding:0 30px">
          <div style="text-align:center">
            <div style="border-top:1px solid #000;width:150px;margin-bottom:5px"></div>
            <div style="font-weight:bold;font-size:10px">Sınıf Rehber Öğretmeni</div>
          </div>
          <div style="text-align:center">
            <div style="border-top:1px solid #000;width:150px;margin-bottom:5px"></div>
            <div style="font-weight:bold;font-size:10px">Okul Müdürü</div>
          </div>
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

  openPrintWindow(html, "Sınıf Ders Programları");
}

// 4. ÖĞRETMEN PROGRAMLARI LİSTESİ
export function generateOgretmenProgramlariPdf(lessons: LessonData[]) {
  const teacherNames = [
    ...new Set(lessons.filter((l) => l.teacherName).map((l) => l.teacherName)),
  ].sort((a, b) => a.localeCompare(b, "tr"));
  const activeDays = getActiveDays(lessons);
  const maxSlots = getMaxSlots(lessons);
  const yr = new Date().getFullYear();

  let pagesHtml = "";

  for (let ti = 0; ti < teacherNames.length; ti++) {
    const teacher = teacherNames[ti];
    const tLessons = lessons.filter((l) => l.teacherName === teacher);
    const totalHours = tLessons.length;

    let scheduleTable = `<tr><th style="width:60px">Saat</th>`;
    for (const day of activeDays) {
      scheduleTable += `<th>${DAY_NAMES[day]}</th>`;
    }
    scheduleTable += `</tr>`;

    for (let s = 0; s < maxSlots; s++) {
      scheduleTable += `<tr><td>${s + 1}. Ders</td>`;
      for (const day of activeDays) {
        const lesson = tLessons.find(
          (l) => l.dayOfWeek === day && l.slotIndex === s
        );
        if (lesson) {
          scheduleTable += `<td><div style="font-size:10px">${lesson.className}</div><div style="font-size:9px;color:#333">${lesson.subjectShortName}</div></td>`;
        } else {
          scheduleTable += `<td></td>`;
        }
      }
      scheduleTable += `</tr>`;
    }

    pagesHtml += `
      ${ti > 0 ? '<div class="page-break"></div>' : ""}
      <div class="page">
        <div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:12px">T.C.</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <div>
            <div style="font-size:10px">Sayı  : .......................</div>
            <div style="font-size:10px">Konu : Haftalık Ders Programı</div>
          </div>
          <div style="font-size:10px">Tarih: ${formatDate()}</div>
        </div>
        <div style="font-weight:bold;font-size:12px;margin:15px 0 8px">Sayın ${teacher},</div>
        <div style="font-size:10px;line-height:1.5;margin-bottom:5px">
          ${yr - 1}-${yr} Eğitim-Öğretim Yılında ${formatDate()} tarihinden itibaren uygulanacak programda haftalık ders dağılımınız aşağıya çıkartılmıştır.
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
            <div style="font-weight:bold;font-size:9px">Müdür Yardımcısı</div>
          </div>
          <div style="text-align:center">
            <div style="font-weight:bold;font-size:10px">OLUR</div>
            <div style="font-size:9px;margin:4px 0">..... / ..... / .........</div>
            <div style="font-weight:bold;font-size:9px">Okul Müdürü</div>
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

  openPrintWindow(html, "Öğretmen Programları");
}
