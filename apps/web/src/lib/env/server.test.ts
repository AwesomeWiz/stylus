import { describe, expect, it } from "vitest";

import { parseServerEnvironment } from "./server";

describe("server environment validation", () => {
  it("accepts an optional public source offer and rejects unsafe or credential-bearing links", () => {
    expect(
      parseServerEnvironment({
        NODE_ENV: "test",
        STYLUS_SOURCE_URL: "https://example.test/source/commit",
      }).STYLUS_SOURCE_URL,
    ).toBe("https://example.test/source/commit");
    for (const value of [
      "javascript:alert(1)",
      "https://user:secret@example.test/source",
      "https://example.test/source?token=secret",
    ])
      expect(() =>
        parseServerEnvironment({ NODE_ENV: "test", STYLUS_SOURCE_URL: value }),
      ).toThrow();
  });
  it("keeps AI providers optional for zero-cost and offline operation", () => {
    expect(parseServerEnvironment({ NODE_ENV: "test" })).toMatchObject({
      NODE_ENV: "test",
    });
  });

  it("accepts server-only provider configuration and numeric pricing", () => {
    expect(
      parseServerEnvironment({
        NODE_ENV: "production",
        STYLUS_AI_OPENAI_COMPATIBLE_API_KEY: "server-secret",
        STYLUS_AI_OPENAI_COMPATIBLE_BASE_URL: "https://models.example.test",
        STYLUS_AI_OPENAI_COMPATIBLE_MODEL: "example-model",
        STYLUS_AI_REMOTE_INPUT_USD_PER_MILLION: "0.5",
      }),
    ).toMatchObject({
      STYLUS_AI_OPENAI_COMPATIBLE_API_KEY: "server-secret",
      STYLUS_AI_REMOTE_INPUT_USD_PER_MILLION: 0.5,
    });
  });

  it("accepts a server-only Cron bearer secret", () => {
    expect(
      parseServerEnvironment({
        CRON_SECRET: "high-entropy-secret",
        NODE_ENV: "production",
      }),
    ).toMatchObject({ CRON_SECRET: "high-entropy-secret" });
  });
});
