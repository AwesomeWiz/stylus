import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(process.cwd(), "src/app/api/worker/[operation]/route.ts"),
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
});
