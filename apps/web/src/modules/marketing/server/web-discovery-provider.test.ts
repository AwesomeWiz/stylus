import { describe, expect, it, vi } from "vitest";

import {
  createTavilyWebDiscoveryProvider,
  WebDiscoveryProviderError,
} from "./web-discovery-provider";

describe("Tavily web discovery provider boundary", () => {
  it("uses the fixed server endpoint and returns URL metadata only", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        answer: "must be ignored",
        results: [
          {
            content: "provider snippet must be ignored",
            published_date: "2026-08-30",
            raw_content: "must be ignored",
            score: 0.9,
            title: "Inclusive sizing complaints",
            url: "https://example.com/inclusive-sizing",
          },
        ],
      }),
    );
    const provider = createTavilyWebDiscoveryProvider(
      "test-secret-never-log",
      fetcher as typeof fetch,
    );
    const result = await provider.search({
      maximum: 20,
      query: "inclusive sizing complaints",
      signal: new AbortController().signal,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.tavily.com/search",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      include_answer: false,
      include_images: false,
      include_raw_content: false,
      max_results: 8,
      query: "inclusive sizing complaints",
      search_depth: "basic",
    });
    expect(result).toEqual({
      candidates: [
        {
          publishedAt: "2026-08-30T00:00:00.000Z",
          title: "Inclusive sizing complaints",
          url: "https://example.com/inclusive-sizing",
        },
      ],
      inspectedCount: 1,
    });
    expect(JSON.stringify(result)).not.toMatch(/snippet|raw_content|answer/);
  });

  it.each([
    [401, "authentication_failed"],
    [429, "rate_limited"],
    [432, "rate_limited"],
    [433, "rate_limited"],
    [504, "timeout"],
    [500, "transient_failure"],
    [400, "malformed_response"],
  ] as const)("normalizes status %s as %s", async (status, category) => {
    const provider = createTavilyWebDiscoveryProvider(
      "secret",
      vi.fn(async () => new Response("", { status })) as typeof fetch,
    );
    await expect(
      provider.search({
        maximum: 8,
        query: "sizing",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      category,
    } satisfies Partial<WebDiscoveryProviderError>);
  });

  it("rejects non-JSON, oversized, and malformed provider responses safely", async () => {
    const cases = [
      new Response("<html>no</html>", {
        headers: { "content-type": "text/html" },
      }),
      new Response("{}", {
        headers: {
          "content-length": String(256 * 1024 + 1),
          "content-type": "application/json",
        },
      }),
      new Response("x".repeat(256 * 1024 + 1), {
        headers: { "content-type": "application/json" },
      }),
      Response.json({ results: [{ title: "missing URL" }] }),
    ];
    for (const response of cases) {
      const provider = createTavilyWebDiscoveryProvider(
        "secret",
        vi.fn(async () => response) as typeof fetch,
      );
      await expect(
        provider.search({
          maximum: 8,
          query: "sizing",
          signal: new AbortController().signal,
        }),
      ).rejects.toMatchObject({ category: "malformed_response" });
    }
  });

  it("does not include credentials or response bodies in errors", async () => {
    const provider = createTavilyWebDiscoveryProvider(
      "highly-sensitive-key",
      vi.fn(async () => {
        throw new Error("<html>upstream details</html>");
      }) as typeof fetch,
    );
    let error: unknown;
    try {
      await provider.search({
        maximum: 8,
        query: "fit",
        signal: new AbortController().signal,
      });
    } catch (caught) {
      error = caught;
    }
    expect(String(error)).toBe(
      "WebDiscoveryProviderError: Web discovery provider failed: transient_failure",
    );
    expect(String(error)).not.toMatch(/sensitive|html|upstream/);
  });
});
