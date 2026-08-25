import { describe, expect, it } from "vitest";

import {
  getWorkspaceRouteDecision,
  shouldRedirectCompletedOnboarding,
} from "./routing";

describe("company onboarding routing", () => {
  it("resumes managers at their durable saved step", () => {
    expect(
      getWorkspaceRouteDecision({
        completedAt: null,
        currentStep: 5,
        role: "OWNER",
      }),
    ).toBe("/onboarding/positioning-brand");
  });

  it("keeps refresh and login recovery on the step persisted by one submission", () => {
    expect(
      getWorkspaceRouteDecision({
        completedAt: null,
        currentStep: 2,
        role: "OWNER",
      }),
    ).toBe("/onboarding/problem");
  });

  it("sends non-managers to the waiting state without granting mutation rights", () => {
    expect(
      getWorkspaceRouteDecision({
        completedAt: null,
        currentStep: 4,
        role: "VIEWER",
      }),
    ).toBe("/onboarding/company");
  });

  it("does not reintroduce onboarding after completion", () => {
    expect(
      getWorkspaceRouteDecision({
        completedAt: "2026-08-25T00:00:00Z",
        currentStep: 8,
        role: "OWNER",
      }),
    ).toBeNull();
    expect(
      shouldRedirectCompletedOnboarding({
        completedAt: "2026-08-25T00:00:00Z",
        editing: false,
      }),
    ).toBe(true);
    expect(
      shouldRedirectCompletedOnboarding({
        completedAt: "2026-08-25T00:00:00Z",
        editing: true,
      }),
    ).toBe(false);
  });
});
