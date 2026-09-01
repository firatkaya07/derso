import { describe, expect, it } from "vitest";
import {
  EDITION_INTRO_STORAGE_KEY,
  hasSeenEditionIntro,
  markEditionIntroSeen,
} from "@/lib/edition-intro";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe("edition intro storage", () => {
  it("görülmemişken false döner", () => {
    expect(hasSeenEditionIntro(memoryStorage())).toBe(false);
  });

  it("kayıttan sonra gösterilmez", () => {
    const storage = memoryStorage();
    markEditionIntroSeen(storage);
    expect(storage.getItem(EDITION_INTRO_STORAGE_KEY)).toBe("1");
    expect(hasSeenEditionIntro(storage)).toBe(true);
  });

  it("storage yoksa görmemiş kabul eder", () => {
    expect(hasSeenEditionIntro(null)).toBe(false);
  });
});
