import { describe, expect, it } from "vitest";
import { config } from "./proxy";

describe("public static font routing", () => {
  const matches = new RegExp(`^${config.matcher[0]}$`);
  it("serves only the shipped font/license without a session redirect", () => {
    expect(matches.test("/fonts/geist/Geist-Variable.woff2")).toBe(false);
    expect(matches.test("/fonts/geist/LICENSE.txt")).toBe(false);
  });
  it("retains the authenticated route boundary", () => {
    for (const route of [
      "/",
      "/tasks",
      "/whiteboards",
      "/settings",
      "/fonts/geist/private",
      "/fonts/geist/Geist-Variable.woff2/private",
      "/fonts/geist/Geist-VariableXwoff2",
    ])
      expect(matches.test(route), route).toBe(true);
  });
});
