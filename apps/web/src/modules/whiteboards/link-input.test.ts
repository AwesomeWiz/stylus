import { describe, it, expect } from "vitest";
import { normalizeBoardLinkInput } from "./link-input";
import { safeBoardUrl } from "./schemas";
describe("manual Board link input", () => {
  it.each([
    ["stybay.com", "https://stybay.com"],
    ["www.stybay.com", "https://www.stybay.com"],
    ["https://stybay.com", "https://stybay.com"],
    ["http://stybay.com", "http://stybay.com"],
    ["  stybay.com/path?q=1#part  ", "https://stybay.com/path?q=1#part"],
  ])("normalizes %s at the input boundary", (input, result) =>
    expect(normalizeBoardLinkInput(input)).toBe(result),
  );
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///tmp/x",
    "mailto:hello@example.com",
    "tel:1234",
    "//stybay.com",
    "https://name:password@stybay.com",
    "bad domain.com",
    "https://stybay.com\n/path",
    "",
  ])("rejects unsafe or unsupported input %s", (input) =>
    expect(() => normalizeBoardLinkInput(input)).toThrow(),
  );
  it("keeps persisted/action validation strict", () =>
    expect(safeBoardUrl.safeParse("stybay.com").success).toBe(false));
});
