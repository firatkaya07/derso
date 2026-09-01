import type { ScheduleEdition } from "@/lib/edition";
import { createClient } from "@/lib/supabase/client";

export type UsageEventType =
  | "download"
  | "schedule_start"
  | "schedule_complete"
  | "schedule_save";

export type UsageEventInput = {
  organizationId: string;
  eventType: UsageEventType;
  edition?: ScheduleEdition;
  artifact?: string;
  format?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

/**
 * İndirme ve ders dağıtımı kullanımını kuruma bağlar.
 * Analytics (GA) yerine admin raporlarının kaynağıdır; hata olursa sessizce
 * yutulur — asıl kullanıcı işlemini bozmamalı.
 */
export async function recordUsageEvent(
  input: UsageEventInput
): Promise<void> {
  if (!input.organizationId) return;
  try {
    const supabase = createClient();
    await supabase.rpc("record_usage_event", {
      p_organization_id: input.organizationId,
      p_event_type: input.eventType,
      p_edition: input.edition ?? "v1",
      p_artifact: input.artifact ?? null,
      p_format: input.format ?? null,
      p_metadata: input.metadata ?? {},
    });
  } catch {
    // no-op
  }
}

/** Fire-and-forget sarmalayıcı. */
export function reportUsage(input: UsageEventInput): void {
  void recordUsageEvent(input);
}
