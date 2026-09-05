import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_STORAGE_KEY } from "@/modules/appearance/theme";

import { ThemeSelector } from "./theme-selector";

describe("ThemeSelector", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })),
    });
    document.documentElement.classList.remove("dark");
  });

  it("persists an explicit dark preference and applies it immediately", async () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByRole("button", { name: /Dark/ }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Dark/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
  });
});
