import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const mocks = vi.hoisted(() => ({ data: vi.fn(), draft: vi.fn() }));
vi.mock("@/modules/onboarding/server/data", () => ({
  getCurrentOnboardingData: mocks.data,
}));
vi.mock("@/modules/onboarding/actions", () => ({
  completeOnboardingAction: vi.fn(),
}));
vi.mock("@/modules/onboarding/server/drafts", () => ({
  getOnboardingDraft: mocks.draft,
  getOutstandingOnboardingDrafts: vi.fn(async () => []),
}));
vi.mock("@/components/onboarding/onboarding-shell", () => ({
  OnboardingShell: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/components/onboarding/step-form", () => ({
  OnboardingStepForm: ({ editing }: { editing: boolean }) => (
    <p>{editing ? "Edit company profile" : "Company setup"}</p>
  ),
}));
vi.mock("@/components/onboarding/review", () => ({
  OnboardingReview: () => <p>Review company</p>,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("redirect:" + path);
  },
  notFound: () => {
    throw new Error("not found");
  },
}));
import OnboardingPage from "./page";
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.draft.mockResolvedValue({
    fields: {},
    updated_at: null,
    base_revision: null,
    conflicted: false,
  });
  mocks.data.mockResolvedValue({
    context: {
      membership: { role: "OWNER" },
      organization: {
        id: "10000000-0000-4000-8000-000000000001",
        name: "Company",
      },
      user: { id: "10000000-0000-4000-8000-000000000002" },
    },
    progress: { completed_at: "2026-11-01", current_step: 8 },
  });
});
describe("direct onboarding edit compatibility", () => {
  it("still opens completed profile editing with edit=1", async () => {
    render(
      await OnboardingPage({
        params: Promise.resolve({ step: "company" }),
        searchParams: Promise.resolve({ edit: "1" }),
      }),
    );
    expect(screen.getByText("Edit company profile")).toBeInTheDocument();
    expect(mocks.draft).toHaveBeenCalledWith("company");
  });
  it("redirects ordinary completed onboarding to Home", async () => {
    await expect(
      OnboardingPage({
        params: Promise.resolve({ step: "company" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("redirect:/");
    expect(mocks.draft).not.toHaveBeenCalled();
  });
});
