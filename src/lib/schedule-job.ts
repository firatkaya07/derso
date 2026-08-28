import type { PlanningData } from "@/lib/planning-data";
import type { ScheduleResult } from "@/lib/scheduler";
import {
  DEFAULT_RULES,
  type ScheduleRules,
  type ClassSubjectInput,
} from "@/lib/scheduler/model";
import type { Subject } from "@/lib/types";

/** Bir turdaki onarım adımı üst sınırı. */
export const ITERATIONS_PER_ROUND = 40000;
/** Bir turun süre sınırı; arayüzün donmaması için kısa tutulur. */
export const ROUND_TIME_LIMIT_MS = 1200;

export const SCHEDULE_JOB_STORAGE_KEY = "derso:schedule-job";
export const SCHEDULE_JOB_STORAGE_KEY_V2 = "derso:schedule-job-v2";

export interface RoundLog {
  round: number;
  placedHours: number;
  bestHours: number;
  warningCount: number;
}

export interface ScheduleJobConfig {
  rules: ScheduleRules;
  rounds: number;
  createdAt: number;
}

/** Daha çok saat yerleştiren, eşitlikte daha az uyarı üreten sonuç iyidir. */
export function isBetterSchedule(
  candidate: ScheduleResult,
  current: ScheduleResult
): boolean {
  if (candidate.stats.placedHours !== current.stats.placedHours) {
    return candidate.stats.placedHours > current.stats.placedHours;
  }
  return candidate.warnings.length < current.warnings.length;
}

export function toClassSubjectInputs(data: PlanningData): ClassSubjectInput[] {
  return data.classSubjects.map((cs) => ({
    classId: cs.class_id,
    subjectId: cs.subject_id,
    subjectName:
      (cs.subject as unknown as Subject)?.name ||
      data.subjects.find((s) => s.id === cs.subject_id)?.name ||
      "",
    weeklyHours: cs.weekly_hours,
    teacherId: cs.teacher_id,
  }));
}

export function writeScheduleJob(config: ScheduleJobConfig): void {
  sessionStorage.setItem(SCHEDULE_JOB_STORAGE_KEY, JSON.stringify(config));
}

export function writeScheduleJobV2(config: ScheduleJobConfig): void {
  sessionStorage.setItem(SCHEDULE_JOB_STORAGE_KEY_V2, JSON.stringify(config));
}

function parseJob(raw: string | null): ScheduleJobConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ScheduleJobConfig;
    if (!parsed?.rules || !parsed.rounds) return null;
    return {
      rules: { ...DEFAULT_RULES, ...parsed.rules },
      rounds: Math.min(2000, Math.max(1, Number(parsed.rounds) || 10)),
      createdAt: parsed.createdAt || Date.now(),
    };
  } catch {
    return null;
  }
}

export function readScheduleJob(): ScheduleJobConfig | null {
  try {
    return parseJob(sessionStorage.getItem(SCHEDULE_JOB_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readScheduleJobV2(): ScheduleJobConfig | null {
  try {
    return parseJob(sessionStorage.getItem(SCHEDULE_JOB_STORAGE_KEY_V2));
  } catch {
    return null;
  }
}

export function clearScheduleJob(): void {
  sessionStorage.removeItem(SCHEDULE_JOB_STORAGE_KEY);
}

export function clearScheduleJobV2(): void {
  sessionStorage.removeItem(SCHEDULE_JOB_STORAGE_KEY_V2);
}
