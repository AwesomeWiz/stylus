import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  getContext: vi.fn(),
  maybeSingle: vi.fn(),
  redirect: vi.fn<(path: string) => never>(),
  rpc: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { saveOnboardingStepAction } from "./actions";
import { OnboardingMutationDeniedError } from "./authorization";
import { initialOnboardingActionState } from "./schemas";

describe("onboarding actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const profileQuery = {
      eq: vi.fn(() => profileQuery),
      maybeSingle: mocks.maybeSingle,
      select: vi.fn(() => profileQuery),
      upsert: mocks.upsert,
    };
    mocks.from.mockReturnValue(profileQuery);
    mocks.createClient.mockResolvedValue({
      from: mocks.from,
      rpc: mocks.rpc,
    });
    mocks.getContext.mockResolvedValue({
      membership: { role: "OWNER" },
      organization: { id: "10000000-0000-4000-8000-000000000001" },
      user: { id: "00000000-0000-4000-8000-000000000001" },
    });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: 2, error: null });
    mocks.redirect.mockImplementation((path) => {
      throw new Error(`redirect:${path}`);
    });
  });

  function validCompanyForm() {
    const formData = new FormData();
    formData.set("step", "company");
    formData.set("mode", "onboarding");
    formData.set("companyName", "Acme");
    formData.set("industry", "Software");
    formData.set(
      "shortDescription",
      "A useful startup description for small teams.",
    );
    formData.set("stage", "PRE_PRODUCT");
    return formData;
  }

  it("persists and advances to the correct next route on the first submission", async () => {
    await expect(
      saveOnboardingStepAction(
        initialOnboardingActionState,
        validCompanyForm(),
      ),
    ).rejects.toThrow("redirect:/onboarding/problem");

    expect(mocks.upsert).toHaveBeenCalledOnce();
    expect(mocks.createClient).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("advance_onboarding_progress", {
      p_completed_step: 1,
      p_organization_id: "10000000-0000-4000-8000-000000000001",
    });
    expect(mocks.redirect).toHaveBeenCalledOnce();
  });

  it("does not persist or advance when validation fails", async () => {
    const formData = validCompanyForm();
    formData.set("companyName", "A");

    await expect(
      saveOnboardingStepAction(initialOnboardingActionState, formData),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("does not advance or redirect when step persistence fails", async () => {
    mocks.upsert.mockResolvedValue({ error: new Error("write failed") });

    await expect(
      saveOnboardingStepAction(
        initialOnboardingActionState,
        validCompanyForm(),
      ),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("remains on the current step when durable progress cannot advance", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: new Error("progress write failed"),
    });

    await expect(
      saveOnboardingStepAction(
        initialOnboardingActionState,
        validCompanyForm(),
      ),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.upsert).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("uses the same absolute completed step for duplicate requests", async () => {
    for (let submission = 0; submission < 2; submission += 1) {
      await expect(
        saveOnboardingStepAction(
          initialOnboardingActionState,
          validCompanyForm(),
        ),
      ).rejects.toThrow("redirect:/onboarding/problem");
    }

    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(
      mocks.rpc.mock.calls.map((call) => call[1].p_completed_step),
    ).toEqual([1, 1]);
  });

  it("rejects unknown steps without querying identity or data", async () => {
    const formData = new FormData();
    formData.set("step", "future-task");
    await expect(
      saveOnboardingStepAction(initialOnboardingActionState, formData),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.getContext).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("does not let a member perform an administrative update", async () => {
    mocks.getContext.mockResolvedValueOnce({
      membership: { role: "MEMBER" },
      organization: { id: "10000000-0000-4000-8000-000000000001" },
      user: { id: "00000000-0000-4000-8000-000000000001" },
    });
    const formData = new FormData();
    formData.set("step", "company");

    await expect(
      saveOnboardingStepAction(initialOnboardingActionState, formData),
    ).rejects.toBeInstanceOf(OnboardingMutationDeniedError);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
