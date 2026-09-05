import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  allocateBoardCollaboratorColors,
  boardCollaboratorColor,
} from "@/modules/whiteboards/collaboration";

import { WhiteboardCursors } from "./whiteboard-cursors";

describe("WhiteboardCursors", () => {
  it("renders remote trusted identities in transformed canvas coordinates", () => {
    const colorAssignments = allocateBoardCollaboratorColors([
      "local",
      "remote",
    ]);
    render(
      <WhiteboardCursors
        colorAssignments={colorAssignments}
        currentUserId="local"
        cursors={[
          { cursor: { x: 20, y: 30 }, userId: "remote" },
          { cursor: { x: 1, y: 1 }, userId: "local" },
          { cursor: { x: 4, y: 4 }, userId: "not-present" },
        ]}
        presence={[
          {
            displayName: "Taylor",
            role: "MEMBER",
            userId: "remote",
          },
          {
            displayName: "Local",
            role: "OWNER",
            userId: "local",
          },
        ]}
        viewport={{ x: 5, y: 8, zoom: 2 }}
      />,
    );
    const cursor = screen.getByTestId("collaborator-cursor-remote");
    expect(cursor).toHaveStyle({ transform: "translate(45px, 68px)" });
    expect(cursor.querySelector("svg")).toHaveStyle({
      color: boardCollaboratorColor("remote", colorAssignments).cursor,
    });
    expect(screen.getByText("Taylor")).toHaveAttribute(
      "data-color-family",
      colorAssignments.remote,
    );
    expect(screen.queryByText("Local")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("collaborator-cursor-not-present"),
    ).not.toBeInTheDocument();
  });
});
