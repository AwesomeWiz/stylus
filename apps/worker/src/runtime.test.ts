import { describe, expect, it, vi } from "vitest";

import type { WorkerApi } from "./api.js";
import { WorkerHandlerRegistry } from "./registry.js";
import { WorkerRuntime } from "./runtime.js";

describe("worker runtime", () => {
  it("claims one trusted job, completes it, and shuts down cleanly", async () => {
    const shutdown = new AbortController();
    const api = {
      claim: vi
        .fn()
        .mockResolvedValueOnce({
          attempt_count: 1,
          id: "job",
          input_metadata: {},
          job_type: "core.test.runtime",
          organization_id: "org",
          status: "RUNNING",
        })
        .mockResolvedValue(null),
      heartbeat: vi.fn().mockResolvedValue({}),
      operation: vi.fn().mockImplementation((operation: string) => {
        if (operation === "complete") shutdown.abort("done");
        return Promise.resolve({});
      }),
    };
    const registry = new WorkerHandlerRegistry([
      {
        capability: "core.worker.echo",
        executionClass: "EXTERNAL_WORKER",
        jobType: "core.test.runtime",
        timeoutMs: 30_000,
        run: vi.fn().mockResolvedValue({ acknowledged: true }),
      },
    ]);
    await new WorkerRuntime(api as unknown as WorkerApi, registry, 1).run(
      shutdown.signal,
    );
    expect(api.claim).toHaveBeenCalledTimes(1);
    expect(api.operation).toHaveBeenCalledWith("complete", "job", {
      result: { acknowledged: true },
    });
  });

  it("fails an unknown persisted job without executing arbitrary code", async () => {
    const shutdown = new AbortController();
    const api = {
      claim: vi.fn().mockResolvedValueOnce({
        attempt_count: 1,
        id: "job",
        input_metadata: { executable: "cmd.exe" },
        job_type: "core.unknown",
        organization_id: "org",
        status: "RUNNING",
      }),
      heartbeat: vi.fn().mockResolvedValue({}),
      operation: vi.fn().mockImplementation(() => {
        shutdown.abort("done");
        return Promise.resolve({});
      }),
    };
    await new WorkerRuntime(
      api as unknown as WorkerApi,
      new WorkerHandlerRegistry(),
      1,
    ).run(shutdown.signal);
    expect(api.operation).toHaveBeenCalledWith("fail", "job", {
      category: "permanent_failure",
      retryable: false,
    });
  });
});
