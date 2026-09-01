import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, parseTheme } from "@/lib/theme";

describe("parseTheme", () => {
  it("açık temayı tanır", () => {
    expect(parseTheme("light")).toBe("light");
  });

  it("geçersiz değerde koyuya düşer", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("nope")).toBe(DEFAULT_THEME);
    expect(parseTheme(null)).toBe("dark");
    expect(parseTheme(undefined)).toBe("dark");
  });
});
