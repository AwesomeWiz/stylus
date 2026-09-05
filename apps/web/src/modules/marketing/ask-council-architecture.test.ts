import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), "src", path), "utf8");
const orchestrator = source(
  "modules/marketing/server/ask-council-orchestrator.ts",
);
const agents = source("modules/marketing/server/ask-council-agents.ts");
const context = source("modules/marketing/server/ask-council-context.ts");
const actions = source("modules/marketing/ask-council-actions.ts");
const plugin = source("plugins/marketing/index.ts");

describe("TASK-020 architecture boundaries", () => {
  it("uses only the trusted ModelGateway entrypoint with the registered Marketing capability", () => {
    expect(orchestrator).toContain(
      'import { generateAIStructured } from "@/core/ai/server"',
    );
    expect(orchestrator).toContain("ASK_COUNCIL_CAPABILITY");
    expect(plugin).toContain('"marketing.ask-council.execute"');
    expect(`${orchestrator}\n${agents}`).not.toMatch(
      /openai|openrouter|ollama|fetch\(|axios|providerurl/i,
    );
  });

  it("has no tool, autonomous loop, research execution, job, Create, or Strategic Review invocation", () => {
    const implementation = `${orchestrator}\n${agents}\n${context}\n${actions}`;
    expect(implementation).not.toMatch(
      /runCreativeCouncil|runStrategicReview|runExternalResearch|deriveAndPersistPerformance|enqueueJob|executeRegisteredJob|safeFetch|web-discovery|hacker-news-adapter|reddit-adapter/,
    );
    expect(`${orchestrator}\n${agents}`).not.toMatch(
      /while\s*\(|for\s*\(;;\)|mcp|hermes/i,
    );
    expect(agents).toContain("tools: []");
  });

  it("reads canonical company data without arbitrary memory retrieval or any memory write", () => {
    expect(context).toContain("getCompanyKnowledge");
    expect(context).not.toMatch(
      /searchCompanyMemor|search_company_memories|create_company_memory|update_company_memory|knowledge_memories/,
    );
    expect(`${orchestrator}\n${context}`).not.toMatch(/agency/i);
  });

  it("treats user, history, research, and creative artifacts as untrusted data", () => {
    expect(agents).toMatch(/user question.*untrusted data/i);
    expect(agents).toMatch(/external research.*never instructions/i);
    expect(agents).toMatch(/never call tools, browse, research/i);
    expect(orchestrator).toMatch(/prior messages.*untrusted data/i);
    expect(orchestrator).toMatch(/never call tools, browse, research/i);
  });

  it("keeps the Server Action boundary browser-safe", () => {
    expect(actions.startsWith('"use server"')).toBe(true);
    expect(actions).toContain("getCurrentOrganizationContext");
    expect(actions).toContain("assertCanMutateMarketing");
    expect(actions).not.toMatch(/form\.get\("organizationId"\)/);
    expect(actions).not.toMatch(/form\.get\("actorId"\)/);
    expect(actions).not.toMatch(/form\.get\("provider/);
    expect(actions).not.toMatch(/export (const|type|interface) /);
  });

  it("contains no downstream artifact, research, performance, memory, agency, or job mutation", () => {
    const implementation = `${orchestrator}\n${context}\n${actions}`;
    expect(implementation).not.toMatch(/\.insert\s*\(/);
    expect(implementation).not.toMatch(/\.update\s*\(/);
    expect(implementation).not.toMatch(/\.delete\s*\(/);
    expect(implementation).not.toMatch(
      /createReelBrief|runStrategicReview|runExternalResearch|deriveAndPersistPerformance|createCompanyMemory|enqueueJob/,
    );
  });
});
