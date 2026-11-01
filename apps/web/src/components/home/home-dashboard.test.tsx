import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomeDashboard } from "./home-dashboard";

const task = {
  assignee_id: "user-1",
  completed_at: null,
  created_at: "2026-09-01T00:00:00.000Z",
  created_by: "user-1",
  description: null,
  due_at: "2026-09-05T11:00:00.000Z",
  id: "task-1",
  organization_id: "org-1",
  priority: "HIGH" as const,
  scheduled_at: null,
  status: "TODO" as const,
  title: "Approve launch story",
  updated_at: "2026-09-01T00:00:00.000Z",
  updated_by: "user-1",
};

const props = {
  activity: [],
  canMutate: true,
  currentUserId: "user-1",
  marketing: null,
  members: [
    { display_name: "Ari", member_user_id: "user-1", role: "OWNER" as const },
  ],
  nowIso: "2026-09-05T10:00:00.000Z",
  organizationName: "Northstar",
  tasks: [task],
};

describe("HomeDashboard", () => {
  afterEach(cleanup);

  it("surfaces real priorities and useful task actions", () => {
    render(<HomeDashboard {...props} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Home" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Approve launch story")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create task/ })).toHaveAttribute(
      "href",
      "/tasks?create=true",
    );
    expect(screen.queryByText(/future phase/i)).not.toBeInTheDocument();
  });

  it("does not present a mutation shortcut to viewers", () => {
    render(<HomeDashboard {...props} canMutate={false} />);
    expect(
      screen.queryByRole("link", { name: /Create task/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Review tasks/ }),
    ).toBeInTheDocument();
  });

  it("omits Marketing when disabled or enabled without meaningful records", () => {
    const { rerender } = render(<HomeDashboard {...props} />);
    expect(screen.queryByText("Continue in Marketing")).not.toBeInTheDocument();
    rerender(
      <HomeDashboard
        {...props}
        marketing={{
          activeCampaigns: 0,
          briefCount: 0,
          competitorCount: 2,
          ideaCounts: { IDEA: 0, DRAFT: 0, READY: 0 },
          recentBriefs: [],
          recentResearch: [],
        }}
      />,
    );
    expect(screen.queryByText("Continue in Marketing")).not.toBeInTheDocument();
  });

  it("shows actual meaningful Marketing work and the activity route", () => {
    render(
      <HomeDashboard
        {...props}
        marketing={{
          activeCampaigns: 1,
          briefCount: 0,
          competitorCount: 0,
          ideaCounts: { IDEA: 0, DRAFT: 0, READY: 2 },
          recentBriefs: [],
          recentResearch: [],
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: /Ideas ready to develop/ }),
    ).toHaveAttribute("href", "/apps/marketing/reel-ideas");
    expect(
      screen.getByRole("link", { name: "View all activity" }),
    ).toHaveAttribute("href", "/activity");
  });

  it("shows a proportionate empty state with no feature launcher grid", () => {
    render(<HomeDashboard {...props} tasks={[]} />);
    expect(
      screen.getByText(/No active work needs attention/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Quick actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Team pulse")).not.toBeInTheDocument();
  });

  it("opens canonical task selection with hydration-safe viewer-local time", () => {
    render(<HomeDashboard {...props} />);
    expect(
      screen.getByRole("link", { name: /Approve launch story/ }),
    ).toHaveAttribute("href", "/tasks?view=all&task=task-1");
    expect(document.querySelector("time")?.getAttribute("datetime")).toBe(
      task.due_at,
    );
    expect(screen.getByText("Due soon")).toBeInTheDocument();
  });
});
