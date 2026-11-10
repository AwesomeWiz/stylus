import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, it, expect } from "vitest";
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
}
describe("Core execution architecture and scope", () => {
  it("keeps Core Home/Tasks/Notes independent of Marketing-private schemas and model execution", () => {
    for (const folder of [
      "modules/execution",
      "modules/home",
      "components/execution",
      "components/home",
      "core/attention",
      "core/notes",
    ]) {
      for (const path of files(resolve(process.cwd(), "src", folder)).filter(
        (p) => !p.includes(".test."),
      )) {
        const source = readFileSync(path, "utf8");
        expect(source, path).not.toMatch(
          /@\/modules\/marketing|marketing_(?:experiments|hypotheses|learnings)|generateAI|ModelGateway|fetch\(/,
        );
      }
    }
  });
  it("keeps Notes out of automatic retrieval and exposes only an explicit promotion", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/modules/execution/server/mutations.ts"),
      "utf8",
    );
    expect(source).toContain('case "note-memory"');
    expect(source).not.toMatch(
      /retrieveMemoriesForContext|buildAIKnowledgeContext|enqueueJob/,
    );
  });
});
