import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function files(path: string): string[] {
  return readdirSync(path).flatMap((name) => {
    const entry = join(path, name);
    return statSync(entry).isDirectory()
      ? files(entry)
      : /\.[jt]sx?$/.test(entry)
        ? [entry]
        : [];
  });
}
describe("Marketing architecture boundary", () => {
  it("uses trusted Core boundaries without direct providers, URL fetching, or memory writes", () => {
    const source = files(resolve(process.cwd(), "src/modules/marketing"))
      .filter((file) => !file.includes(".test."))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(source).toContain("generateAIStructuredForTrustedJob");
    expect(source).toContain("generateAIStructured");
    expect(source).not.toMatch(
      /Ollama|OpenAICompatibleProvider|knowledge_memories|axios|pg_net/,
    );
    expect(source).not.toMatch(/fetch\([^)]*sourceUrl/);
    expect(source).not.toMatch(
      /buildAIKnowledgeContext|retrieveMemoriesForContext|createCompanyMemory|updateCompanyMemory|writeMarketingMemory|writeAgencyMemory/i,
    );
  });
  it("keeps Creative Council tool-free, provider-neutral, and server-authoritative", () => {
    const orchestrator = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/marketing/server/creative-council-orchestrator.ts",
      ),
      "utf8",
    );
    const action = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/marketing/creative-council-actions.ts",
      ),
      "utf8",
    );
    expect(orchestrator).toContain("generateAIStructured");
    expect(orchestrator).not.toMatch(
      /Ollama|OpenAICompatibleProvider|generateAIStructuredForTrustedJob|enqueueJob|EXTERNAL_WORKER|SERVERLESS/,
    );
    expect(orchestrator).not.toMatch(
      /buildAIKnowledgeContext|retrieveMemoriesForContext|knowledge_memories/,
    );
    expect(action).not.toMatch(
      /form\.get\(["'](?:organizationId|actorId|providerId|modelId|providerUrl|pluginId)["']\)/,
    );
  });
  it("keeps Strategic Review on the same trusted memory-free gateway boundary", () => {
    const orchestrator = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/marketing/server/strategic-review-orchestrator.ts",
      ),
      "utf8",
    );
    const action = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/marketing/strategic-review-actions.ts",
      ),
      "utf8",
    );
    expect(orchestrator).toContain("generateAIStructured");
    expect(orchestrator).not.toMatch(
      /Ollama|OpenAICompatibleProvider|generateAIStructuredForTrustedJob|enqueueJob|EXTERNAL_WORKER|SERVERLESS|fetch\(/,
    );
    expect(orchestrator).not.toMatch(
      /buildAIKnowledgeContext|retrieveMemoriesForContext|knowledge_memories|marketing_competitor_reel/,
    );
    expect(action).not.toMatch(
      /form\.get\(["'](?:organizationId|actorId|providerId|modelId|providerUrl|pluginId|context|hiddenPrompt)["']\)/,
    );
  });
  it("keeps browser forms free of organization and actor provenance inputs", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/components/marketing/marketing-workspace.tsx",
      ),
      "utf8",
    );
    expect(source).not.toMatch(
      /name=["'](?:organization_id|organizationId|created_by|createdBy|updated_by|updatedBy)["']/,
    );
  });
  it("keeps web discovery credentials and arbitrary provider routing server-only", () => {
    const action = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/marketing/external-research-actions.ts",
      ),
      "utf8",
    );
    const workspace = readFileSync(
      resolve(
        process.cwd(),
        "src/components/marketing/external-research-workspace.tsx",
      ),
      "utf8",
    );
    const provider = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/marketing/server/web-discovery-provider.ts",
      ),
      "utf8",
    );
    expect(provider).toContain('import "server-only"');
    expect(provider).toContain(
      'const TAVILY_SEARCH_URL = "https://api.tavily.com/search"',
    );
    expect(provider).toContain("STYLUS_WEB_DISCOVERY_TAVILY_API_KEY");
    expect(`${action}\n${workspace}`).not.toMatch(
      /STYLUS_WEB_DISCOVERY_TAVILY_API_KEY|api\.tavily\.com|name=["'](?:providerUrl|providerId|searchEndpoint|apiKey)["']/,
    );
  });
  it("keeps competitor media distinct from our Reel ideas", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/modules/marketing/reel-actions.ts"),
      "utf8",
    );
    expect(source).toContain('from("marketing_competitor_reels")');
    expect(source).not.toContain('from("marketing_reel_ideas")');
  });
  it("binds trusted job AI context and forbids semantic visual claims", () => {
    const execution = readFileSync(
      resolve(process.cwd(), "src/modules/ai/server/execution.ts"),
      "utf8",
    );
    const interpretation = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/marketing/server/reel-interpretation.ts",
      ),
      "utf8",
    );
    expect(execution).toContain(
      "jobResult.data.organization_id !== input.organizationId",
    );
    expect(execution).toContain("jobResult.data.created_by !== input.actorId");
    expect(interpretation).toContain("You have no frame visibility, OCR");
    expect(interpretation).not.toMatch(
      /knowledge_memories|storagePath|source_url/,
    );
  });
});
