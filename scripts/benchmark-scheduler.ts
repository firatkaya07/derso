/**
 * Çizelgeleme algoritmasının başarımını ölçer.
 *
 *   npx vite-node -c vitest.config.mts scripts/benchmark-scheduler.ts [restarts]
 *
 * Her senaryo için yerleşen ders saati oranı, teorik üst sınır, geçen süre ve
 * kısıt ihlalleri raporlanır. Kısıt ihlali her zaman sıfır olmalıdır: çözücü
 * geçersiz bir program üretmemelidir.
 */
import { autoSchedule, DEFAULT_RULES } from "../src/lib/scheduler";
import {
  classCapacity,
  NO_TEACHER_SCENARIO,
  OVERSUBSCRIBED_SCENARIO,
  SCENARIOS,
  totalDemand,
  type Scenario,
} from "../tests/helpers/scenarios";

interface Report {
  scenario: string;
  totalHours: number;
  capacity: number;
  maxPlaceable: number;
  placed: number;
  classConflicts: number;
  teacherConflicts: number;
  offDayViolations: number;
  outsideHours: number;
  splitCourses: number;
  ms: number;
}

function run(scenario: Scenario, restarts: number): Report {
  const totalHours = totalDemand(scenario);
  const started = Date.now();

  const result = autoSchedule(
    scenario.classes,
    scenario.scheduleDays,
    scenario.subjects,
    scenario.classSubjects,
    DEFAULT_RULES,
    scenario.teacherSubjects,
    scenario.teachers,
    1,
    { restarts, maxIterations: 40000, timeLimitMs: 20000 }
  );

  const ms = Date.now() - started;
  const lessons = result.lessons;

  const classSlots = new Set<string>();
  const teacherSlots = new Set<string>();
  let classConflicts = 0;
  let teacherConflicts = 0;
  let offDayViolations = 0;
  let outsideHours = 0;

  const teacherById = new Map(scenario.teachers.map((t) => [t.id, t]));
  const daysByClass = new Map<string, typeof scenario.scheduleDays>();
  for (const day of scenario.scheduleDays) {
    const list = daysByClass.get(day.class_id) ?? [];
    list.push(day);
    daysByClass.set(day.class_id, list);
  }

  // Bir sınıf-ders çiftinin birden çok öğretmene bölünmesi istenmez.
  const teachersByCourse = new Map<string, Set<string>>();

  for (const lesson of lessons) {
    const slot = `${lesson.dayOfWeek}:${lesson.startTime}`;
    const classKey = `${lesson.classId}:${slot}`;
    if (classSlots.has(classKey)) classConflicts++;
    classSlots.add(classKey);

    if (lesson.teacherId) {
      const teacherKey = `${lesson.teacherId}:${slot}`;
      if (teacherSlots.has(teacherKey)) teacherConflicts++;
      teacherSlots.add(teacherKey);

      const teacher = teacherById.get(lesson.teacherId);
      if (teacher?.off_days.includes(lesson.dayOfWeek)) offDayViolations++;

      const courseKey = `${lesson.classId}:${lesson.subjectId}`;
      const set = teachersByCourse.get(courseKey) ?? new Set<string>();
      set.add(lesson.teacherId);
      teachersByCourse.set(courseKey, set);
    } else {
      offDayViolations++;
    }

    const day = (daysByClass.get(lesson.classId) ?? []).find(
      (d) => d.day_of_week === lesson.dayOfWeek
    );
    if (
      !day ||
      lesson.startTime < day.start_time.slice(0, 5) ||
      lesson.endTime > day.end_time.slice(0, 5)
    ) {
      outsideHours++;
    }
  }

  const splitCourses = [...teachersByCourse.values()].filter(
    (set) => set.size > 1
  ).length;

  return {
    scenario: scenario.name,
    totalHours,
    capacity: classCapacity(scenario),
    maxPlaceable: result.stats.maxPlaceableHours,
    placed: lessons.length,
    classConflicts,
    teacherConflicts,
    offDayViolations,
    outsideHours,
    splitCourses,
    ms,
  };
}

const restarts = Number(process.argv[2] ?? 12);
const reports = [
  ...SCENARIOS,
  OVERSUBSCRIBED_SCENARIO,
  NO_TEACHER_SCENARIO,
].map((scenario) => run(scenario, restarts));

console.log(`\nYeniden başlatma sayısı: ${restarts}\n`);
let allOptimal = true;
for (const report of reports) {
  const rate = ((report.placed / report.totalHours) * 100).toFixed(1);
  const optimalRate = (
    (report.maxPlaceable / report.totalHours) *
    100
  ).toFixed(1);
  const optimal = report.placed >= report.maxPlaceable;
  if (!optimal) allOptimal = false;

  console.log(report.scenario);
  console.log(
    `  kapasite ${report.capacity} slot / talep ${report.totalHours} saat` +
      ` (doluluk %${((report.totalHours / report.capacity) * 100).toFixed(0)})`
  );
  console.log(
    `  yerleşen ${report.placed}/${report.totalHours} → %${rate}` +
      `  (üst sınır %${optimalRate})  ${optimal ? "✓ üst sınıra ulaşıldı" : "✗ üst sınırın altında"}`
  );
  console.log(
    `  ihlaller: sınıf ${report.classConflicts}, öğretmen ${report.teacherConflicts},` +
      ` izin günü ${report.offDayViolations}, saat dışı ${report.outsideHours},` +
      ` bölünmüş ders ${report.splitCourses}`
  );
  console.log(`  süre ${report.ms} ms\n`);
}

console.log(
  allOptimal
    ? "Tüm senaryolarda teorik üst sınıra ulaşıldı."
    : "Bazı senaryolarda üst sınırın altında kalındı."
);
