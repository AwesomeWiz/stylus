import { describe, expect, it, vi } from "vitest";

import { createFashionEditorialAdapter } from "./fashion-editorial-adapter";
import { RequestConcurrencyGate } from "./research-sources";
import { RunByteBudget } from "./safe-fetch";

const context = () => ({
  budget: new RunByteBudget(),
  fetchedAt: "2026-08-31T00:00:00.000Z",
  requestGate: new RequestConcurrencyGate(3),
  signal: new AbortController().signal,
});

describe("fashion editorial source adapter", () => {
  it("uses registry feeds and the centralized safe-fetch path for article extraction", async () => {
    const transport = vi.fn(async (input: { url: URL }) =>
      input.url.pathname === "/feed/rss"
        ? {
            body: new TextEncoder().encode(
              `<rss><channel><item><guid>vogue-1</guid><title>Sizing shifts</title><description>Fashion sizing evidence</description><link>https://www.vogue.com/article/sizing-shifts</link></item></channel></rss>`,
            ),
            headers: { "content-type": "application/rss+xml" },
            status: 200,
          }
        : {
            body: new TextEncoder().encode(
              `<html><title>Sizing shifts</title><article><p>Brands are publishing more garment measurements to address fit uncertainty.</p></article></html>`,
            ),
            headers: { "content-type": "text/html" },
            status: 200,
          },
    );
    const result = await createFashionEditorialAdapter({
      safeFetch: {
        resolve: async () => [{ address: "8.8.8.8", family: 4 }],
        transport,
      },
      searchProvider: null,
    }).retrieve(
      {
        includeSearchDiscovery: false,
        queryTerms: ["sizing"],
        sourceIds: ["vogue-editorial"],
      },
      context(),
    );
    expect(result.failures).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      adapterId: "fashion-editorial",
      metadata: expect.objectContaining({ sourceId: "vogue-editorial" }),
    });
    expect(result.items[0]?.evidence.map((item) => item.evidenceType)).toEqual([
      "FEED_ITEM",
      "ARTICLE_CONTENT",
    ]);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("rejects source IDs outside the code-owned registry", async () => {
    const adapter = createFashionEditorialAdapter();
    await expect(
      adapter.retrieve(
        {
          includeSearchDiscovery: false,
          queryTerms: ["fashion"],
          sourceIds: ["attacker-source"],
        },
        context(),
      ),
    ).rejects.toThrow("registry selection is invalid");
  });

  it("continues known feeds while reporting optional search as unavailable", async () => {
    const transport = vi.fn(async (input: { url: URL }) =>
      input.url.pathname === "/feeds/news/"
        ? {
            body: new TextEncoder().encode(
              `<rss><channel><item><guid>retail-1</guid><title>Brand pricing</title><description>Fashion quality and price discussion</description><link>https://www.retaildive.com/news/fashion-price/</link></item></channel></rss>`,
            ),
            headers: { "content-type": "application/rss+xml" },
            status: 200,
          }
        : {
            body: new TextEncoder().encode(
              "<html><main><p>Fashion price and quality context.</p></main></html>",
            ),
            headers: { "content-type": "text/html" },
            status: 200,
          },
    );
    const result = await createFashionEditorialAdapter({
      safeFetch: {
        resolve: async () => [{ address: "8.8.8.8", family: 4 }],
        transport,
      },
      searchProvider: null,
    }).retrieve(
      {
        includeSearchDiscovery: true,
        queryTerms: ["fashion"],
        sourceIds: ["retail-dive"],
      },
      context(),
    );
    expect(result.items).toHaveLength(1);
    expect(result.failures).toEqual([
      expect.objectContaining({
        category: "policy_denied",
        diagnosticCategory: "source_unavailable",
        metadata: { retrievalMode: "SEARCH_PROVIDER" },
      }),
    ]);
  });

  it("rejects provider-discovered URLs outside the allowlisted registry before fetching", async () => {
    const search = vi.fn(async () => [
      {
        sourceId: "vogue-editorial",
        title: "Injected",
        url: "https://127.0.0.1/private",
      },
    ]);
    const transport = vi.fn(async () => ({
      body: new TextEncoder().encode(
        "<rss><channel><title>Empty</title></channel></rss>",
      ),
      headers: { "content-type": "application/rss+xml" },
      status: 200,
    }));
    const result = await createFashionEditorialAdapter({
      safeFetch: {
        resolve: async () => [{ address: "8.8.8.8", family: 4 }],
        transport,
      },
      searchProvider: { id: "fixture-search", search },
    }).retrieve(
      {
        includeSearchDiscovery: true,
        queryTerms: ["fashion"],
        sourceIds: ["vogue-editorial"],
      },
      context(),
    );
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "policy_denied",
          diagnosticCategory: "source_not_allowlisted",
        }),
      ]),
    );
    expect(transport).toHaveBeenCalledOnce();
  });
});
