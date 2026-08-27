import { describe, expect, it, vi } from "vitest";

import { WorkerHandlerRegistry, workerEchoHandler } from "./registry.js";

describe("worker handler registry", () => {
  it("registers only the trusted external diagnostic", async () => {
    const registry = new WorkerHandlerRegistry([workerEchoHandler]);
    expect(registry.get("core.test.worker-echo")).toBe(workerEchoHandler);
    const api = { operation: vi.fn().mockResolvedValue({}) };
    await expect(
      workerEchoHandler.run(
        { message: "Stylus worker check" },
        {
          api: api as never,
          jobId: "job",
          signal: new AbortController().signal,
        },
      ),
    ).resolves.toEqual({ acknowledged: true });
    expect(api.operation).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate and wrong-class handlers", () => {
    expect(
      () => new WorkerHandlerRegistry([workerEchoHandler, workerEchoHandler]),
    ).toThrow("Duplicate");
    expect(
      () =>
        new WorkerHandlerRegistry([
          { ...workerEchoHandler, executionClass: "DATABASE" as never },
        ]),
    ).toThrow("EXTERNAL_WORKER");
  });

  it("rejects malformed diagnostic input", async () => {
    await expect(
      workerEchoHandler.run(
        { executable: "cmd.exe" },
        {
          api: { operation: vi.fn() } as never,
          jobId: "job",
          signal: new AbortController().signal,
        },
      ),
    ).rejects.toThrow("Invalid worker diagnostic input");
  });
});
