import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executor: vi.fn(),
  runOne: vi.fn(),
  store: vi.fn(),
}));

vi.mock("./registry", () => ({ applicationJobRegistry: { kind: "registry" } }));
vi.mock("./supabase-execution-store", () => ({
  SupabaseServerlessJobExecutionStore: class {
    constructor(jobId?: string) {
      mocks.store(jobId);
    }
  },
}));
vi.mock("./executor", () => ({
  JobExecutor: class {
    constructor(...args: unknown[]) {
      mocks.executor(...args);
    }
    runOne = mocks.runOne;
  },
}));

import {
  isHostedServerlessExecutionEnabled,
  runOneHostedServerlessJob,
} from "./hosted-serverless-execution";

describe("hosted SERVERLESS execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("targets an immediate job through the shared registry executor", async () => {
    mocks.runOne.mockResolvedValue("job-1");
    await expect(runOneHostedServerlessJob("immediate", "job-1")).resolves.toBe(
      "job-1",
    );
    expect(mocks.store).toHaveBeenCalledExactlyOnceWith("job-1");
    expect(mocks.executor.mock.calls[0]?.[0]).toMatch(/^vercel-immediate:/);
    expect(mocks.executor.mock.calls[0]?.[1]).toEqual({ kind: "registry" });
  });

  it("uses the same executor with an untargeted store for Cron recovery", async () => {
    await runOneHostedServerlessJob("cron");
    expect(mocks.store).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(mocks.executor.mock.calls[0]?.[0]).toMatch(/^vercel-cron:/);
  });

  it("enables immediate execution only in the Vercel hosted runtime", () => {
    vi.stubEnv("VERCEL", "1");
    expect(isHostedServerlessExecutionEnabled()).toBe(true);
    vi.stubEnv("VERCEL", "0");
    expect(isHostedServerlessExecutionEnabled()).toBe(false);
  });
});
