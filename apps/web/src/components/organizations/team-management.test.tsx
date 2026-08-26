import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/organizations/team-actions", () => ({
  inviteTeamMemberAction: vi.fn(),
  regenerateInvitationAction: vi.fn(),
  removeMemberAction: vi.fn(),
  revokeInvitationAction: vi.fn(),
  updateMemberRoleAction: vi.fn(),
}));

import { TeamManagement } from "./team-management";

afterEach(cleanup);

const members = [
  {
    created_at: "2026-08-25T00:00:00Z",
    display_name: "Founder",
    email: "founder@example.test",
    member_user_id: "00000000-0000-4000-8000-000000000001",
    role: "OWNER" as const,
  },
  {
    created_at: "2026-08-25T00:00:00Z",
    display_name: "Teammate",
    email: "teammate@example.test",
    member_user_id: "00000000-0000-4000-8000-000000000002",
    role: "MEMBER" as const,
  },
];

describe("TeamManagement", () => {
  it("shows invite and member controls to an OWNER but protects OWNER role", () => {
    render(
      <TeamManagement
        currentRole="OWNER"
        currentUserId={members[0]!.member_user_id}
        invitations={[]}
        members={members}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Invite a teammate" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Role for Teammate" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Role for Founder" }),
    ).not.toBeInTheDocument();
  });

  it("keeps VIEWER access read-only", () => {
    render(
      <TeamManagement
        currentRole="VIEWER"
        currentUserId="viewer"
        invitations={[]}
        members={members}
      />,
    );
    expect(
      screen.queryByRole("heading", { name: "Invite a teammate" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Remove/ }),
    ).not.toBeInTheDocument();
  });
});
