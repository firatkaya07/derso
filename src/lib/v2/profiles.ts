import type { SupabaseClient } from "@supabase/supabase-js";
import { throwIfDbError } from "@/lib/db-error";
import {
  DEFAULT_WEEKDAY_PROFILE,
  DEFAULT_WEEKEND_PROFILE,
  normalizeBreaks,
  type DayGroup,
  type ScheduleProfileV2,
} from "@/lib/v2/timeline";

interface ProfileRow {
  organization_id: string;
  day_group: DayGroup;
  start_time: string;
  lesson_duration_minutes: number;
  slot_count: number;
  break_minutes: unknown;
}

function parseBreaks(raw: unknown, slotCount: number): number[] {
  const arr = Array.isArray(raw)
    ? raw.map((v) => Number(v))
    : typeof raw === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(raw) as unknown;
            return Array.isArray(parsed) ? parsed.map((v) => Number(v)) : [];
          } catch {
            return [];
          }
        })()
      : [];
  return normalizeBreaks(slotCount, arr);
}

function fromRow(row: ProfileRow): ScheduleProfileV2 {
  const slotCount = row.slot_count;
  return {
    dayGroup: row.day_group,
    startTime: String(row.start_time).slice(0, 5),
    lessonDurationMinutes: row.lesson_duration_minutes,
    slotCount,
    breakMinutes: parseBreaks(row.break_minutes, slotCount),
  };
}

function toRow(organizationId: string, profile: ScheduleProfileV2) {
  const slotCount = Math.min(20, Math.max(1, Math.round(profile.slotCount)));
  return {
    organization_id: organizationId,
    day_group: profile.dayGroup,
    start_time: profile.startTime.slice(0, 5),
    lesson_duration_minutes: Math.min(
      180,
      Math.max(5, Math.round(profile.lessonDurationMinutes))
    ),
    slot_count: slotCount,
    break_minutes: normalizeBreaks(slotCount, profile.breakMinutes),
    updated_at: new Date().toISOString(),
  };
}

export type ScheduleProfilesV2 = {
  weekday: ScheduleProfileV2;
  weekend: ScheduleProfileV2;
};

export const DEFAULT_PROFILES_V2: ScheduleProfilesV2 = {
  weekday: DEFAULT_WEEKDAY_PROFILE,
  weekend: DEFAULT_WEEKEND_PROFILE,
};

export async function ensureScheduleProfilesV2(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  throwIfDbError(
    await supabase.rpc("ensure_schedule_profiles_v2", { p_org: organizationId }),
    "V2 zaman çizelgesi hazırlanamadı"
  );
}

export async function loadScheduleProfilesV2(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ScheduleProfilesV2> {
  await ensureScheduleProfilesV2(supabase, organizationId);
  const { data, error } = await supabase
    .from("schedule_profiles_v2")
    .select(
      "organization_id, day_group, start_time, lesson_duration_minutes, slot_count, break_minutes"
    )
    .eq("organization_id", organizationId);
  if (error || !data?.length) return { ...DEFAULT_PROFILES_V2 };

  const result: ScheduleProfilesV2 = { ...DEFAULT_PROFILES_V2 };
  for (const row of data as ProfileRow[]) {
    const profile = fromRow(row);
    if (profile.dayGroup === "weekday") result.weekday = profile;
    if (profile.dayGroup === "weekend") result.weekend = profile;
  }
  return result;
}

export async function saveScheduleProfilesV2(
  supabase: SupabaseClient,
  organizationId: string,
  profiles: ScheduleProfilesV2
): Promise<void> {
  throwIfDbError(
    await supabase.from("schedule_profiles_v2").upsert(
      [toRow(organizationId, { ...profiles.weekday, dayGroup: "weekday" }),
       toRow(organizationId, { ...profiles.weekend, dayGroup: "weekend" })],
      { onConflict: "organization_id,day_group" }
    ),
    "V2 zaman çizelgesi kaydedilemedi"
  );
}

export async function migrateLessonsToV2(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ copied: number; skipped: number }> {
  const { data, error } = await supabase.rpc("migrate_lessons_to_v2", {
    p_org: organizationId,
  });
  throwIfDbError({ error }, "V1 dersleri V2'ye aktarılamadı");
  const result = (data ?? {}) as { copied?: number; skipped?: number };
  return {
    copied: Number(result.copied ?? 0),
    skipped: Number(result.skipped ?? 0),
  };
}
