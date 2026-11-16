import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { describe, expect, it } from "vitest";
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
}
const read = (p: string) =>
  readFileSync(resolve(process.cwd(), "src", p), "utf8");
describe("integration security boundaries", () => {
  it("keeps Core integration services independent of private business domains and AI", () => {
    for (const path of files(
      resolve(process.cwd(), "src/modules/integrations"),
    ).filter((p) => !p.includes(".test."))) {
      const source = readFileSync(path, "utf8");
      expect(source, path).not.toMatch(
        /@\/modules\/marketing|marketing_(?:hypotheses|experiments|learnings)|ModelGateway|generateAI|knowledge_memories|ollama/i,
      );
    }
  });
  it("keeps secret and provider transport code server-only", () => {
    for (const path of files(
      resolve(process.cwd(), "src/modules/integrations/server"),
    ).filter((p) => !p.includes(".test.")))
      expect(readFileSync(path, "utf8"), path).toContain(
        'import "server-only"',
      );
    for (const path of files(
      resolve(process.cwd(), "src/components/integrations"),
    ).filter((p) => !p.includes(".test.")))
      expect(readFileSync(path, "utf8"), path).not.toMatch(
        /SUPABASE_SERVICE_ROLE|STYLUS_INTEGRATION_KEYS|access_token|refresh_token|process\.env|\/server\//,
      );
  });
  it("provides no Drive content API, provider deletion, AI ingestion or GitHub business mutation", () => {
    expect(read("modules/integrations/server/google.ts")).not.toMatch(
      /alt=media|\/export|attendees\s*:|method:\s*["']DELETE/,
    );
    expect(read("modules/integrations/server/github.ts")).not.toMatch(
      /mutation\s*\{|method:\s*["'](?:PUT|PATCH|DELETE)|\/actions\/|\/contents\//,
    );
  });
});
