import { describe, expect, it, vi } from "vitest";

import {
  RunByteBudget,
  safeFetchXml,
  SourceRetrievalError,
  validatePublicHttpsUrl,
  withSourceRetry,
} from "./safe-fetch";

const xml = new TextEncoder().encode("<rss><channel /></rss>");

describe("pinned-DNS RSS safe fetch", () => {
  it.each([
    "http://example.test/feed",
    "https://localhost/feed",
    "https://127.0.0.1/feed",
    "https://[::1]/feed",
    "https://user:secret@example.test/feed",
    "https://example.test:8443/feed",
  ])("rejects prohibited URL %s", (url) => {
    expect(() => validatePublicHttpsUrl(url)).toThrow(SourceRetrievalError);
  });

  it.each(["127.0.0.1", "10.0.0.1", "169.254.1.1", "::1", "2001:db8::1"])(
    "rejects non-public resolution %s before transport",
    async (address) => {
      const transport = vi.fn();
      await expect(
        safeFetchXml("https://feeds.example.test/rss", new RunByteBudget(), {
          resolve: async () => [
            { address, family: address.includes(":") ? 6 : 4 },
          ],
          transport,
        }),
      ).rejects.toMatchObject({ category: "policy_denied" });
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it("pins the validated address and revalidates every redirect host", async () => {
    const resolve = vi
      .fn()
      .mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }])
      .mockResolvedValueOnce([{ address: "1.1.1.1", family: 4 }]);
    const transport = vi
      .fn()
      .mockResolvedValueOnce({
        body: new Uint8Array(),
        headers: { location: "https://second.example.test/feed" },
        status: 302,
      })
      .mockResolvedValueOnce({
        body: xml,
        headers: { "content-type": "application/rss+xml" },
        status: 200,
      });
    const result = await safeFetchXml(
      "https://first.example.test/feed",
      new RunByteBudget(),
      { resolve, transport },
    );
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[0]?.[0].address.address).toBe("8.8.8.8");
    expect(transport.mock.calls[1]?.[0].address.address).toBe("1.1.1.1");
    expect(result.finalUrl).toBe("https://second.example.test/feed");
  });

  it("rejects a redirect that resolves to a private destination", async () => {
    const transport = vi.fn().mockResolvedValue({
      body: new Uint8Array(),
      headers: { location: "https://private.example.test/feed" },
      status: 302,
    });
    await expect(
      safeFetchXml("https://public.example.test/feed", new RunByteBudget(), {
        resolve: vi
          .fn()
          .mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }])
          .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]),
        transport,
      }),
    ).rejects.toMatchObject({ category: "policy_denied" });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("enforces the three-redirect ceiling", async () => {
    const transport = vi.fn(async ({ url }: { url: URL }) => ({
      body: new Uint8Array(),
      headers: { location: `https://example.test${url.pathname}x` },
      status: 302,
    }));
    await expect(
      safeFetchXml("https://example.test/feed", new RunByteBudget(), {
        resolve: async () => [{ address: "8.8.8.8", family: 4 }],
        transport,
      }),
    ).rejects.toMatchObject({ category: "policy_denied" });
    expect(transport).toHaveBeenCalledTimes(4);
  });

  it("enforces the eight-second source timeout", async () => {
    vi.useFakeTimers();
    try {
      const pending = safeFetchXml(
        "https://example.test/feed",
        new RunByteBudget(),
        {
          resolve: async () => [{ address: "8.8.8.8", family: 4 }],
          transport: ({ signal }) =>
            new Promise((_, reject) =>
              signal.addEventListener(
                "abort",
                () => reject(new Error("aborted")),
                {
                  once: true,
                },
              ),
            ),
        },
      );
      const assertion = expect(pending).rejects.toMatchObject({
        category: "timeout",
      });
      await vi.advanceTimersByTimeAsync(8_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects bad content types, oversized bodies, and malformed UTF-8 safely", async () => {
    const resolve = async () => [{ address: "8.8.8.8", family: 4 as const }];
    await expect(
      safeFetchXml("https://example.test/feed", new RunByteBudget(), {
        resolve,
        transport: async () => ({
          body: xml,
          headers: { "content-type": "text/html" },
          status: 200,
        }),
      }),
    ).rejects.toMatchObject({ category: "invalid_content_type" });
    await expect(
      safeFetchXml("https://example.test/feed", new RunByteBudget(), {
        resolve,
        transport: async () => ({
          body: new Uint8Array(1_048_577),
          headers: {},
          status: 200,
        }),
      }),
    ).rejects.toMatchObject({ category: "oversized_response" });
    await expect(
      safeFetchXml("https://example.test/feed", new RunByteBudget(), {
        resolve,
        transport: async () => ({
          body: new Uint8Array([255]),
          headers: { "content-type": "text/xml" },
          status: 200,
        }),
      }),
    ).rejects.toMatchObject({ category: "malformed_source" });
  });

  it("bounds the aggregate run byte budget", async () => {
    const budget = new RunByteBudget(10);
    budget.consume(8);
    expect(() => budget.consume(3)).toThrow(SourceRetrievalError);
    expect(budget.used).toBe(8);
  });

  it("retries one transient failure but never retries permanent failures", async () => {
    const transient = vi
      .fn()
      .mockRejectedValueOnce(new SourceRetrievalError("timeout", true))
      .mockResolvedValue("ok");
    await expect(
      withSourceRetry(transient, async () => undefined),
    ).resolves.toBe("ok");
    expect(transient).toHaveBeenCalledTimes(2);
    const retryAfter = vi
      .fn()
      .mockRejectedValueOnce(
        new SourceRetrievalError("rate_limited", true, 60_000),
      )
      .mockResolvedValue("ok");
    const sleep = vi.fn(async () => undefined);
    await withSourceRetry(retryAfter, sleep);
    expect(sleep).toHaveBeenCalledWith(10_000);
    const permanent = vi
      .fn()
      .mockRejectedValue(new SourceRetrievalError("invalid_source"));
    await expect(
      withSourceRetry(permanent, async () => undefined),
    ).rejects.toMatchObject({ category: "invalid_source" });
    expect(permanent).toHaveBeenCalledTimes(1);
  });
});
