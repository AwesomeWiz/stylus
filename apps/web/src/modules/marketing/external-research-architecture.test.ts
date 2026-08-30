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

  it("uses only the fixed HN host and the centralized RSS safe fetch", () => {
    const hackerNews = source(
      "src/modules/marketing/server/hacker-news-adapter.ts",
    );
    const rss = source("src/modules/marketing/server/rss-atom-adapter.ts");
    expect(hackerNews).toContain(
      'const HN_API = "https://hacker-news.firebaseio.com/v0"',
    );
    expect(hackerNews).toContain('redirect: "error"');
    expect(hackerNews).not.toMatch(/reddit|generic search/i);
    expect(rss).toContain("safeFetchXml(");
    expect(rss).not.toMatch(/fetch\(/);
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
