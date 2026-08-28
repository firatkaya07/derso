import { describe, expect, it } from "vitest";
import { describeDbError, isMissingRelationError } from "@/lib/db-error";
import {
  academicYearLabel,
  DEFAULT_SETTINGS,
  locationLabel,
  slotTimingOf,
  type AppSettings,
} from "@/lib/settings";
import { generateTimeSlots } from "@/lib/types";

const SETTINGS_SETUP_SQL = `-- Derso — kurum ayarları (organization_id PK)
-- Supabase migration 0004 ile uygulanır; elle çalıştırmayın.

-- settings.organization_id → organizations.id (kurum başına bir satır)
-- RLS: organization_id in (select user_organization_ids())
`;

function settings(overrides: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("settings tablosu eksikliği", () => {
  it("schema cache tablo hatasını tanır", () => {
    const error = {
      message: "Could not find the table 'public.settings' in the schema cache",
      details: null,
      hint: null,
      code: "PGRST205",
      name: "PostgrestError",
    };
    expect(isMissingRelationError(error)).toBe(true);
    expect(describeDbError(error)).toMatch(/0004|kuruma bağlı/i);
  });

  it("eksik sütun hatasını tablo yok sanmaz", () => {
    const error = {
      message: "Could not find the 'id' column of 'settings' in the schema cache",
      details: null,
      hint: null,
      code: "PGRST204",
      name: "PostgrestError",
    };
    expect(isMissingRelationError(error)).toBe(false);
  });

  it("kurulum notu çok kurumlu şemaya işaret eder", () => {
    expect(SETTINGS_SETUP_SQL).toContain("organization_id");
    expect(SETTINGS_SETUP_SQL).toContain("0004");
  });
});

describe("locationLabel", () => {
  it("il ve ilçeyi birleştirir", () => {
    expect(locationLabel(settings({ province: "Ankara", district: "Çankaya" })))
      .toBe("Ankara / Çankaya");
  });

  it("eksik alanları atlar", () => {
    expect(locationLabel(settings({ province: "Ankara" }))).toBe("Ankara");
    expect(locationLabel(settings())).toBe("");
  });
});

describe("academicYearLabel", () => {
  it("girilen değeri kullanır", () => {
    expect(academicYearLabel(settings({ academicYear: " 2030-2031 " }))).toBe(
      "2030-2031"
    );
  });

  it("boşsa içinde bulunulan öğretim yılını üretir", () => {
    const label = academicYearLabel(settings());
    expect(label).toMatch(/^\d{4}-\d{4}$/);
    const [start, end] = label.split("-").map(Number);
    expect(end).toBe(start + 1);
  });
});

describe("ders saati süreleri", () => {
  it("ayarlardaki süreleri ızgaraya taşır", () => {
    const timing = slotTimingOf(
      settings({ lessonDurationMinutes: 45, breakDurationMinutes: 15 })
    );
    expect(timing).toEqual({ lessonMinutes: 45, breakMinutes: 15 });

    expect(generateTimeSlots("09:00", "11:00", timing)).toEqual([
      { start: "09:00", end: "09:45" },
      { start: "10:00", end: "10:45" },
    ]);
  });

  it("varsayılan olarak 40 dakika ders ve 10 dakika teneffüs kullanır", () => {
    expect(generateTimeSlots("16:40", "19:50")).toEqual([
      { start: "16:40", end: "17:20" },
      { start: "17:30", end: "18:10" },
      { start: "18:20", end: "19:00" },
      { start: "19:10", end: "19:50" },
    ]);
  });

  it("teneffüssüz programı destekler", () => {
    expect(
      generateTimeSlots("09:00", "10:30", {
        lessonMinutes: 30,
        breakMinutes: 0,
      })
    ).toEqual([
      { start: "09:00", end: "09:30" },
      { start: "09:30", end: "10:00" },
      { start: "10:00", end: "10:30" },
    ]);
  });

  it("güne sığmayan sürelerde boş liste döner", () => {
    expect(
      generateTimeSlots("09:00", "09:20", {
        lessonMinutes: 40,
        breakMinutes: 10,
      })
    ).toEqual([]);
  });
});
