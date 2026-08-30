import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  context: vi.fn(),
  hosted: vi.fn(),
  revalidate: vi.fn(),
  rpc: vi.fn(),
  runOne: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/modules/jobs/server/hosted-serverless-execution", () => ({
  isHostedServerlessExecutionEnabled: mocks.hosted,
  runOneHostedServerlessJob: mocks.runOne,
}));

import { initialExternalResearchActionState } from "./external-research";
import { enqueueExternalResearchAction } from "./external-research-actions";

describe("external research Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hosted.mockReturnValue(false);
    mocks.context.mockResolvedValue({
      membership: { role: "MEMBER" },
      organization: { id: "00000000-0000-4000-8000-000000000001" },
      user: { id: "00000000-0000-4000-8000-000000000002" },
    });
    mocks.rpc.mockResolvedValue({
      data: {
        duplicate: false,
        jobId: "00000000-0000-4000-8000-000000000005",
        runId: "00000000-0000-4000-8000-000000000003",
      },
      error: null,
    });
  });

  it.each(["OWNER", "ADMIN", "MEMBER"] as const)(
    "enqueues for %s with server-derived organization and actor",
    async (role) => {
      mocks.context.mockResolvedValue({
        membership: { role },
        organization: { id: "00000000-0000-4000-8000-000000000001" },
        user: { id: "00000000-0000-4000-8000-000000000002" },
      });
      const result = await enqueueExternalResearchAction(
        initialExternalResearchActionState,
        form(),
      );
      expect(result.status).toBe("success");
      expect(mocks.rpc).toHaveBeenCalledWith(
        "enqueue_marketing_external_research",
        expect.objectContaining({
          p_actor_id: "00000000-0000-4000-8000-000000000002",
          p_organization_id: "00000000-0000-4000-8000-000000000001",
        }),
      );
      expect(JSON.stringify(mocks.rpc.mock.calls[0])).not.toMatch(/forged/);
    },
  );

  it("denies VIEWER before service-role enqueue", async () => {
    mocks.context.mockResolvedValue({
      membership: { role: "VIEWER" },
      organization: { id: "00000000-0000-4000-8000-000000000001" },
      user: { id: "00000000-0000-4000-8000-000000000002" },
    });
    await expect(
      enqueueExternalResearchAction(initialExternalResearchActionState, form()),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects invalid sources before resolving trusted context", async () => {
    const value = form();
    value.set("rssFeedUrl", "http://127.0.0.1/private");
    value.set("hackerNewsStream", "");
    await expect(
      enqueueExternalResearchAction(initialExternalResearchActionState, value),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.context).not.toHaveBeenCalled();
  });

  it("schedules the trusted queued job for immediate hosted execution", async () => {
    mocks.hosted.mockReturnValue(true);
    const result = await enqueueExternalResearchAction(
      initialExternalResearchActionState,
      form(),
    );

    expect(result).toMatchObject({ status: "success" });
    expect(mocks.after).toHaveBeenCalledOnce();
    expect(mocks.runOne).not.toHaveBeenCalled();

    const callback = mocks.after.mock.calls[0]?.[0] as () => Promise<void>;
    await callback();
    expect(mocks.runOne).toHaveBeenCalledExactlyOnceWith(
      "immediate",
      "00000000-0000-4000-8000-000000000005",
    );
    expect(JSON.stringify(mocks.runOne.mock.calls)).not.toContain("forged-job");
  });

  it("keeps the durable job queued when immediate execution cannot start", async () => {
    mocks.hosted.mockReturnValue(true);
    mocks.runOne.mockRejectedValueOnce(new Error("private executor failure"));
    await expect(
      enqueueExternalResearchAction(initialExternalResearchActionState, form()),
    ).resolves.toMatchObject({ status: "success" });

    const callback = mocks.after.mock.calls[0]?.[0] as () => Promise<void>;
    await expect(callback()).resolves.toBeUndefined();
  });

  it("does not start the hosted adapter outside Vercel", async () => {
    await enqueueExternalResearchAction(
      initialExternalResearchActionState,
      form(),
    );
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.runOne).not.toHaveBeenCalled();
  });
});

function form() {
  const value = new FormData();
  value.set("invocationKey", "00000000-0000-4000-8000-000000000004");
  value.set("objective", "AUDIENCE_PAINS");
  value.set("question", "What pain points recur for startup teams?");
  value.set("hackerNewsStream", "top");
  value.set("queryTerm", "startup");
  value.set("organizationId", "forged-organization");
  value.set("actorId", "forged-actor");
  value.set("jobId", "forged-job");
  return value;
}
