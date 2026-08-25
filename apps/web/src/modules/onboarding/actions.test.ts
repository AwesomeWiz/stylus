import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getContext: vi.fn(),
  redirect: vi.fn<(path: string) => never>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { saveOnboardingStepAction } from "./actions";
import { OnboardingMutationDeniedError } from "./authorization";
import { initialOnboardingActionState } from "./schemas";

describe("onboarding actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path) => {
      throw new Error(`redirect:${path}`);
    });
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
    mocks.getContext.mockResolvedValue({
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
