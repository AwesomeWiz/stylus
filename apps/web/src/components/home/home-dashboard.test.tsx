import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AttentionItem } from "@/core/attention/public";
import { HomeDashboard } from "./home-dashboard";
const item: AttentionItem = {
  id: "task-1",
  kind: "task",
  title: "Approve launch story",
  href: "/tasks?view=all&task=task-1",
  scope: "personal",
  reason: "Overdue · Blocked",
  timestamp: "2026-11-09T10:00:00Z",
  ownerId: "00000000-0000-4000-8000-000000000001",
  rank: 0,
};
const props = {
  activity: [],
  canMutate: true,
  members: [
    {
      display_name: "Ari",
      member_user_id: item.ownerId!,
      role: "OWNER" as const,
    },
  ],
  displayName: "Ari",
  organizationName: "Northstar",
  attention: [item],
};
describe("HomeDashboard", () => {
  afterEach(cleanup);
  it("leads with canonical assigned attention, textual reasons, owner and local time", () => {
    render(<HomeDashboard {...props} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Home" }),
    ).toBeInTheDocument();
    const personal = within(screen.getByRole("region", { name: "For me" }));
    expect(
      personal.getByRole("link", { name: /Approve launch story/ }),
    ).toHaveAttribute("href", item.href);
    expect(personal.getByText("Overdue · Blocked")).toBeInTheDocument();
    expect(personal.getByText("Ari")).toBeInTheDocument();
    expect(document.querySelector("time")).toHaveAttribute(
      "datetime",
      item.timestamp,
    );
    expect(screen.getByRole("link", { name: /Create task/ })).toHaveAttribute(
      "href",
      "/tasks?create=true",
    );
  });
  it("keeps VIEWER actions read-only", () => {
    render(<HomeDashboard {...props} canMutate={false} />);
    expect(
      screen.queryByRole("link", { name: /Create task/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review tasks" })).toHaveAttribute(
      "href",
      "/tasks",
    );
  });
  it("shows recorded evaluation and Learning without counts or a feature launcher", () => {
    render(
      <HomeDashboard
        {...props}
        attention={[
          item,
          {
            ...item,
            id: "exp",
            kind: "experiment",
            title: "Evaluate trial",
            scope: "team",
            reason: "Ready to evaluate",
            href: "/apps/marketing/experiments?item=exp",
          },
          {
            ...item,
            id: "learning",
            kind: "learning",
            title: "A useful finding",
            scope: "team",
            reason: "Recorded learning",
            href: "/apps/marketing/learn?item=learning",
          },
        ]}
      />,
    );
    expect(
      within(screen.getByRole("region", { name: "For the team" })).getByText(
        "Evaluate trial",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recent learning" }),
    ).toBeInTheDocument();
    expect(screen.getByText("A useful finding")).toBeInTheDocument();
    expect(screen.queryByText("Quick actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Team pulse")).not.toBeInTheDocument();
  });
  it("omits unused Marketing surfaces and shows a proportionate empty state", () => {
    render(<HomeDashboard {...props} attention={[]} />);
    expect(
      screen.getByText("Nothing needs your attention right now."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Marketing/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Recent learning" }),
    ).not.toBeInTheDocument();
  });
  it("keeps contextual Core work and full activity discoverable", () => {
    render(<HomeDashboard {...props} />);
    for (const [name, href] of [
      ["Milestones", "/tasks?milestones=1"],
      ["Working Notes", "/notes"],
      ["View all activity", "/activity"],
    ])
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  });
  it("deduplicates task attention across groups and preserves date-only targets", () => {
    render(
      <HomeDashboard
        {...props}
        attention={[
          item,
          item,
          {
            ...item,
            id: "milestone",
            kind: "milestone",
            title: "Pilot delivery",
            timestamp: "2026-11-12",
            scope: "team",
            reason: "Target approaching",
          },
        ]}
      />,
    );
    expect(screen.getAllByText(item.title)).toHaveLength(1);
    expect(screen.getByText("2026-11-12")).toHaveAttribute(
      "datetime",
      "2026-11-12",
    );
  });
});
