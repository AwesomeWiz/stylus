import { describe, expect, it } from "vitest";

import { parsePublicEnvironment } from "./public";

describe("public environment validation", () => {
  it("rejects service-role/secret keys in browser configuration and unsafe site origins", () => {
    const config = {
      NEXT_PUBLIC_SITE_URL: "https://app.example.test",
      NEXT_PUBLIC_SUPABASE_URL: "https://backend.example.test",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_test_value_for_verification",
    };
    for (const url of [
      "javascript:alert(1)",
      "https://user:password@example.test",
      "https://example.test/path",
      "https://example.test/?token=private",
    ])
      expect(() =>
        parsePublicEnvironment({ ...config, NEXT_PUBLIC_SITE_URL: url }),
      ).toThrow();
    const legacy = (role: string) =>
      `header.${btoa(JSON.stringify({ role }))}.signature`;
    expect(
      parsePublicEnvironment({
        ...config,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacy("anon"),
      }),
    ).toBeTruthy();
    for (const key of [
      "sb_secret_test_value_for_verification",
      legacy("service_role"),
    ])
      expect(() =>
        parsePublicEnvironment({
          ...config,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        }),
      ).toThrow();
  });
  it("fails clearly when required Supabase configuration is missing", () => {
    expect(() => parsePublicEnvironment({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("rejects credentials and non-HTTP backend URLs before browser embedding", () => {
    for (const url of [
      "https://user:secret@example.test",
      "https://example.test/?key=private",
      "file:///private",
      "javascript:alert(1)",
    ]) {
      expect(() =>
        parsePublicEnvironment({
          NEXT_PUBLIC_SITE_URL: "https://example.test",
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            "sb_publishable_test_value_for_verification",
        }),
      ).toThrow();
    }
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
