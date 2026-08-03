import type { SupabaseClient } from "@supabase/supabase-js";
import { throwIfDbError } from "./db-error";

export interface FieldRow {
  id: string;
  organization_id: string;
  name: string;
  sort_order: number;
}

/** Migration / boş kurum için yedek liste. */
export const DEFAULT_FIELD_NAMES = [
  "TM",
  "MF",
  "SAY",
  "SÖZ",
  "DİL",
  "HİBRİT",
] as const;

export async function loadFields(
  supabase: SupabaseClient,
  organizationId: string
): Promise<FieldRow[]> {
  const result = await supabase
    .from("fields")
    .select("id, organization_id, name, sort_order")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  throwIfDbError(result, "Alanlar okunamadı");
  return result.data ?? [];
}

export function fieldNamesOf(rows: FieldRow[]): string[] {
  return rows.map((row) => row.name);
}

export async function createField(
  supabase: SupabaseClient,
  organizationId: string,
  name: string
): Promise<FieldRow> {
  const clean = name.trim().toLocaleUpperCase("tr-TR");
  if (!clean) throw new Error("Alan adı boş olamaz.");

  const existing = await supabase
    .from("fields")
    .select("sort_order")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: false })
    .limit(1);
  throwIfDbError(existing, "Alanlar okunamadı");
  const nextOrder = (existing.data?.[0]?.sort_order ?? 0) + 1;

  const result = await supabase
    .from("fields")
    .insert({
      organization_id: organizationId,
      name: clean,
      sort_order: nextOrder,
    })
    .select("id, organization_id, name, sort_order")
    .single();
  throwIfDbError(result, "Alan eklenemedi");
  return result.data!;
}

export async function deleteField(
  supabase: SupabaseClient,
  fieldId: string
): Promise<void> {
  throwIfDbError(
    await supabase.from("fields").delete().eq("id", fieldId),
    "Alan silinemedi"
  );
}
