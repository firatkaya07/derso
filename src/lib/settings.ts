import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRelationError, throwIfDbError } from "./db-error";
import { DEFAULT_SLOT_TIMING, type SlotTiming } from "./types";

/** Kurum geneli tanımlar. Veritabanında kurum başına bir satır tutulur. */
export interface AppSettings {
  province: string | null;
  district: string | null;
  institutionName: string | null;
  principalName: string | null;
  vicePrincipalName: string | null;
  /** 100x100 piksele ölçeklenmiş logo; data URL. */
  logoDataUrl: string | null;
  /** Örnek: "2025-2026". Boşsa çıktılarda içinde bulunulan yıla göre üretilir. */
  academicYear: string | null;
  lessonDurationMinutes: number;
  breakDurationMinutes: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  province: null,
  district: null,
  institutionName: null,
  principalName: null,
  vicePrincipalName: null,
  logoDataUrl: null,
  academicYear: null,
  lessonDurationMinutes: DEFAULT_SLOT_TIMING.lessonMinutes,
  breakDurationMinutes: DEFAULT_SLOT_TIMING.breakMinutes,
};

/** Logonun kaydedilmeden önce ölçekleneceği kenar uzunluğu. */
export const LOGO_SIZE = 100;

interface SettingsRow {
  province: string | null;
  district: string | null;
  institution_name: string | null;
  principal_name: string | null;
  vice_principal_name: string | null;
  logo_data_url: string | null;
  academic_year: string | null;
  lesson_duration_minutes: number;
  break_duration_minutes: number;
}

const COLUMNS =
  "province, district, institution_name, principal_name, vice_principal_name, logo_data_url, academic_year, lesson_duration_minutes, break_duration_minutes";

function fromRow(row: SettingsRow): AppSettings {
  return {
    province: row.province,
    district: row.district,
    institutionName: row.institution_name,
    principalName: row.principal_name,
    vicePrincipalName: row.vice_principal_name,
    logoDataUrl: row.logo_data_url,
    academicYear: row.academic_year,
    lessonDurationMinutes:
      row.lesson_duration_minutes ?? DEFAULT_SETTINGS.lessonDurationMinutes,
    breakDurationMinutes:
      row.break_duration_minutes ?? DEFAULT_SETTINGS.breakDurationMinutes,
  };
}

function toRow(organizationId: string, settings: AppSettings) {
  return {
    organization_id: organizationId,
    province: settings.province,
    district: settings.district,
    institution_name: settings.institutionName,
    principal_name: settings.principalName,
    vice_principal_name: settings.vicePrincipalName,
    logo_data_url: settings.logoDataUrl,
    academic_year: settings.academicYear,
    lesson_duration_minutes: settings.lessonDurationMinutes,
    break_duration_minutes: settings.breakDurationMinutes,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Ayarları okur. Kayıt yoksa varsayılanlar döner; ayarların eksikliği
 * uygulamanın açılmasını engellememelidir.
 */
export async function loadSettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AppSettings> {
  const result = await supabase
    .from("settings")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (result.error) return DEFAULT_SETTINGS;
  if (!result.data) return DEFAULT_SETTINGS;
  return fromRow(result.data as unknown as SettingsRow);
}

/**
 * `settings` tablosunun API şemasında görünüp görünmediğini kontrol eder.
 * Migration henüz uygulanmamışsa `missing` döner.
 */
export async function probeSettingsTable(
  supabase: SupabaseClient
): Promise<"ok" | "missing" | "error"> {
  const result = await supabase
    .from("settings")
    .select("organization_id")
    .limit(1);
  if (!result.error) return "ok";
  if (isMissingRelationError(result.error)) return "missing";
  return "error";
}

export async function saveSettings(
  supabase: SupabaseClient,
  organizationId: string,
  settings: AppSettings
): Promise<void> {
  throwIfDbError(
    await supabase
      .from("settings")
      .upsert(toRow(organizationId, settings), {
        onConflict: "organization_id",
      }),
    "Genel tanımlar kaydedilemedi"
  );

  const institutionName = settings.institutionName?.trim();
  if (institutionName) {
    await supabase
      .from("organizations")
      .update({ name: institutionName })
      .eq("id", organizationId);
  }
}

export function slotTimingOf(settings: AppSettings): SlotTiming {
  return {
    lessonMinutes: settings.lessonDurationMinutes,
    breakMinutes: settings.breakDurationMinutes,
  };
}

/**
 * Çıktı başlığında kullanılacak eğitim-öğretim yılı.
 * Ayarlanmamışsa içinde bulunulan öğretim yılı tahmin edilir: eylülden önce
 * bir önceki yıl başlamış sayılır.
 */
export function academicYearLabel(settings: AppSettings): string {
  if (settings.academicYear?.trim()) return settings.academicYear.trim();
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

/** Resmî yazı başlığındaki "İl / İlçe" satırı. */
export function locationLabel(settings: AppSettings): string {
  return [settings.province, settings.district]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" / ");
}
