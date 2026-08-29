import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runOne: vi.fn(), store: vi.fn() }));
vi.mock("@/lib/env/server", () => ({
  serverEnv: { CRON_SECRET: "cron-secret" },
}));
vi.mock("@/modules/jobs/server/registry", () => ({
  applicationJobRegistry: {},
}));
vi.mock("@/modules/jobs/server/supabase-execution-store", () => ({
  SupabaseServerlessJobExecutionStore: mocks.store,
}));
vi.mock("@/modules/jobs/server/executor", () => ({
  JobExecutor: class {
    runOne = mocks.runOne;
  },
}));

import { GET } from "./route";

describe("hosted SERVERLESS Cron route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects missing or wrong credentials before job access", async () => {
    const response = await GET(
      new Request("https://stylus.test/api/cron/serverless-jobs"),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(mocks.runOne).not.toHaveBeenCalled();
  });

  it("processes at most one claim and returns no tenant or job metadata", async () => {
    mocks.runOne.mockResolvedValue("private-job-id");
    const response = await GET(
      new Request("https://stylus.test/api/cron/serverless-jobs", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: true });
    expect(mocks.runOne).toHaveBeenCalledOnce();
  });

  it("normalizes executor failures without internals", async () => {
    mocks.runOne.mockRejectedValue(new Error("database secret detail"));
    const response = await GET(
      new Request("https://stylus.test/api/cron/serverless-jobs", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "executor_unavailable" });
  });
});
