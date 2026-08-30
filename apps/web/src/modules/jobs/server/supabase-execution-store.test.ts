import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: () => ({ rpc: mocks.rpc }),
}));

import { SupabaseServerlessJobExecutionStore } from "./supabase-execution-store";

describe("Supabase SERVERLESS execution store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  it("uses the atomic targeted claim for immediate execution", async () => {
    const store = new SupabaseServerlessJobExecutionStore("job-1");
    await expect(store.claim("vercel-immediate:test")).resolves.toBeNull();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("claim_serverless_job", {
      p_executor_id: "vercel-immediate:test",
      p_job_id: "job-1",
      p_lease_seconds: 120,
    });
  });

  it("uses the ordinary queue claim for Cron recovery", async () => {
    const store = new SupabaseServerlessJobExecutionStore();
    await expect(store.claim("vercel-cron:test")).resolves.toBeNull();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("claim_next_job", {
      p_execution_class: "SERVERLESS",
      p_executor_id: "vercel-cron:test",
      p_lease_seconds: 120,
    });
  });
});
