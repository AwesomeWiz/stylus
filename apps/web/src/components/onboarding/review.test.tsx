import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { OnboardingReview } from "./review";
const data = {
  company: null,
  audience: null,
  brand: null,
  marketing: null,
  competitors: [],
};
afterEach(cleanup);
describe("Review and existing Company Profile editing", () => {
  it("returns to Review only from the onboarding Review surface", () => {
    const view = render(<OnboardingReview data={data} />);
    expect(screen.getByRole("link", { name: "Edit Company" })).toHaveAttribute(
      "href",
      "/onboarding/company?edit=1",
    );
    view.rerender(<OnboardingReview data={data} returnToReview />);
    expect(screen.getByRole("link", { name: "Edit Company" })).toHaveAttribute(
      "href",
      "/onboarding/company?edit=1&return=review",
    );
  });
  it("keeps read-only structured review free of edit controls and accepts zero competitors", () => {
    render(<OnboardingReview data={data} canEdit={false} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("No competitors added yet.")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(7);
  });
});
