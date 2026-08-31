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
        question: "What sizing frustrations recur for fashion shoppers?",
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
          question: "What public fashion evidence supports this research?",
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
        question: "What evidence explains fashion brand pricing?",
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
        question: "What public fashion competitor evidence is available?",
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

  it("rejects unrelated Vogue metadata before article fetch and retains only relevant evidence", async () => {
    const transport = vi.fn(async (input: { url: URL }) => {
      if (input.url.pathname === "/feed/rss")
        return {
          body: new TextEncoder().encode(`<rss><channel>
            <item><guid>home</guid><title>Inside the French Riviera Holiday Home of the Late Fashion Icon Jacqueline de Ribes</title><description>Fashion interiors and style.</description><link>https://www.vogue.com/article/holiday-home</link></item>
            <item><guid>scarf</guid><title>How Fashion Made The Fusty Silk Scarf Cool Again</title><description>Fashion styling returns.</description><link>https://www.vogue.com/article/silk-scarf</link></item>
            <item><guid>circular</guid><title>Why circular fashion and clothing resale are growing</title><description>Consumers seek sustainable clothing and secondhand options.</description><link>https://www.vogue.com/article/circular-resale</link></item>
          </channel></rss>`),
          headers: { "content-type": "application/rss+xml" },
          status: 200,
        };
      expect(input.url.pathname).toBe("/article/circular-resale");
      return {
        body: new TextEncoder().encode(
          "<html><article><p>Circular resale supports more sustainable clothing consumption.</p></article></html>",
        ),
        headers: { "content-type": "text/html" },
        status: 200,
      };
    });
    const result = await createFashionEditorialAdapter({
      safeFetch: {
        resolve: async () => [{ address: "8.8.8.8", family: 4 }],
        transport,
      },
      searchProvider: null,
    }).retrieve(
      {
        includeSearchDiscovery: false,
        question:
          "What evidence suggests growing interest in sustainable fashion?",
        queryTerms: ["sustainable fashion", "ethical fashion"],
        sourceIds: ["vogue-editorial"],
      },
      context(),
    );
    expect(result.failures).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe(
      "Why circular fashion and clothing resale are growing",
    );
    expect(
      result.items[0]?.evidence.map((entry) => entry.evidenceType),
    ).toEqual(["FEED_ITEM", "ARTICLE_CONTENT"]);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("does not retain article content that fails the independent relevance gate", async () => {
    const transport = vi.fn(async (input: { url: URL }) =>
      input.url.pathname === "/feed/rss"
        ? {
            body: new TextEncoder().encode(
              `<rss><channel><item><guid>sustainable</guid><title>Sustainable clothing update</title><description>Ethical fashion reporting.</description><link>https://www.vogue.com/article/sustainable-update</link></item></channel></rss>`,
            ),
            headers: { "content-type": "application/rss+xml" },
            status: 200,
          }
        : {
            body: new TextEncoder().encode(
              "<html><article><p>A celebrity holiday-home tour with silk scarf styling.</p></article></html>",
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
        question: "What evidence supports sustainable fashion interest?",
        queryTerms: ["sustainable fashion"],
        sourceIds: ["vogue-editorial"],
      },
      context(),
    );
    expect(result.items).toHaveLength(1);
    expect(
      result.items[0]?.evidence.map((entry) => entry.evidenceType),
    ).toEqual(["FEED_ITEM"]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        category: "no_results",
        diagnosticCategory: "zero_matching_candidates",
        metadata: expect.objectContaining({ evidenceKind: "ARTICLE_CONTENT" }),
      }),
    ]);
  });
});
