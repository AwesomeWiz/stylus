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
});
