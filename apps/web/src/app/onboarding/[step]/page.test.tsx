import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const mocks = vi.hoisted(() => ({ data: vi.fn() }));
vi.mock("@/modules/onboarding/server/data", () => ({
  getCurrentOnboardingData: mocks.data,
}));
vi.mock("@/modules/onboarding/actions", () => ({
  completeOnboardingAction: vi.fn(),
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
beforeEach(() =>
  mocks.data.mockResolvedValue({
    context: {
      membership: { role: "OWNER" },
      organization: { name: "Company" },
    },
    progress: { completed_at: "2026-11-01", current_step: 8 },
  }),
);
describe("direct onboarding edit compatibility", () => {
  it("still opens completed profile editing with edit=1", async () => {
    render(
      await OnboardingPage({
        params: Promise.resolve({ step: "company" }),
        searchParams: Promise.resolve({ edit: "1" }),
      }),
    );
    expect(screen.getByText("Edit company profile")).toBeInTheDocument();
  });
  it("redirects ordinary completed onboarding to Home", async () => {
    await expect(
      OnboardingPage({
        params: Promise.resolve({ step: "company" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("redirect:/");
  });
});
