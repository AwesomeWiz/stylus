import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/marketing/actions", () => ({
  saveMarketingCampaignAction: vi.fn(),
  saveMarketingCompetitorAction: vi.fn(),
  saveMarketingCreativeBriefAction: vi.fn(),
  saveMarketingReelIdeaAction: vi.fn(),
  saveMarketingResearchAction: vi.fn(),
  setMarketingCampaignArchivedAction: vi.fn(),
  setMarketingCompetitorArchivedAction: vi.fn(),
  setMarketingCreativeBriefArchivedAction: vi.fn(),
  setMarketingReelIdeaArchivedAction: vi.fn(),
  setMarketingResearchArchivedAction: vi.fn(),
}));

import { MarketingWorkspace } from "./marketing-workspace";

afterEach(cleanup);

const competitor = {
  id: "10000000-0000-4000-8000-000000000013",
  name: "Acme",
  notes: "Manual note",
};
describe("Marketing workspace", () => {
  it("shows empty and creation UX to collaborators", () => {
    render(
      <MarketingWorkspace
        area="reel-ideas"
        archived={false}
        records={[]}
        role="MEMBER"
      />,
    );
    expect(screen.getByText("No Reel idea records")).toBeInTheDocument();
    const add = screen.getByRole("button", { name: "Add Reel idea" });
    fireEvent.click(add);
    expect(
      screen.getByRole("dialog", { name: "Add Reel idea" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });
  it("removes all mutation controls for VIEWER", () => {
    render(
      <MarketingWorkspace
        area="competitors"
        archived={false}
        records={[competitor]}
        role="VIEWER"
      />,
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.queryByText("Add competitor")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Edit/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Archive competitor"),
    ).not.toBeInTheDocument();
  });
  it("opens editing in a modal instead of expanding an inline form", () => {
    render(
      <MarketingWorkspace
        area="competitors"
        archived={false}
        records={[competitor]}
        role="ADMIN"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit competitor" }));
    expect(
      screen.getByRole("dialog", { name: "Edit competitor" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Acme");
  });
  it("offers archive and restore without hard-delete controls", () => {
    const { rerender } = render(
      <MarketingWorkspace
        area="competitors"
        archived={false}
        records={[competitor]}
        role="OWNER"
      />,
    );
    expect(screen.getByLabelText("Archive competitor")).toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
    rerender(
      <MarketingWorkspace
        area="competitors"
        archived
        records={[competitor]}
        role="OWNER"
      />,
    );
    expect(screen.getByLabelText("Restore competitor")).toBeInTheDocument();
  });
});
