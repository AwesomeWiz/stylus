import { describe, expect, it } from "vitest";

import { isoToLocalDateTime, localDateTimeToIso } from "./datetime";

describe("task date-time conversion", () => {
  it("converts a local wall-clock value to the matching UTC instant", () => {
    const localValue = "2026-08-25T18:30";
    const intendedInstant = new Date(2026, 7, 25, 18, 30);

    expect(localDateTimeToIso(localValue)).toBe(intendedInstant.toISOString());
    expect(isoToLocalDateTime(intendedInstant.toISOString())).toBe(localValue);
  });

  it("keeps optional date fields empty", () => {
    expect(localDateTimeToIso("")).toBe("");
    expect(isoToLocalDateTime(null)).toBe("");
  });
});
