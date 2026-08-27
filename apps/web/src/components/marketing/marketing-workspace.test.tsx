import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
    expect(screen.getAllByText("Add Reel idea")).toHaveLength(2);
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
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Archive competitor"),
    ).not.toBeInTheDocument();
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
