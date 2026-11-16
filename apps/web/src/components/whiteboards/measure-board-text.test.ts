import { afterEach, describe, it, expect, vi } from "vitest";
import { object } from "@/test/board-fixtures";
import { measureBoardText } from "./measure-board-text";
afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "fonts");
});
describe("auto-height at a text intent boundary", () => {
  it("loads only the selected local face, measures safely as text, and removes the temporary node", async () => {
    const load = vi.fn().mockResolvedValue([]);
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load },
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        expect(this.querySelector("img")).toBeNull();
        expect(this.getAttribute("aria-hidden")).toBe("true");
        return { height: 123.2 } as DOMRect;
      },
    );
    const row = object({
      content: { text: "<img src=x onerror=alert(1)>" },
      style: { family: "lora", weight: 600, sizing: "auto" },
    });
    expect(await measureBoardText(row)).toBe(124);
    expect(load.mock.calls[0]![0]).toContain('"Stylus Board Lora"');
    expect(document.body.textContent).not.toContain("onerror");
  });
});
