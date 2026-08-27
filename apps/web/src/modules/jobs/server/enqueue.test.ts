import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consoleError: vi.spyOn(console, "error").mockImplementation(() => undefined),
  getContext: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
        })),
      })),
    })),
    rpc: mocks.rpc,
  })),
}));

import { enqueueRegisteredJob } from "./enqueue";

const context = {
  membership: { role: "MEMBER" },
  organization: { id: "10000000-0000-4000-8000-000000000001" },
  user: { id: "00000000-0000-4000-8000-000000000001" },
};

describe("enqueueRegisteredJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContext.mockResolvedValue(context);
    mocks.rpc.mockResolvedValue({ data: { id: "job-id" }, error: null });
    mocks.maybeSingle.mockResolvedValue({
      data: { enabled: true },
      error: null,
    });
  });

  it("derives organization, origin, execution class, and policy from the registry", async () => {
    await expect(
      enqueueRegisteredJob({
        idempotencyKey: "stable-key",
        input: { message: "hello" },
        jobType: "core.test.echo",
      }),
    ).resolves.toMatchObject({ id: "job-id" });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "enqueue_job",
      expect.objectContaining({
        p_capability: "core.jobs.test",
        p_execution_class: "DATABASE",
        p_job_type: "core.test.echo",
        p_organization_id: context.organization.id,
        p_plugin_id: null,
      }),
    );
  });

  it("rejects VIEWER before persistence", async () => {
    mocks.getContext.mockResolvedValue({
      ...context,
      membership: { role: "VIEWER" },
    });
    await expect(
      enqueueRegisteredJob({
        input: { message: "hello" },
        jobType: "core.test.echo",
      }),
    ).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects arbitrary browser-defined job types", async () => {
    await expect(
      enqueueRegisteredJob({ input: {}, jobType: "core.forged.execute" }),
    ).rejects.toThrow("Registered job type required");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("validates input before queue persistence", async () => {
    await expect(
      enqueueRegisteredJob({
        input: { message: 7 },
        jobType: "core.test.echo",
      }),
    ).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires current plugin enablement for plugin work", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { enabled: false },
      error: null,
    });
    await expect(
      enqueueRegisteredJob({
        input: { name: "Stylus" },
        jobType: "example.test.greeting",
      }),
    ).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("uses registered plugin provenance and capability when enabled", async () => {
    await enqueueRegisteredJob({
      input: { name: "Stylus" },
      jobType: "example.test.greeting",
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "enqueue_job",
      expect.objectContaining({
        p_capability: "example.hello",
        p_execution_class: "SERVERLESS",
        p_plugin_id: "example",
      }),
    );
  });

  it("never accepts browser organization, actor, provider, or model fields", () => {
    const source = enqueueRegisteredJob.toString();
    expect(source).not.toMatch(
      /input\.organizationId|input\.actorId|providerUrl|modelId/,
    );
  });

  it("logs only safe persistence diagnostics while keeping database details internal", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "42804",
        details: "private row detail",
        message: "column status is of type job_status but expression is text",
      },
    });
    await expect(
      enqueueRegisteredJob({
        input: { message: "hello" },
        jobType: "core.test.echo",
      }),
    ).rejects.toThrow("Job could not be enqueued");
    expect(mocks.consoleError).toHaveBeenCalledWith("Job persistence failed", {
      category: "database_contract",
      code: "42804",
      stage: "enqueue_rpc",
    });
    expect(JSON.stringify(mocks.consoleError.mock.calls)).not.toContain(
      "private row detail",
    );
  });
});
