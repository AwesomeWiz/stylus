import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
const read = (p: string) =>
  readFileSync(resolve(process.cwd(), "src", p), "utf8");
describe("growth workflow boundaries", () => {
  it("adds no model, retrieval, worker, source fetching or automatic promotion", () => {
    const domain = [
      "growth-data",
      "growth-entities",
      "growth-mutations",
      "growth-provenance",
    ]
      .map((n) => read(`modules/marketing/server/${n}.ts`))
      .join("\n");
    expect(domain).not.toMatch(
      /generateAI|ModelGateway|buildAIKnowledgeContext|enqueueJob|fetch\(|knowledge_memories/,
    );
    expect(read("modules/marketing/server/growth-mutations.ts")).toContain(
      'case "promote"',
    );
  });
  it("reuses the public registry, exact existing artifacts and Core Memory domain", () => {
    expect(read("plugins/board-entities.ts")).toContain(
      "...growthEntityProviders",
    );
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/20261109000110_marketing_growth_learning.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("public.create_company_memory_once(");
    expect(sql).not.toMatch(
      /(?:insert into|update) public\.knowledge_memories/,
    );
    expect(sql).toContain(
      "references public.marketing_performance_snapshots(organization_id,id)",
    );
    expect(sql).toContain(
      "references public.marketing_reel_brief_versions(organization_id,id)",
    );
  });
});
