export const themePreferences = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof themePreferences)[number];

export const THEME_STORAGE_KEY = "stylus-theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return themePreferences.includes(value as ThemePreference);
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): "light" | "dark" {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function applyTheme(
  preference: ThemePreference,
  root: Pick<HTMLElement, "classList" | "dataset"> = document.documentElement,
  systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches,
) {
  const resolved = resolveTheme(preference, systemDark);
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = preference;
  return resolved;
}
