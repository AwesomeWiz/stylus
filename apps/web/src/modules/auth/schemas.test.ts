import { describe, expect, it } from "vitest";

import { loginSchema, signupSchema } from "./schemas";

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
