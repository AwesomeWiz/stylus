import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(process.cwd(), "src/app/api/worker/[operation]/route.ts"),
  "utf8",
);
const workerActions = readFileSync(
  resolve(process.cwd(), "src/modules/workers/actions.ts"),
  "utf8",
);
const jobActions = readFileSync(
  resolve(process.cwd(), "src/modules/jobs/actions.ts"),
  "utf8",
);
const workerSchemas = readFileSync(
  resolve(process.cwd(), "src/modules/workers/schemas.ts"),
  "utf8",
);
const workerWorkspace = readFileSync(
  resolve(process.cwd(), "src/components/workers/workers-workspace.tsx"),
  "utf8",
);
const workerSources = [
  "api.ts",
  "cli.ts",
  "config.ts",
  "registry.ts",
  "runtime.ts",
]
  .map((file) =>
    readFileSync(resolve(process.cwd(), `../worker/src/${file}`), "utf8"),
  )
  .join("\n");

function runtimeExports(source: string) {
  return [...source.matchAll(/^export\s+(?!type\s|interface\s)(.+)$/gm)].map(
    (match) => match[1] ?? "",
  );
}

describe("worker architecture boundary", () => {
  it("keeps the service credential in the server broker only", () => {
    expect(route).toContain("createServiceSupabaseClient");
    expect(workerSources).not.toMatch(/SUPABASE_SERVICE_ROLE|service_role/i);
    expect(workerSources).not.toMatch(
      /NEXT_PUBLIC_SUPABASE|supabase\.co\/rest/,
    );
  });
  it("has no arbitrary command or dynamic code surface", () => {
    expect(workerSources).not.toMatch(
      /child_process|exec\(|spawn\(|powershell|cmd\.exe|eval\(|new Function|dynamic import/i,
    );
    expect(workerSources).not.toContain("run_command");
  });
  it("bounds broker requests and accepts only fixed operations", () => {
    expect(route).toContain("length > 8192");
    expect(route).toContain("rateLimited");
    expect(route).toContain('z.enum(["core.worker.echo"])');
  });
  it("exports only async actions from the worker use-server boundary", () => {
    for (const source of [workerActions, jobActions]) {
      expect(source).toMatch(/^\s*["']use server["'];/);
      expect(runtimeExports(source).length).toBeGreaterThan(0);
      expect(
        runtimeExports(source).every((declaration) =>
          declaration.startsWith("async function "),
        ),
      ).toBe(true);
    }
    expect(workerActions).toMatch(
      /^export\s+async\s+function\s+createWorkerPairingAction/m,
    );
    expect(workerActions).toMatch(
      /^export\s+async\s+function\s+revokeWorkerAction/m,
    );
    expect(workerSchemas).not.toContain('"use server"');
    expect(workerSchemas).toContain("export const initialWorkerActionState");
    expect(workerWorkspace).toContain('from "@/modules/workers/schemas"');
  });
});
