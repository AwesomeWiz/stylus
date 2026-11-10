import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  rpc: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/modules/plugins/server/guard", () => ({
  requireEnabledPlugin: mocks.guard,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc: mocks.rpc }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { mutateGrowth } from "./growth-mutations";
const org = crypto.randomUUID(),
  actor = crypto.randomUUID(),
  id = crypto.randomUUID();
beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue({
    context: {
      organization: { id: org },
      user: { id: actor },
      membership: { role: "MEMBER" },
    },
  });
  mocks.rpc.mockResolvedValue({ data: id, error: null });
});
describe("growth mutation authority", () => {
  const belief = () => ({
    operation: "hypothesis",
    id,
    revision: null,
    fields: {
      title: "Clear setup",
      statement: "We believe a clear first step helps",
    },
  });
  it("derives organization and enforces the enabled plugin boundary", async () => {
    await mutateGrowth(belief());
    expect(mocks.guard).toHaveBeenCalledWith("marketing");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "save_marketing_hypothesis",
      expect.objectContaining({
        p_organization_id: org,
        p_id: id,
        p_source: null,
      }),
    );
    expect(mocks.rpc.mock.calls[0]![1]).not.toHaveProperty("p_actor_id");
  });
  it("rejects forged organization or actor input before persistence", async () => {
    await expect(
      mutateGrowth({ ...belief(), organizationId: crypto.randomUUID() }),
    ).rejects.toBeDefined();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("denies VIEWER mutations before any write", async () => {
    mocks.guard.mockResolvedValue({
      context: {
        organization: { id: org },
        user: { id: actor },
        membership: { role: "VIEWER" },
      },
    });
    await expect(mutateGrowth(belief())).rejects.toThrow("permission");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("propagates revoked/plugin-disabled access without trying a write", async () => {
    mocks.guard.mockRejectedValue({ code: "42501" });
    await expect(mutateGrowth(belief())).rejects.toMatchObject({
      code: "42501",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("uses only the explicit atomic promotion boundary", async () => {
    await mutateGrowth({
      operation: "promote",
      learningId: id,
      kind: "INSIGHT",
      title: "Reviewed learning",
      content: "Reviewed durable conclusion",
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("promote_marketing_learning", {
      p_organization_id: org,
      p_learning_id: id,
      p_kind: "INSIGHT",
      p_title: "Reviewed learning",
      p_content: "Reviewed durable conclusion",
    });
  });
  it("does not invalidate or report success after a stale/failed mutation", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PT409" } });
    await expect(mutateGrowth(belief())).rejects.toMatchObject({
      code: "PT409",
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
