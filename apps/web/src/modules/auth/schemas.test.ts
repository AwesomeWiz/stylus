import { describe, expect, it } from "vitest";

import { loginSchema, safeAuthReturnPath, signupSchema } from "./schemas";

describe("authentication schemas", () => {
  it("normalizes valid credentials", () => {
    expect(
      signupSchema.parse({
        email: "Founder@Example.com",
        fullName: "  Alex Morgan  ",
        password: "correct-horse",
      }),
    ).toEqual({
      email: "founder@example.com",
      fullName: "Alex Morgan",
      password: "correct-horse",
    });
  });

  it("rejects malformed login input before calling the provider", () => {
    expect(
      loginSchema.safeParse({ email: "not-an-email", password: "" }).success,
    ).toBe(false);
  });

  it("enforces the initial password and profile constraints", () => {
    const result = signupSchema.safeParse({
      email: "founder@example.com",
      fullName: "A",
      password: "short",
    });

    expect(result.success).toBe(false);
  });
});

describe("safeAuthReturnPath", () => {
  it("preserves only strong invitation routes", () => {
    const token = "A".repeat(43);
    expect(safeAuthReturnPath(`/invite/${token}`)).toBe(`/invite/${token}`);
    expect(safeAuthReturnPath("https://evil.example/invite/token")).toBeNull();
    expect(safeAuthReturnPath("/tasks")).toBeNull();
  });
});
