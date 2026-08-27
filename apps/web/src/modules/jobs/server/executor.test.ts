import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import { createJobRegistry, defineJob } from "@/core/jobs/public";

import {
  calculateJobBackoffSeconds,
  JobCancelledError,
  JobExecutor,
  type JobExecutionStore,
  type JobLifecycleObserver,
} from "./executor";

function setup(
  handler: Parameters<
    typeof defineJob<{ value: string }, { value: string }>
  >[0]["handler"],
  overrides: Record<string, unknown> = {},
  observer?: JobLifecycleObserver,
) {
  const definition = defineJob({
    capability: "core.jobs.test",
    description: "A deterministic executor job used by the test adapter.",
    executionClass: "SERVERLESS",
    handler,
    hostedExecutionSupported: true,
    id: "core.test.executor",
    idempotency: "NONE",
    inputSchema: z.object({ value: z.string() }).strict(),
    maxAttempts: 2,
    origin: { kind: "core" },
    outputSchema: z.object({ value: z.string() }).strict(),
    priority: 50,
    retryableCategories: ["internal_error", "timeout"],
    sideEffect: "NONE",
    timeoutMs: 1_000,
    ...overrides,
  });
  const store: JobExecutionStore = {
    claim: vi.fn(async () => ({
      actorId: "actor",
      attempt: 1,
      input: { value: "hello" },
      jobId: "job-1",
      jobType: definition.id,
      organizationId: "org",
      origin: { kind: "core" as const },
    })),
    complete: vi.fn(),
    fail: vi.fn(),
    heartbeat: vi.fn(),
    isCancellationRequested: vi.fn(async () => false),
    progress: vi.fn(),
  };
  return {
    executor: new JobExecutor(
      "test/worker",
      createJobRegistry([definition]),
      store,
      observer,
    ),
    store,
  };
}

describe("JobExecutor", () => {
  it("executes a registered handler and validates its output", async () => {
    const { executor, store } = setup(async (input, context) => {
      await context.reportProgress(50, "Halfway");
      return input;
    });
    await expect(executor.runOne()).resolves.toBe("job-1");
    expect(store.progress).toHaveBeenCalledWith(
      "job-1",
      "test/worker",
      50,
      "Halfway",
    );
    expect(store.complete).toHaveBeenCalledWith("job-1", "test/worker", {
      value: "hello",
    });
  });

  it("emits a safe terminal lifecycle hook without payload content", async () => {
    const observer = vi.fn();
    const { executor } = setup(async (input) => input, {}, observer);
    await executor.runOne();
    expect(observer).toHaveBeenCalledWith({
      jobId: "job-1",
      jobType: "core.test.executor",
      organizationId: "org",
      status: "SUCCEEDED",
    });
    expect(JSON.stringify(observer.mock.calls)).not.toContain("hello");
  });

  it("isolates an optional lifecycle observer failure from job success", async () => {
    const { executor, store } = setup(
      async (input) => input,
      {},
      () => {
        throw new Error("notification adapter offline");
      },
    );
    await expect(executor.runOne()).resolves.toBe("job-1");
    expect(store.complete).toHaveBeenCalledOnce();
    expect(store.fail).not.toHaveBeenCalled();
  });

  it("does nothing when no job is claimable", async () => {
    const { executor, store } = setup(async (input) => input);
    vi.mocked(store.claim).mockResolvedValueOnce(null);
    await expect(executor.runOne()).resolves.toBeNull();
  });

  it("fails invalid persisted input without running the handler", async () => {
    const handler = vi.fn(async (input: { value: string }) => input);
    const { executor, store } = setup(handler);
    vi.mocked(store.claim).mockResolvedValueOnce({
      actorId: "actor",
      attempt: 1,
      input: { value: 7 },
      jobId: "job-1",
      jobType: "core.test.executor",
      organizationId: "org",
      origin: { kind: "core" },
    });
    await executor.runOne();
    expect(handler).not.toHaveBeenCalled();
    expect(store.fail).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "validation_failed",
        retryable: false,
      }),
    );
  });

  it("normalizes handler failures and obeys retry metadata", async () => {
    const { executor, store } = setup(async () => {
      throw new Error("private failure");
    });
    await executor.runOne();
    expect(store.fail).toHaveBeenCalledWith(
      expect.objectContaining({ category: "internal_error", retryable: true }),
    );
  });

  it("cooperatively cancels before handler invocation", async () => {
    const handler = vi.fn(async (input: { value: string }) => input);
    const { executor, store } = setup(handler);
    vi.mocked(store.isCancellationRequested).mockResolvedValueOnce(true);
    await executor.runOne();
    expect(handler).not.toHaveBeenCalled();
    expect(store.fail).toHaveBeenCalledWith(
      expect.objectContaining({ category: "cancelled", retryable: false }),
    );
  });

  it("supports a handler-raised cooperative cancellation", async () => {
    const { executor, store } = setup(async () => {
      throw new JobCancelledError();
    });
    await executor.runOne();
    expect(store.fail).toHaveBeenCalledWith(
      expect.objectContaining({ category: "cancelled" }),
    );
  });

  it("rejects invalid output as a non-retryable validation failure", async () => {
    const { executor, store } = setup(async () => ({ value: 7 }) as never);
    await executor.runOne();
    expect(store.fail).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "validation_failed",
        retryable: false,
      }),
    );
  });

  it("uses deterministic bounded exponential backoff", () => {
    expect([1, 2, 3, 10].map(calculateJobBackoffSeconds)).toEqual([
      30, 60, 120, 900,
    ]);
  });
});
