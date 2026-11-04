import { describe, it, expect } from "vitest";
import { hexToHSV, hsvToHex, isBoardHex, sampleColorSquare } from "./color";
describe("Board visual color model", () => {
  it.each(["#000000", "#ffffff", "#4f5bd5", "#12345678", "#abcdef00"])(
    "round trips %s including alpha",
    (hex) => {
      expect(hsvToHex(hexToHSV(hex))).toBe(hex);
    },
  );
  it("expands short HEX, retains hue at black, and rejects noncolors", () => {
    expect(hsvToHex(hexToHSV("#f008"))).toBe("#ff000088");
    expect(hexToHSV("#000", 240).h).toBe(240);
    for (const value of ["red", "url(test)", "#12", "#gg0000"])
      expect(isBoardHex(value)).toBe(false);
  });
  it("clamps square coordinates with top white/pure hue and bottom black", () => {
    const base = hexToHSV("#f00");
    expect(hsvToHex(sampleColorSquare(base, 100, 0, 100, 100))).toBe("#ff0000");
    expect(hsvToHex(sampleColorSquare(base, 0, 0, 100, 100))).toBe("#ffffff");
    expect(hsvToHex(sampleColorSquare(base, 300, 300, 100, 100))).toBe(
      "#000000",
    );
  });
});
