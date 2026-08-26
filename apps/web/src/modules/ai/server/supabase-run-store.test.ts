import { beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseAIRunStore } from "./supabase-run-store";

const context = {
  actorId: "00000000-0000-4000-8000-000000000001",
  capability: "core.ai.connection-test",
  memoryDomains: [] as const,
  organizationId: "10000000-0000-4000-8000-000000000001",
  pluginId: null,
  runId: "20000000-0000-4000-8000-000000000001",
};

describe("Supabase AI run store", () => {
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes valid scalar trace metadata to the run-start RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const store = new SupabaseAIRunStore({ rpc } as never);
    await store.start({
      context,
      operation: "generate_text",
      requestedTier: "fast",
      trace: {
        executionMode: "local_only",
        messageCount: 1,
        promptContentStored: false,
      },
    });
    expect(rpc).toHaveBeenCalledWith(
      "start_ai_run",
      expect.objectContaining({
        p_capability: "core.ai.connection-test",
        p_trace_metadata: {
          executionMode: "local_only",
          messageCount: 1,
          promptContentStored: false,
        },
      }),
    );
  });

  it("retains safe stage and database code diagnostics without exposing details", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: {
        code: "22023",
        details: "private row contents",
        message:
          "jsonpath item method .keyvalue() can only be applied to an object",
      },
    });
    const store = new SupabaseAIRunStore({ rpc } as never);
    await expect(
      store.start({
        context,
        operation: "generate_text",
        requestedTier: "fast",
        trace: { messageCount: 1 },
      }),
    ).rejects.toMatchObject({
      category: "unknown",
      diagnostic: "run_start:22023",
    });
    expect(errorLog).toHaveBeenCalledWith("AI run persistence failed", {
      code: "22023",
      stage: "start",
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      "private row contents",
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("keyvalue");
  });
});
