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
describe("Marketing TASK-013 boundary", () => {
  it("does not invoke AI, jobs, workers, network clients, or memory writes", () => {
    const source = files(resolve(process.cwd(), "src/modules/marketing"))
      .filter((file) => !file.includes(".test."))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /generateAI|ModelGateway|enqueueJob|windows.worker|knowledge_memories|fetch\(|axios|pg_net/,
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
});
