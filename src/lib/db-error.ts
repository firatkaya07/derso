import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Şemadaki kısıt adlarını kullanıcıya gösterilecek Türkçe mesajlara eşler.
 * Kısıt adları supabase/migrations altındaki şema ile birebir aynıdır.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  lessons_class_slot_unique:
    "Bu sınıfın o saatinde zaten bir ders var. Sayfayı yenileyip tekrar deneyin.",
  lessons_teacher_slot_unique:
    "Öğretmen o saatte başka bir sınıfta ders veriyor. Sayfayı yenileyip tekrar deneyin.",
  teachers_name_unique: "Bu isimde bir öğretmen zaten kayıtlı.",
  subjects_name_unique: "Bu isimde bir ders zaten kayıtlı.",
  classes_name_unique: "Bu isimde bir sınıf zaten kayıtlı.",
  class_subjects_unique: "Bu ders sınıfa zaten eklenmiş.",
  teacher_subjects_unique: "Bu ders öğretmene zaten tanımlı.",
  class_schedule_days_unique_day:
    "Bu gün için sınıfa zaten bir saat aralığı tanımlanmış.",
  class_schedule_days_time_order:
    "Bitiş saati başlangıç saatinden sonra olmalı.",
  lessons_time_order: "Bitiş saati başlangıç saatinden sonra olmalı.",
};

const CODE_MESSAGES: Record<string, string> = {
  "23505": "Bu kayıt zaten mevcut.",
  "23503": "Bu kayıt başka kayıtlarla ilişkili olduğu için işlem yapılamadı.",
  "23514": "Girilen değerler geçerli aralıkta değil.",
  "42501": "Bu işlem için yetkiniz yok. Oturumunuz düşmüş olabilir.",
  PGRST205: "İstenen tablo veritabanında bulunamadı. Eksik migration çalıştırılmış olabilir.",
  PGRST301: "Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın.",
};

/** PostgREST / Postgres "tablo yok" hatalarını yakalar. */
export function isMissingRelationError(error: PostgrestError | Error): boolean {
  const pgError = error as PostgrestError;
  const haystack = `${pgError.message ?? ""} ${pgError.details ?? ""} ${
    "code" in error ? String(pgError.code ?? "") : ""
  }`.toLowerCase();

  return (
    pgError.code === "PGRST205" ||
    pgError.code === "42P01" ||
    haystack.includes("schema cache") ||
    haystack.includes("does not exist") ||
    haystack.includes("could not find the table")
  );
}

/** Supabase hatasını kullanıcıya gösterilebilir bir Türkçe mesaja çevirir. */
export function describeDbError(error: PostgrestError | Error): string {
  if (error instanceof Error && !("code" in error)) {
    return error.message;
  }

  const pgError = error as PostgrestError;
  const haystack = `${pgError.message ?? ""} ${pgError.details ?? ""}`;

  for (const [constraint, message] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (haystack.includes(constraint)) return message;
  }

  if (isMissingRelationError(pgError)) {
    if (/settings/i.test(haystack)) {
      return (
        "settings tablosu henüz oluşturulmamış. Supabase SQL Editor'de " +
        "supabase/migrations/0003_settings.sql dosyasını çalıştırın; ardından " +
        "bu sayfayı yenileyip tekrar kaydedin."
      );
    }
    return (
      "İstenen tablo veritabanında bulunamadı. Supabase SQL Editor'de " +
      "supabase/migrations altındaki SQL dosyalarını sırayla çalıştırın."
    );
  }

  const byCode = pgError.code ? CODE_MESSAGES[pgError.code] : undefined;
  if (byCode) return byCode;

  return pgError.message || "Bilinmeyen bir veritabanı hatası oluştu.";
}

/**
 * Bir Supabase çağrısının `{ error }` sonucunu kontrol eder ve hata varsa
 * anlaşılır bir mesajla fırlatır. Böylece çağıran taraf tek bir try/catch ile
 * tüm adımların hatalarını yakalayabilir.
 */
export function throwIfDbError(
  result: { error: PostgrestError | null },
  context?: string
): void {
  if (!result.error) return;
  const message = describeDbError(result.error);
  throw new Error(context ? `${context}: ${message}` : message);
}
