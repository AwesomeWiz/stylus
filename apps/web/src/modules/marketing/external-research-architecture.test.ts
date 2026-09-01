import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("external research architecture boundaries", () => {
  it("registers one exact hosted job and uses the trusted gateway once", () => {
    const job = source("src/modules/marketing/external-research-job.ts");
    const handler = source(
      "src/modules/marketing/server/external-research-handler.ts",
    );
    expect(job).toContain('id: "marketing.external-research.run"');
    expect(job).toContain('executionClass: "SERVERLESS"');
    expect(job).toContain("hostedExecutionSupported: true");
    expect(
      handler.match(/generateAIStructuredForTrustedJob\(/g) ?? [],
    ).toHaveLength(1);
    expect(handler).not.toMatch(
      /generateAIStructured\(|generateAIText\(|fetch\(/,
    );
  });

  it("uses the fixed HN host and centralized pinned-DNS textual safe fetches", () => {
    const hackerNews = source(
      "src/modules/marketing/server/hacker-news-adapter.ts",
    );
    const rss = source("src/modules/marketing/server/rss-atom-adapter.ts");
    const safeFetch = source("src/modules/marketing/server/safe-fetch.ts");
    expect(hackerNews).toContain(
      'const HN_API = "https://hacker-news.firebaseio.com/v0"',
    );
    expect(hackerNews).toContain('redirect: "error"');
    expect(hackerNews).not.toMatch(/reddit|generic search/i);
    expect(hackerNews).toContain("safeFetchArticle(");
    expect(rss).toContain("safeFetchXml(");
    expect(rss).not.toMatch(/fetch\(/);
    expect(safeFetch).toContain("validatePublicHttpsUrl");
    expect(safeFetch).toContain("pinnedHttpsRequest");
    expect(safeFetch).toContain("httpsRequest(");
    expect(safeFetch).toContain("lookup:");
    expect(safeFetch).not.toContain("rejectUnauthorized: false");
    expect(safeFetch).not.toMatch(/headers:\s*\{[\s\S]*?authorization/i);
    expect(safeFetch).not.toMatch(/headers:\s*\{[\s\S]*?cookie/i);
  });

  it("keeps Reddit official, server-only, bounded, and free of HTML fallback", () => {
    const reddit = source("src/modules/marketing/server/reddit-adapter.ts");
    const config = source(
      "src/modules/marketing/server/reddit-configuration.ts",
    );
    expect(reddit).toContain('const REDDIT_API = "https://oauth.reddit.com"');
    expect(reddit).toContain(
      'const REDDIT_TOKEN = "https://www.reddit.com/api/v1/access_token"',
    );
    expect(reddit).toContain('redirect: "error"');
    expect(reddit).not.toMatch(/\.json\b|old\.reddit|cookie/i);
    expect(config).toContain("STYLUS_REDDIT_API_ENABLED");
    expect(config).toContain("STYLUS_REDDIT_CLIENT_SECRET");
  });

  it("routes editorial articles through centralized pinned-DNS safe fetch", () => {
    const editorial = source(
      "src/modules/marketing/server/fashion-editorial-adapter.ts",
    );
    const registry = source(
      "src/modules/marketing/server/fashion-research-source-registry.ts",
    );
    expect(editorial).toContain("safeFetchArticle(");
    expect(editorial).toContain("createRssAtomAdapter(");
    expect(editorial).not.toMatch(/fetch\(/);
    expect(registry).toContain("canonicalDomain");
    expect(registry).toContain("articleFetchPermitted");
  });

  it("keeps social platforms official, fail-closed, read-only, and transport-neutral", () => {
    const social = source("src/modules/marketing/server/social-adapter.ts");
    const capabilities = source(
      "src/modules/marketing/server/social-platform-registry.ts",
    );
    const handler = source(
      "src/modules/marketing/server/external-research-handler.ts",
    );
    for (const platform of ["INSTAGRAM", "TIKTOK", "YOUTUBE", "PINTEREST"])
      expect(capabilities).toContain(`platform: "${platform}"`);
    expect(capabilities).toContain('status: "APPROVAL_REQUIRED"');
    expect(capabilities).toContain('status: "UNSUPPORTED_FOR_DISCOVERY"');
    expect(capabilities).toContain('status: "POLICY_DENIED"');
    expect(social).not.toMatch(/fetch\(|playwright|puppeteer|cookie|captcha/i);
    expect(social).not.toMatch(/method:\s*["'](?:post|put|patch|delete)["']/i);
    expect(
      handler.match(/generateAIStructuredForTrustedJob\(/g) ?? [],
    ).toHaveLength(1);
    expect(handler).not.toMatch(/creativeCouncil|knowledge_memories/i);
  });

  it("does not wire external research into Council, memory, or the Windows worker", () => {
    const council = source(
      "src/modules/marketing/server/creative-council-orchestrator.ts",
    );
    const workerRegistry = source("../../apps/worker/src/registry.ts");
    expect(council).not.toContain("external-research");
    expect(workerRegistry).not.toContain("external-research");
    expect(
      source("src/modules/marketing/server/external-research-handler.ts"),
    ).not.toContain("knowledge_memories");
  });

  it("limits each Cron request to one executor call", () => {
    const route = source("src/app/api/cron/serverless-jobs/route.ts");
    expect(
      route.match(/runOneHostedServerlessJob\("cron"\)/g) ?? [],
    ).toHaveLength(1);
    expect(route).toContain("isAuthorizedCronRequest");
    expect(route).not.toMatch(/while\s*\(|Promise\.all/);
  });

  it("uses Hobby-compatible daily recovery and a shared immediate executor", () => {
    const action = source("src/modules/marketing/external-research-actions.ts");
    const hosted = source(
      "src/modules/jobs/server/hosted-serverless-execution.ts",
    );
    const vercel = JSON.parse(source("../../vercel.json")) as {
      crons: { schedule: string }[];
    };
    expect(vercel.crons).toEqual([
      expect.objectContaining({ schedule: "0 3 * * *" }),
    ]);
    expect(action).toContain("after(async () =>");
    expect(action).toContain(
      'runOneHostedServerlessJob("immediate", result.jobId)',
    );
    expect(hosted).toContain("applicationJobRegistry");
    expect(hosted).toContain("SupabaseServerlessJobExecutionStore");
    expect(action).not.toContain("runExternalResearchJob");
  });
});
