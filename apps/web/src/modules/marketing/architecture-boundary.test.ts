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
    expect(source).not.toMatch(
      /Ollama|OpenAICompatibleProvider|knowledge_memories|axios|pg_net/,
    );
    expect(source).not.toMatch(/fetch\([^)]*sourceUrl/);
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
