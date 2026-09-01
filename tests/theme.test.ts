import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, parseTheme } from "@/lib/theme";

describe("parseTheme", () => {
  it("koyu temayı tanır", () => {
    expect(parseTheme("dark")).toBe("dark");
  });

  it("geçersiz değerde aydınlığa düşer", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("nope")).toBe(DEFAULT_THEME);
    expect(parseTheme(null)).toBe("light");
    expect(parseTheme(undefined)).toBe("light");
  });
});
