import { describe, expect, it } from "vitest";
import {
  COACH_MARK_STORAGE_KEY,
  hasSeenCoachMark,
  markCoachMarkSeen,
} from "@/lib/coach-mark";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe("coach mark storage", () => {
  it("görülmemişken false döner", () => {
    expect(hasSeenCoachMark(memoryStorage())).toBe(false);
  });

  it("kayıttan sonra gösterilmez", () => {
    const storage = memoryStorage();
    markCoachMarkSeen(storage);
    expect(storage.getItem(COACH_MARK_STORAGE_KEY)).toBe("1");
    expect(hasSeenCoachMark(storage)).toBe(true);
  });

  it("storage yoksa görmemiş kabul eder", () => {
    expect(hasSeenCoachMark(null)).toBe(false);
  });
});
