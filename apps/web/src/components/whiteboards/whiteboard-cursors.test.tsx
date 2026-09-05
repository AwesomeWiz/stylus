import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WhiteboardCursors } from "./whiteboard-cursors";

describe("WhiteboardCursors", () => {
  it("renders remote trusted identities in transformed canvas coordinates", () => {
    render(
      <WhiteboardCursors
        currentUserId="local"
        presence={[
          {
            cursor: { x: 20, y: 30 },
            displayName: "Taylor",
            role: "MEMBER",
            userId: "remote",
          },
          {
            cursor: { x: 1, y: 1 },
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
    expect(screen.getByText("Taylor")).toBeInTheDocument();
    expect(screen.queryByText("Local")).not.toBeInTheDocument();
  });
});
