import { describe, it, expect } from "vitest";
import {
  boardTextStyle,
  boardTypography,
  boardTypographySchema,
} from "./typography";
describe("safe Board typography", () => {
  it("projects supported fonts/weights/styles without arbitrary CSS or synthetic italics", () => {
    expect(
      boardTextStyle({
        family: "lora",
        weight: 600,
        italic: true,
        lineHeight: 1.8,
        letterSpacing: 1,
        underline: true,
        strikethrough: true,
      }),
    ).toMatchObject({
      fontFamily: '"Stylus Board Lora", Georgia, serif',
      fontWeight: 600,
      fontStyle: "italic",
      lineHeight: 1.8,
      textDecoration: "underline line-through",
      fontSynthesis: "none",
    });
    expect(
      boardTextStyle({ family: "geist-mono", italic: true }).fontStyle,
    ).toBe("normal");
    expect(boardTextStyle({ family: "url(https://bad.test)" }).fontFamily).toBe(
      "var(--font-sans)",
    );
  });
  it("supports finite size/spacing, alignment, vertical alignment and sizing, with bounded validation", () => {
    const text = boardTypography({
      fontSize: 63.5,
      align: "right",
      verticalAlign: "bottom",
      sizing: "auto",
    });
    expect(text).toMatchObject({
      fontSize: 63.5,
      align: "right",
      verticalAlign: "bottom",
      sizing: "auto",
    });
    expect(
      boardTypographySchema.safeParse({ ...text, weight: 450 }).success,
    ).toBe(false);
    expect(boardTypography({ ...text, fontSize: Infinity }).fontSize).toBe(18);
  });
});
