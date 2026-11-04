import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archiveComment: vi.fn(),
  createComment: vi.fn(),
  resolveComment: vi.fn(),
}));

vi.mock("@/modules/whiteboards/actions", () => ({
  archiveBoardCommentAction: mocks.archiveComment,
  createBoardCommentAction: mocks.createComment,
  setBoardCommentResolutionAction: mocks.resolveComment,
}));

import { WhiteboardCommentsPanel } from "./whiteboard-comments-panel";

const members = [
  { display_name: "Taylor", member_user_id: "user-a", role: "MEMBER" as const },
  { display_name: "Alex", member_user_id: "user-b", role: "VIEWER" as const },
  { display_name: "Alex", member_user_id: "user-c", role: "MEMBER" as const },
];
const comment = {
  resolved_at: null,
  resolved_by: null,
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
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());
  it("resolves without removing discussion and exposes a reversible resolved view", async () => {
    const changed = {
        ...comment,
        resolved_at: "2026-11-03T12:00:00Z",
        resolved_by: "user-a",
      },
      onComment = vi.fn();
    mocks.resolveComment
      .mockResolvedValueOnce({ status: "success", data: changed })
      .mockResolvedValueOnce({ status: "success", data: comment });
    const props = {
      boardId: comment.board_id,
      canMutate: true,
      currentUserId: "user-a",
      members,
      onComment,
      selectedElementId: null,
      controlledOpen: true,
    };
    const view = render(
      <WhiteboardCommentsPanel {...props} comments={[comment]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(onComment).toHaveBeenCalledWith(changed));
    expect(mocks.resolveComment).toHaveBeenCalledWith({
      boardId: comment.board_id,
      commentId: comment.id,
      resolved: true,
    });
    view.rerender(<WhiteboardCommentsPanel {...props} comments={[changed]} />);
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Show resolved threads" }),
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    await waitFor(() => expect(onComment).toHaveBeenLastCalledWith(comment));
    expect(mocks.archiveComment).not.toHaveBeenCalled();
  });

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
