import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import { competitorReelAnalysisSchema } from "@/modules/marketing/reel-analysis";

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

  it("reports only bounded structural paths for invalid provider envelopes", async () => {
    const privateValue = "private-provider-value-must-not-be-retained";
    const provider = new OpenAICompatibleProvider("openai-compatible", {
      baseUrl: "https://models.example.test",
      fetch: vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: Array.from({ length: 8 }, () => ({
              message: { content: null, privateValue },
            })),
            usage: { prompt_tokens: privateValue },
          }),
          { status: 200 },
        ),
      ),
    });

    const error = await provider
      .generate(request)
      .catch((reason: unknown) =>
        reason instanceof Error ? reason : new Error("Unexpected rejection"),
      );

    expect(error).toMatchObject({
      category: "invalid_response",
      diagnostic:
        "provider_envelope_invalid:invalid_type@choices.0.message.content,invalid_type@choices.1.message.content,invalid_type@choices.2.message.content,invalid_type@choices.3.message.content,invalid_type@choices.4.message.content",
    });
    expect(JSON.stringify(error)).not.toContain(privateValue);
    const diagnostic = (error as Error & { diagnostic: string }).diagnostic;
    const issues = diagnostic
      .replace("provider_envelope_invalid:", "")
      .split(",");
    expect(issues).toHaveLength(5);
    expect(
      issues.every((issue) => issue.split("@")[1]!.split(".").length <= 6),
    ).toBe(true);
    expect(diagnostic.length).toBeLessThanOrEqual(500);
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

  it("removes only grammar-incompatible large string bounds for Ollama structured output", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "{}" } }] }),
        ),
      );
    const provider = new OpenAICompatibleProvider("ollama", {
      baseUrl: "http://127.0.0.1:11434",
      fetch,
    });
    const jsonSchema = z.toJSONSchema(
      competitorReelAnalysisSchema.omit({ visual_metrics: true }),
    );
    const summarySchema = (
      jsonSchema as unknown as {
        properties: { summary: { maxLength: number } };
      }
    ).properties.summary;
    expect(summarySchema.maxLength).toBe(2_000);

    await provider.generate({
      ...request,
      structuredOutput: {
        jsonSchema,
        name: "marketing_competitor_reel_analysis_v1",
      },
    });

    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    const sentSchema = body.response_format.json_schema.schema;
    expect(sentSchema.properties.summary).not.toHaveProperty("maxLength");
    expect(sentSchema.properties.hook_explanation.maxLength).toBe(1_500);
    expect(summarySchema.maxLength).toBe(2_000);
  });

  it("leaves remote compatible-provider schemas unchanged", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "{}" } }] }),
        ),
      );
    const provider = new OpenAICompatibleProvider("openai-compatible", {
      baseUrl: "https://models.example.test",
      fetch,
    });
    await provider.generate({
      ...request,
      structuredOutput: {
        jsonSchema: {
          properties: { summary: { maxLength: 2_000, type: "string" } },
          type: "object",
        },
        name: "structured_test",
      },
    });
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(
      body.response_format.json_schema.schema.properties.summary.maxLength,
    ).toBe(2_000);
    expect(body).not.toHaveProperty("provider");
  });

  it("requires OpenRouter providers to honor structured-output parameters", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "{}" } }] }),
        ),
      );
    const provider = new OpenAICompatibleProvider("openai-compatible", {
      baseUrl: "https://openrouter.ai/api/v1",
      fetch,
    });
    const jsonSchema = {
      additionalProperties: false,
      properties: { summary: { type: "string" } },
      required: ["summary"],
      type: "object",
    };

    await provider.generate({
      ...request,
      structuredOutput: {
        jsonSchema,
        name: "structured_test",
      },
    });

    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({
      provider: { require_parameters: true },
      response_format: {
        json_schema: {
          name: "structured_test",
          schema: jsonSchema,
          strict: true,
        },
        type: "json_schema",
      },
    });
  });

  it("categorizes an Ollama structured-request HTTP 400 as invalid response", async () => {
    const provider = new OpenAICompatibleProvider("ollama", {
      baseUrl: "http://127.0.0.1:11434",
      fetch: vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response("provider details", { status: 400 })),
    });
    await expect(
      provider.generate({
        ...request,
        structuredOutput: {
          jsonSchema: { type: "object" },
          name: "structured_test",
        },
      }),
    ).rejects.toMatchObject({
      category: "invalid_response",
      diagnostic: "provider_structured_request_rejected",
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
