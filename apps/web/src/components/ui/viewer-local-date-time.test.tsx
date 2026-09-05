import { render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatViewerDateTime,
  ViewerLocalDateTime,
} from "./viewer-local-date-time";

afterEach(() => vi.restoreAllMocks());

describe("viewer-local date and time", () => {
  it("uses IANA timezone rules for India, New York and London", () => {
    const value = "2026-09-05T12:00:00Z";
    expect(formatViewerDateTime(value, "Asia/Kolkata")).toMatch(
      /^Sep 5, 2026, 5:30 PM (IST|GMT\+5:30)$/,
    );
    expect(formatViewerDateTime(value, "America/New_York")).toBe(
      "Sep 5, 2026, 8:00 AM EDT",
    );
    expect(formatViewerDateTime(value, "Europe/London")).toMatch(
      /^Sep 5, 2026, 1:00 PM (BST|GMT\+1)$/,
    );
  });

  it("uses the viewer calendar date across an India midnight boundary", () => {
    expect(
      formatViewerDateTime("2026-09-05T20:00:00Z", "Asia/Kolkata"),
    ).toMatch(/^Sep 6, 2026, 1:30 AM (IST|GMT\+5:30)$/);
  });

  it("applies daylight-saving rules instead of fixed offsets", () => {
    expect(
      formatViewerDateTime("2026-01-05T12:00:00Z", "America/New_York"),
    ).toBe("Jan 5, 2026, 7:00 AM EST");
    expect(
      formatViewerDateTime("2026-09-05T12:00:00Z", "America/New_York"),
    ).toBe("Sep 5, 2026, 8:00 AM EDT");
  });

  it("renders a deterministic SSR placeholder before browser-local formatting", async () => {
    expect(
      renderToString(<ViewerLocalDateTime value="2026-09-05T12:00:00Z" />),
    ).toContain("Local time…");
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      calendar: "gregory",
      locale: "en-US",
      numberingSystem: "latn",
      timeZone: "Asia/Kolkata",
    });
    render(<ViewerLocalDateTime value="2026-09-05T12:00:00Z" />);
    await waitFor(() =>
      expect(screen.getByText(/5:30 PM/)).toBeInTheDocument(),
    );
  });

  it("handles missing and malformed timestamps safely", async () => {
    const { rerender } = render(<ViewerLocalDateTime value={null} />);
    expect(screen.getByText("Never / unavailable")).toBeInTheDocument();

    rerender(<ViewerLocalDateTime value="not-a-timestamp" />);
    await waitFor(() =>
      expect(screen.getByText("Unavailable")).toBeInTheDocument(),
    );
  });
});
