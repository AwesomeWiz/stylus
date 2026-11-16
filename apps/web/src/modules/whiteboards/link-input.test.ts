import { describe, it, expect } from "vitest";
import { normalizeBoardLinkInput } from "./link-input";
import { safeBoardUrl } from "./schemas";
describe("manual Board link input", () => {
  it.each([
    ["example.com", "https://example.com"],
    ["www.example.com", "https://www.example.com"],
    ["https://example.com", "https://example.com"],
    ["http://example.com", "http://example.com"],
    ["  example.com/path?q=1#part  ", "https://example.com/path?q=1#part"],
  ])("normalizes %s at the input boundary", (input, result) =>
    expect(normalizeBoardLinkInput(input)).toBe(result),
  );
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///tmp/x",
    "mailto:hello@example.com",
    "tel:1234",
    "//example.com",
    "https://name:password@example.com",
    "bad domain.com",
    "https://example.com\n/path",
    "",
  ])("rejects unsafe or unsupported input %s", (input) =>
    expect(() => normalizeBoardLinkInput(input)).toThrow(),
  );
  it("keeps persisted/action validation strict", () =>
    expect(safeBoardUrl.safeParse("example.com").success).toBe(false));
});
