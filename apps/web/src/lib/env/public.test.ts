import { describe, expect, it } from "vitest";

import { parsePublicEnvironment } from "./public";

describe("public environment validation", () => {
  it("fails clearly when required Supabase configuration is missing", () => {
    expect(() => parsePublicEnvironment({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("accepts browser-safe project configuration", () => {
    expect(
      parsePublicEnvironment({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "sb_publishable_test_value_for_verification",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    ).toMatchObject({
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    });
  });
});
