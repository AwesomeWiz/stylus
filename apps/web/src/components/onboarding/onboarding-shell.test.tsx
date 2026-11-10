import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { OnboardingShell } from "./onboarding-shell";

describe("onboarding shell", () => {
  it("announces clear progress and renders the focused content", () => {
    render(
      <OnboardingShell currentStep={4} organizationName="Acme">
        <p>Audience form</p>
      </OnboardingShell>,
    );
    expect(screen.getAllByText("Step 4 of 8").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Audience" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Audience form")).toBeInTheDocument();
    expect(screen.getByLabelText("Onboarding progress")).toBeInTheDocument();
  });
});
