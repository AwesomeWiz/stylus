import { describe, expect, it, vi } from "vitest";

import { createRedditAdapter } from "./reddit-adapter";
import { getRedditConfiguration } from "./reddit-configuration";
import { RequestConcurrencyGate } from "./research-sources";
import { RunByteBudget } from "./safe-fetch";

const context = () => ({
  budget: new RunByteBudget(),
  fetchedAt: "2026-08-31T00:00:00.000Z",
  requestGate: new RequestConcurrencyGate(3),
  signal: new AbortController().signal,
});
const configuration = {
  clientId: "approved-client",
  clientSecret: "server-only-secret",
  userAgent: "stylus-marketing/1.0 by approved-operator",
};

describe("bounded Reddit research adapter", () => {
  it("requires explicit approval enablement and complete server-only OAuth values", () => {
    expect(
      getRedditConfiguration({
        STYLUS_REDDIT_CLIENT_ID: "id",
        STYLUS_REDDIT_CLIENT_SECRET: "secret",
        STYLUS_REDDIT_USER_AGENT: "stylus/1.0",
      }),
    ).toBeNull();
    expect(
      getRedditConfiguration({
        STYLUS_REDDIT_API_ENABLED: "true",
        STYLUS_REDDIT_CLIENT_ID: "id",
        STYLUS_REDDIT_CLIENT_SECRET: "secret",
        STYLUS_REDDIT_USER_AGENT: "stylus/1.0",
      }),
    ).toEqual({
      clientId: "id",
      clientSecret: "secret",
      userAgent: "stylus/1.0",
    });
  });
  it("fails closed without approved server configuration and never scrapes HTML", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const result = await createRedditAdapter(fetchMock, null).retrieve(
      {
        communityIds: ["female-fashion-advice"],
        queryVariants: ["sizing"],
      },
      context(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        category: "policy_denied",
        diagnosticCategory: "source_unavailable",
        metadata: expect.not.objectContaining({
          clientSecret: expect.anything(),
        }),
      }),
    ]);
  });

  it("uses fixed OAuth hosts and normalizes bounded posts and depth-one comments", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v1/access_token") {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toEqual(
          expect.objectContaining({
            authorization: expect.stringMatching(/^Basic /),
          }),
        );
        return json({
          access_token: "temporary-token",
          expires_in: 3_600,
          token_type: "bearer",
        });
      }
      expect(url.origin).toBe("https://oauth.reddit.com");
      expect(init?.headers).toEqual(
        expect.objectContaining({ authorization: "Bearer temporary-token" }),
      );
      const community = url.pathname.split("/")[2]!;
      if (url.pathname.endsWith("/search"))
        return json(
          listing([
            {
              kind: "t3",
              data: {
                author: "public-user",
                created_utc: 1_788_134_400,
                id: community === "femalefashionadvice" ? "post-a" : "post-b",
                num_comments: 12,
                permalink: `/r/${community}/comments/post/style/`,
                score: 25,
                selftext: "Sizing labels vary between brands.",
                subreddit: community,
                title: "Why is clothing sizing inconsistent?",
              },
            },
          ]),
        );
      return json([
        listing([]),
        listing([
          {
            kind: "t1",
            data: {
              author: "commenter",
              body: "I measure every garment because labels feel unreliable.",
              created_utc: 1_788_134_500,
              depth: 0,
              id: `${community}-comment`,
              parent_id: `t3_${community === "femalefashionadvice" ? "post-a" : "post-b"}`,
              permalink: `/r/${community}/comments/post/style/comment/`,
              replies: listing([
                {
                  kind: "t1",
                  data: {
                    body: "Size charts help, but garment measurements are better.",
                    depth: 1,
                    id: `${community}-reply`,
                    parent_id: `t1_${community}-comment`,
                    subreddit: community,
                  },
                },
              ]),
              score: 9,
              subreddit: community,
            },
          },
        ]),
      ]);
    });
    const result = await createRedditAdapter(fetchMock, configuration).retrieve(
      {
        communityIds: ["female-fashion-advice", "male-fashion-advice"],
        queryVariants: ["sizing", "fit"],
      },
      context(),
    );
    expect(result.failures).toEqual([]);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      adapterId: "reddit",
      metadata: expect.objectContaining({ community: "femalefashionadvice" }),
      nativeId: "post-a",
    });
    expect(result.items[0]?.evidence.map((item) => item.evidenceType)).toEqual([
      "REDDIT_POST",
      "REDDIT_COMMENT",
      "REDDIT_COMMENT",
    ]);
    expect(result.items[0]?.evidence[2]).toMatchObject({
      metadata: expect.objectContaining({ depth: 1 }),
      parentNativeId: "femalefashionadvice-comment",
    });
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(JSON.stringify(result)).not.toContain("server-only-secret");
    expect(JSON.stringify(result)).not.toContain("temporary-token");
  });

  it("returns a safe diagnostic for malformed/non-JSON provider payloads", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response("<html>blocked</html>", {
          headers: { "content-type": "text/html" },
          status: 200,
        }),
    );
    const result = await createRedditAdapter(fetchMock, configuration).retrieve(
      {
        communityIds: ["female-fashion-advice"],
        queryVariants: ["sizing"],
      },
      context(),
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.failures).toEqual([
      expect.objectContaining({ diagnosticCategory: "invalid_content_type" }),
    ]);
    expect(JSON.stringify(result)).not.toContain("blocked");
  });

  it("never retains more than four posts or eight comments", async () => {
    const posts = Array.from({ length: 8 }, (_, index) => ({
      kind: "t3",
      data: {
        id: `post-${index}`,
        permalink: `/r/femalefashionadvice/comments/post-${index}/style/`,
        selftext: "Sizing and fit evidence.",
        subreddit: "femalefashionadvice",
        title: `Sizing evidence ${index}`,
      },
    }));
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("access_token"))
        return json({
          access_token: "token",
          expires_in: 3600,
          token_type: "bearer",
        });
      if (url.includes("/search")) return json(listing(posts));
      return json([
        listing([]),
        listing(
          Array.from({ length: 10 }, (_, index) => ({
            kind: "t1",
            data: {
              body: `Sizing comment ${index}`,
              depth: 0,
              id: `comment-${index}`,
              subreddit: "femalefashionadvice",
            },
          })),
        ),
      ]);
    });
    const result = await createRedditAdapter(fetchMock, configuration).retrieve(
      {
        communityIds: ["female-fashion-advice"],
        queryVariants: ["sizing", "fit"],
      },
      context(),
    );
    expect(result.items).toHaveLength(4);
    expect(
      result.items
        .flatMap((item) => item.evidence)
        .filter((item) => item.evidenceType === "REDDIT_COMMENT"),
    ).toHaveLength(8);
  });
});

function listing(children: unknown[]) {
  return { data: { children } };
}

function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
