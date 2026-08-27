import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadConfig, saveConfig } from "./config.js";

describe("worker local config", () => {
  it("persists and reloads only scoped worker configuration", async () => {
    const directory = await mkdtemp(join(tmpdir(), "stylus-worker-"));
    const path = join(directory, "worker.json");
    const config = {
      credential: "a".repeat(64),
      name: "Worker",
      organizationId: "org",
      stylusUrl: "https://stylus.example",
      workerId: "worker",
    };
    await saveConfig(config, path);
    expect(await loadConfig(path)).toEqual(config);
    expect(await readFile(path, "utf8")).not.toContain("service_role");
    if (process.platform !== "win32")
      expect((await stat(path)).mode & 0o777).toBe(0o600);
  });
});
