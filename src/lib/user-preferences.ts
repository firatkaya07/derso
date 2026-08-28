import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_EDITION,
  parseEdition,
  type ScheduleEdition,
} from "@/lib/edition";

export async function loadScheduleEdition(
  supabase: SupabaseClient,
  userId: string
): Promise<ScheduleEdition> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("schedule_edition")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_EDITION;
  return parseEdition(data.schedule_edition);
}

export async function saveScheduleEdition(
  supabase: SupabaseClient,
  userId: string,
  edition: ScheduleEdition
): Promise<void> {
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      schedule_edition: edition,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    throw new Error(error.message || "Sürüm tercihi kaydedilemedi");
  }
}
