import { describe, expect, it, vi } from "vitest";

import {
  normalizeProviderBaseUrl,
  OpenAICompatibleProvider,
} from "./openai-compatible";

const request = {
  maxOutputTokens: 100,
  messages: [{ content: "hello", role: "user" as const }],
  model: "configured-model",
  signal: new AbortController().signal,
};

describe("OpenAICompatibleProvider", () => {
  it("normalizes provider responses without exposing their raw object", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ finish_reason: "stop", message: { content: "result" } }],
          id: "provider-request",
          secret_debug: "must-not-leak",
          usage: { completion_tokens: 2, prompt_tokens: 3, total_tokens: 5 },
        }),
        { status: 200 },
      ),
    );
    const provider = new OpenAICompatibleProvider("compatible", {
      apiKey: "server-key",
      baseUrl: "https://models.example.test",
      fetch,
    });
    const result = await provider.generate(request);
    expect(result).toEqual({
      finishReason: "stop",
      providerRequestId: "provider-request",
      text: "result",
      usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 },
    });
    expect(JSON.stringify(result)).not.toContain("secret_debug");
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://models.example.test/v1/chat/completions",
    );
  });

  it.each([
    [401, "authentication_failed"],
    [429, "rate_limited"],
    [503, "provider_unavailable"],
    [413, "context_limit"],
  ] as const)("normalizes HTTP %s as %s", async (status, category) => {
    const provider = new OpenAICompatibleProvider("compatible", {
      baseUrl: "https://models.example.test",
      fetch: vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response("provider details", { status })),
    });
    await expect(provider.generate(request)).rejects.toMatchObject({
      category,
    });
  });

  it("accepts only fixed server configuration URL shapes", () => {
    expect(normalizeProviderBaseUrl("http://127.0.0.1:11434/")).toBe(
      "http://127.0.0.1:11434",
    );
    expect(() =>
      normalizeProviderBaseUrl("https://user:secret@example.test"),
    ).toThrow(/invalid/);
    expect(() => normalizeProviderBaseUrl("file:///etc/passwd")).toThrow(
      /invalid/,
    );
  });

  it("accepts a configured base URL that already contains the v1 prefix", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
        ),
      );
    await new OpenAICompatibleProvider("compatible", {
      baseUrl: "https://models.example.test/v1",
      fetch,
    }).generate(request);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://models.example.test/v1/chat/completions",
    );
  });
});
