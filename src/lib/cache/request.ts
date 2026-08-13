/**
 * İstek içi (React cache) deduplication.
 * Aynı RSC isteğinde membership / settings / fields birden fazla kez
 * sorulursa tek DB round-trip yapılır.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { loadSettings } from "@/lib/settings";
import { loadFields } from "@/lib/fields";
import { loadPlanningData } from "@/lib/planning-data";

/** Cookie’li Supabase istemcisi — istek başına tek örnek. */
export const getRequestSupabase = cache(async () => createClient());

/** Aktif kurum üyeliği — istek başına bir kez. */
export const getRequestMembership = cache(async () => {
  const supabase = await getRequestSupabase();
  return getCurrentMembership(supabase);
});

/** Kurum ayarları — organizationId anahtarlı. */
export const getRequestSettings = cache(async (organizationId: string) => {
  const supabase = await getRequestSupabase();
  return loadSettings(supabase, organizationId);
});

/** Kurum alanları — organizationId anahtarlı. */
export const getRequestFields = cache(async (organizationId: string) => {
  const supabase = await getRequestSupabase();
  return loadFields(supabase, organizationId);
});

/** Dağıtım planlama verisi — organizationId anahtarlı. */
export const getRequestPlanningData = cache(async (organizationId: string) => {
  const supabase = await getRequestSupabase();
  return loadPlanningData(supabase, organizationId);
});
