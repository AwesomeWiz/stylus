import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archiveComment: vi.fn(),
  createComment: vi.fn(),
}));

vi.mock("@/modules/whiteboards/actions", () => ({
  archiveBoardCommentAction: mocks.archiveComment,
  createBoardCommentAction: mocks.createComment,
}));

import { WhiteboardCommentsPanel } from "./whiteboard-comments-panel";

const members = [
  { display_name: "Taylor", member_user_id: "user-a", role: "MEMBER" as const },
  { display_name: "Alex", member_user_id: "user-b", role: "VIEWER" as const },
  { display_name: "Alex", member_user_id: "user-c", role: "MEMBER" as const },
];
const comment = {
  archived_at: null,
  author_id: "user-a",
  board_id: "20000000-0000-4000-8000-000000000001",
  body: "Hello",
  created_at: "2026-08-25T00:00:00Z",
  element_id: null,
  id: "40000000-0000-4000-8000-000000000001",
  organization_id: "10000000-0000-4000-8000-000000000001",
  parent_id: null,
  updated_at: "2026-08-25T00:00:00Z",
};

describe("WhiteboardCommentsPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets viewers read threads without rendering a composer", () => {
    render(
      <WhiteboardCommentsPanel
        boardId={comment.board_id}
        canMutate={false}
        comments={[comment]}
        currentUserId="viewer"
        members={members}
        onComment={vi.fn()}
        selectedElementId={null}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Open board comments" }),
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText(/Viewers can read comments/)).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Comment" }),
    ).not.toBeInTheDocument();
  });

  it("submits the selected duplicate-name member as a structural identity", async () => {
    mocks.createComment.mockResolvedValue({ data: comment, status: "success" });
    render(
      <WhiteboardCommentsPanel
        boardId={comment.board_id}
        canMutate
        comments={[]}
        currentUserId="user-a"
        members={members}
        onComment={vi.fn()}
        selectedElementId={null}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Open board comments" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Comment" }), {
      target: { value: "Review @Al" },
    });
    const alexButtons = screen.getAllByRole("button", { name: /Alex/ });
    fireEvent.click(alexButtons[1]!);
    fireEvent.click(screen.getByRole("button", { name: /Post/ }));
    await waitFor(() =>
      expect(mocks.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          body: "Review @Alex ",
          mentionedUserIds: ["user-c"],
        }),
      ),
    );
  });
});
