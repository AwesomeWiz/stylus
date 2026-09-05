import { describe, expect, it } from "vitest";

import { isThemePreference, resolveTheme } from "./theme";

describe("appearance theme", () => {
  it("supports light, dark, and system preferences deterministically", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("midnight")).toBe(false);
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });
});
