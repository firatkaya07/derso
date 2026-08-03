/**
 * Tek bir senaryoyu çözüp neyin tıkandığını ayrıntılı raporlar.
 *
 *   npx vite-node -c vitest.config.mts scripts/debug-scheduler.ts "Dolu program"
 */
import { autoSchedule, DEFAULT_RULES } from "../src/lib/scheduler";
import { generateTimeSlots } from "../src/lib/types";
import {
  NO_TEACHER_SCENARIO,
  OVERSUBSCRIBED_SCENARIO,
  SCENARIOS,
} from "../tests/helpers/scenarios";

const needle = process.argv[2] ?? "Dolu";
const scenario = [...SCENARIOS, OVERSUBSCRIBED_SCENARIO, NO_TEACHER_SCENARIO].find(
  (s) => s.name.toLowerCase().includes(needle.toLowerCase())
);
if (!scenario) throw new Error(`Senaryo bulunamadı: ${needle}`);

const result = autoSchedule(
  scenario.classes,
  scenario.scheduleDays,
  scenario.subjects,
  scenario.classSubjects,
  DEFAULT_RULES,
  scenario.teacherSubjects,
  scenario.teachers,
  1,
  { restarts: 8, maxIterations: 40000, timeLimitMs: 20000 }
);

console.log(`\n=== ${scenario.name} ===`);
console.log(
  `yerleşen ${result.stats.placedHours}/${result.stats.totalHours}` +
    ` (üst sınır ${result.stats.maxPlaceableHours})`
);
console.log(`süre ${result.stats.elapsedMs} ms, adım ${result.stats.iterationsUsed}`);

console.log("\n-- olurluk uyarıları --");
for (const issue of result.feasibility.issues) console.log("  " + issue.message);
if (result.feasibility.issues.length === 0) console.log("  yok");

console.log("\n-- yerleşemeyenler --");
for (const item of result.unplaced) {
  console.log(`  ${item.className} - ${item.subjectName}: ${item.hours} saat (${item.reason})`);
}
if (result.unplaced.length === 0) console.log("  yok");

// Öğretmen doluluk oranları
const slotsPerClass = new Map<string, number>();
for (const day of scenario.scheduleDays) {
  slotsPerClass.set(
    day.class_id,
    (slotsPerClass.get(day.class_id) ?? 0) +
      generateTimeSlots(day.start_time, day.end_time).length
  );
}

const allSlots = new Set<string>();
for (const day of scenario.scheduleDays) {
  for (const slot of generateTimeSlots(day.start_time, day.end_time)) {
    allSlots.add(`${day.day_of_week}:${slot.start}`);
  }
}

console.log("\n-- öğretmen doluluğu (ders saati / müsait slot) --");
const loadById = new Map(
  result.stats.teacherLoads.map((load) => [load.teacherId, load.totalHours])
);
const bySubject = new Map<string, { used: number; available: number; count: number }>();
for (const teacher of scenario.teachers) {
  const available = [...allSlots].filter(
    (slot) => !teacher.off_days.includes(Number(slot.split(":")[0]))
  ).length;
  const used = loadById.get(teacher.id) ?? 0;
  const key = teacher.specialization ?? "?";
  const entry = bySubject.get(key) ?? { used: 0, available: 0, count: 0 };
  entry.used += used;
  entry.available += available;
  entry.count += 1;
  bySubject.set(key, entry);
}

for (const [subject, entry] of bySubject) {
  const demand = scenario.classSubjects
    .filter((cs) => cs.subjectName === subject)
    .reduce((sum, cs) => sum + cs.weeklyHours, 0);
  console.log(
    `  ${subject}: talep ${demand}, atanan ${entry.used}, ` +
      `${entry.count} öğretmenin müsait slot toplamı ${entry.available}` +
      ` (doluluk %${((demand / entry.available) * 100).toFixed(0)})`
  );
}

// Sınıf başına doluluk
console.log("\n-- sınıf doluluğu --");
const placedByClass = new Map<string, number>();
for (const lesson of result.lessons) {
  placedByClass.set(lesson.classId, (placedByClass.get(lesson.classId) ?? 0) + 1);
}
for (const cls of scenario.classes) {
  const demand = scenario.classSubjects
    .filter((cs) => cs.classId === cls.id)
    .reduce((sum, cs) => sum + cs.weeklyHours, 0);
  const placed = placedByClass.get(cls.id) ?? 0;
  if (placed < demand) {
    console.log(
      `  ${cls.name}: ${placed}/${demand} (kapasite ${slotsPerClass.get(cls.id)})`
    );
  }
}
