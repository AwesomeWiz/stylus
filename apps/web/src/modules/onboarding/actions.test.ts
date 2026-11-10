import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  client: vi.fn(),
  context: vi.fn(),
  rpc: vi.fn(),
  redirect: vi.fn<(p: string) => never>(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: m.client,
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: m.context,
}));
vi.mock("next/navigation", () => ({
  redirect: m.redirect,
  unstable_rethrow: () => {},
}));
import {
  saveOnboardingStepAction,
  saveOnboardingDraftAction,
  resolveOnboardingDraftAction,
  completeOnboardingAction,
} from "./actions";
import { OnboardingMutationDeniedError } from "./authorization";
import { initialOnboardingActionState as initial } from "./schemas";
const org = "10000000-0000-4000-8000-000000000001",
  stamp = "2026-11-10T12:00:00.123456Z";
function form() {
  const f = new FormData();
  Object.entries({
    step: "company",
    mode: "onboarding",
    organizationId: org,
    companyName: "Northstar",
    industry: "Software",
    shortDescription: "A useful workspace for small teams.",
    stage: "PRE_PRODUCT",
    baseRevision: stamp,
    draftRevision: stamp,
  }).forEach(([k, v]) => f.set(k, v));
  return f;
}
beforeEach(() => {
  vi.clearAllMocks();
  m.client.mockResolvedValue({ rpc: m.rpc });
  m.context.mockResolvedValue({
    organization: { id: org },
    membership: { role: "OWNER" },
    user: { id: "actor" },
  });
  m.rpc.mockResolvedValue({ data: 2, error: null });
  m.redirect.mockImplementation((p) => {
    throw Error("redirect:" + p);
  });
});
describe("atomic canonical onboarding actions", () => {
  it("commits canonical fields and absolute progress in one freshly authorized transaction", async () => {
    await expect(saveOnboardingStepAction(initial, form())).rejects.toThrow(
      "redirect:/onboarding/problem",
    );
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith(
      "commit_onboarding_step",
      expect.objectContaining({
        p_organization_id: org,
        p_step: "company",
        p_fields: expect.objectContaining({
          companyName: "Northstar",
          website: "",
        }),
        p_base_revision: stamp,
        p_draft_revision: stamp,
      }),
    );
  });
  it("links inline validation to fields without writing or advancing", async () => {
    const f = form();
    f.set("companyName", "A");
    expect(await saveOnboardingStepAction(initial, f)).toMatchObject({
      status: "error",
      fieldErrors: { companyName: expect.any(Array) },
    });
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.redirect).not.toHaveBeenCalled();
  });
  it("retains the step on persistence/progress failure and exposes no database detail", async () => {
    m.rpc.mockResolvedValue({
      data: null,
      error: { code: "UNKNOWN", message: "private table credentials" },
    });
    const result = await saveOnboardingStepAction(initial, form());
    expect(result.status).toBe("error");
    expect(result.message).not.toContain("credentials");
    expect(m.redirect).not.toHaveBeenCalled();
  });
  it("prevents stale drafts from continuing", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "PT409" } });
    expect(await saveOnboardingStepAction(initial, form())).toMatchObject({
      message: expect.stringContaining("changed"),
    });
    expect(m.redirect).not.toHaveBeenCalled();
  });
  it("returns Review after explicit review editing", async () => {
    const f = form();
    f.set("returnTo", "review");
    await expect(saveOnboardingStepAction(initial, f)).rejects.toThrow(
      "redirect:/onboarding/review?edit=1",
    );
  });
  it("retains Company Profile edit return behavior", async () => {
    const f = form();
    f.set("mode", "edit");
    await expect(saveOnboardingStepAction(initial, f)).rejects.toThrow(
      "redirect:/company/profile",
    );
  });
  it("never starts an unknown step", async () => {
    const f = form();
    f.set("step", "future");
    expect(await saveOnboardingStepAction(initial, f)).toMatchObject({
      status: "error",
    });
    expect(m.context).not.toHaveBeenCalled();
  });
  it("does not let MEMBER or VIEWER modify Company context", async () => {
    for (const role of ["MEMBER", "VIEWER"]) {
      m.context.mockResolvedValue({
        organization: { id: org },
        membership: { role },
      });
      await expect(
        saveOnboardingStepAction(initial, form()),
      ).rejects.toBeInstanceOf(OnboardingMutationDeniedError);
    }
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("denies a stale org/account form before any write", async () => {
    const f = form();
    f.set("organizationId", crypto.randomUUID());
    await expect(saveOnboardingStepAction(initial, f)).rejects.toMatchObject({
      code: "42501",
    });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("finishes through the database validation contract and redirects only on success", async () => {
    await expect(completeOnboardingAction(initial)).rejects.toThrow(
      "redirect:/",
    );
    expect(m.rpc).toHaveBeenCalledWith("finish_company_onboarding", {
      p_organization_id: org,
    });
    m.rpc.mockResolvedValue({ error: { code: "22023" } });
    expect(await completeOnboardingAction(initial)).toMatchObject({
      status: "error",
      message: expect.stringContaining("drafts"),
    });
  });
});
describe("bounded manager-only draft actions", () => {
  const request = {
    organizationId: org,
    step: "company",
    fields: { companyName: ["N"] },
    baseRevision: null,
    revision: null,
  };
  it("saves incomplete input without canonical writes or progress advancement", async () => {
    m.rpc.mockResolvedValue({ data: stamp, error: null });
    expect(await saveOnboardingDraftAction(request)).toEqual({
      status: "success",
      revision: stamp,
    });
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith(
      "save_onboarding_draft",
      expect.objectContaining({
        p_fields: { companyName: ["N"] },
        p_expected_updated_at: null,
      }),
    );
  });
  it("rejects oversized drafts and unknown authority before writing", async () => {
    expect(
      await saveOnboardingDraftAction({
        ...request,
        fields: { companyName: ["x".repeat(196609)] },
      }),
    ).toMatchObject({ status: "error" });
    expect(
      await saveOnboardingDraftAction({
        ...request,
        actorId: crypto.randomUUID(),
      }),
    ).toMatchObject({ status: "error" });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("resolves only the explicitly selected saved revision", async () => {
    await resolveOnboardingDraftAction({
      organizationId: org,
      step: "company",
      revision: stamp,
      keep: false,
    });
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith("resolve_onboarding_draft", {
      p_organization_id: org,
      p_step: "company",
      p_expected_updated_at: stamp,
      p_keep: false,
    });
  });
});
