import { describe, expect, it } from "vitest";

import { parseServerEnvironment } from "./server";

describe("server environment validation", () => {
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
});
