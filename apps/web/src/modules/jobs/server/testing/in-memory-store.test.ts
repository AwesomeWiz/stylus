import { describe, expect, it } from "vitest";

import type { ClaimedJob } from "../executor";
import { InMemoryJobExecutionStore } from "./in-memory-store";

const job: ClaimedJob = {
  actorId: "actor",
  attempt: 1,
  input: {},
  jobId: "job-1",
  jobType: "core.test.job",
  organizationId: "org",
  origin: { kind: "core" },
};

describe("InMemoryJobExecutionStore", () => {
  it("allows only one executor to claim a job", async () => {
    const store = new InMemoryJobExecutionStore([job]);
    await expect(store.claim("worker/one")).resolves.toEqual(job);
    await expect(store.claim("worker/two")).resolves.toBeNull();
  });

  it("records progress and success deterministically", async () => {
    const store = new InMemoryJobExecutionStore([job]);
    await store.claim("worker/one");
    await store.progress("job-1", "worker/one", 50, "Halfway");
    await store.complete("job-1", "worker/one", { ok: true });
    expect(store.snapshot("job-1")).toMatchObject({
      progress: 100,
      result: { ok: true },
      status: "SUCCEEDED",
    });
  });

  it("surfaces cooperative cancellation to the handler boundary", async () => {
    const store = new InMemoryJobExecutionStore([job]);
    await store.claim("worker/one");
    store.requestCancellation("job-1");
    await expect(
      store.isCancellationRequested("job-1", "worker/one"),
    ).resolves.toBe(true);
  });
});
