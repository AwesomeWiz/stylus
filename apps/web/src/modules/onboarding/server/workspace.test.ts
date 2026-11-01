import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  result: vi.fn(),
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ from: mocks.from }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("redirect:" + path);
  },
}));
import { getWorkspaceContext } from "./workspace";
const context = {
  organization: { id: "org" },
  user: { id: "user" },
  membership: { role: "OWNER" },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue(context);
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.result });
  mocks.result.mockResolvedValue({
    data: { completed_at: "2026-11-01", current_step: 8 },
    error: null,
  });
});
describe("narrow workspace setup gate", () => {
  it("reads only current-step/completion under the server-derived organization", async () => {
    expect(await getWorkspaceContext()).toBe(context);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("onboarding_progress");
    expect(mocks.select).toHaveBeenCalledExactlyOnceWith(
      "completed_at, current_step",
    );
    expect(mocks.eq).toHaveBeenCalledWith("organization_id", "org");
  });
  it("resumes an incomplete manager at the persisted step", async () => {
    mocks.result.mockResolvedValue({
      data: { completed_at: null, current_step: 5 },
      error: null,
    });
    await expect(getWorkspaceContext()).rejects.toThrow(
      "redirect:/onboarding/positioning-brand",
    );
  });
  it.each(["MEMBER", "VIEWER"])(
    "keeps incomplete %s in the existing waiting path",
    async (role) => {
      mocks.context.mockResolvedValue({ ...context, membership: { role } });
      mocks.result.mockResolvedValue({ data: null, error: null });
      await expect(getWorkspaceContext()).rejects.toThrow(
        "redirect:/onboarding/company",
      );
    },
  );
  it("redirects missing organization before any setup read", async () => {
    mocks.context.mockResolvedValue(null);
    await expect(getWorkspaceContext()).rejects.toThrow(
      "redirect:/organization/new",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("fails closed on setup query errors", async () => {
    mocks.result.mockResolvedValue({ data: null, error: {} });
    await expect(getWorkspaceContext()).rejects.toThrow(
      "setup status could not be loaded",
    );
  });
});
