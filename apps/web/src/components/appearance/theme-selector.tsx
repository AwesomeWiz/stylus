"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import {
  applyTheme,
  isThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/modules/appearance/theme";

const options = [
  { icon: Sun, label: "Light", value: "light" },
  { icon: Moon, label: "Dark", value: "dark" },
  { icon: Laptop, label: "System", value: "system" },
] as const;

export function ThemeSelector() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initial = isThemePreference(saved) ? saved : "system";
    applyTheme(initial);
    queueMicrotask(() => setPreference(initial));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => {
      if (
        (window.localStorage.getItem(THEME_STORAGE_KEY) ?? "system") ===
        "system"
      )
        applyTheme("system", document.documentElement, media.matches);
    };
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, []);

  function select(next: ThemePreference) {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    setPreference(next);
    applyTheme(next);
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium">Appearance</legend>
      <p className="text-muted-foreground mt-1 text-sm">
        Choose how Stylus looks on this device.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const selected = preference === option.value;
          return (
            <button
              aria-pressed={selected}
              className={cn(
                "bg-card hover:bg-muted flex min-h-20 items-center gap-3 rounded-md border p-4 text-left transition-colors",
                selected &&
                  "border-primary-border bg-primary-subtle text-accent-foreground",
              )}
              key={option.value}
              onClick={() => select(option.value)}
              type="button"
            >
              <option.icon aria-hidden="true" className="size-5" />
              <span>
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {option.value === "system"
                    ? "Follow this device"
                    : `Always use ${option.label.toLowerCase()} mode`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
