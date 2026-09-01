import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("TASK-018 architecture boundaries", () => {
  const actions = source("src/modules/marketing/performance-actions.ts");
  const algorithm = source("src/modules/marketing/performance-learning.ts");
  const server = source("src/modules/marketing/server/performance.ts");
  const route = source("src/app/apps/marketing/performance/page.tsx");
  const workspace = source(
    "src/components/marketing/performance-workspace.tsx",
  );
  const combined = `${actions}\n${algorithm}\n${server}\n${route}\n${workspace}`;

  it("guards the route through the enabled Marketing plugin boundary", () => {
    expect(route).toContain('requireEnabledPlugin("marketing")');
    expect(route).toContain("getPerformanceWorkspaceData(");
  });

  it("derives actor and organization server-side and accepts no browser provenance", () => {
    expect(actions).toContain("getCurrentOrganizationContext()");
    expect(actions).toContain("current.organization.id");
    expect(actions).toContain("current.user.id");
    expect(algorithm).not.toMatch(/organizationId|actorId|createdBy/);
  });

  it("reuses the TASK-017C opportunity taxonomy rather than defining another list", () => {
    expect(algorithm).toContain(
      'import { contentOpportunityTypeSchema } from "./external-research"',
    );
    expect(workspace).toContain('from "@/modules/marketing/external-research"');
    expect(algorithm).not.toContain('"RELATABLE_PAIN",');
    expect(workspace).not.toContain('"RELATABLE_PAIN",');
  });

  it("is synchronous and bounded to 100 publications, 500 snapshots, and 20 candidates", () => {
    expect(algorithm).toContain("contents: 100");
    expect(algorithm).toContain("snapshots: 500");
    expect(algorithm).toContain("learningsPerRequest: 20");
    expect(server).not.toMatch(/enqueue|jobs|worker|after\(/i);
  });

  it("has zero AI, Council, Strategic Review, External Research execution, or memory side effects", () => {
    expect(combined).not.toMatch(
      /generateAI|ModelGateway|runCreativeCouncil|runStrategicReview|enqueueExternalResearch|knowledge_memories|createCompanyMemory|promote.*memory|askCouncil/i,
    );
  });

  it("keeps the use-server module limited to async actions", () => {
    expect(actions.trimStart()).toMatch(/^"use server";/);
    expect(actions).not.toMatch(
      /export (?:const|let|var|class|interface|type) /,
    );
    expect(actions.match(/export async function/g)).toHaveLength(4);
  });
});
