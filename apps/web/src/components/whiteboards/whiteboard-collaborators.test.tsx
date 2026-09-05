import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  allocateBoardCollaboratorColors,
  boardCollaboratorColor,
} from "@/modules/whiteboards/collaboration";

import { WhiteboardCollaborators } from "./whiteboard-collaborators";

const people = [
  { displayName: "Alex Smith", role: "OWNER" as const, userId: "local" },
  { displayName: "Kole Barrows", role: "MEMBER" as const, userId: "remote-a" },
  {
    displayName: "Eileen Vandervort",
    role: "VIEWER" as const,
    userId: "remote-b",
  },
  { displayName: "Morgan Lee", role: "ADMIN" as const, userId: "remote-c" },
];
const colorAssignments = allocateBoardCollaboratorColors(
  people.map((person) => person.userId),
);

describe("WhiteboardCollaborators", () => {
  it("shows unique collaborator avatars, initials, local identity, and count", () => {
    render(
      <WhiteboardCollaborators
        colorAssignments={colorAssignments}
        connection="CONNECTED"
        currentUserId="local"
        presence={people.slice(0, 3)}
      />,
    );
    expect(screen.getByLabelText("3 people here")).toBeInTheDocument();
    expect(screen.getByText("AS")).toHaveAttribute("title", "Alex Smith · You");
    expect(screen.getByText("KB")).toBeInTheDocument();
    expect(screen.getByText("EV")).toBeInTheDocument();
    expect(screen.getByTestId("collaborator-avatar-remote-a")).toHaveStyle({
      backgroundColor: boardCollaboratorColor("remote-a", colorAssignments)
        .background,
    });
  });

  it("bounds the avatar stack and reports overflow", () => {
    render(
      <WhiteboardCollaborators
        colorAssignments={colorAssignments}
        connection="CONNECTED"
        currentUserId="local"
        presence={people}
      />,
    );
    expect(screen.getByLabelText("4 people here")).toBeInTheDocument();
    expect(screen.getByLabelText("1 more collaborators")).toHaveTextContent(
      "+1",
    );
    expect(
      screen.queryByTestId("collaborator-avatar-remote-c"),
    ).not.toBeInTheDocument();
  });
});
