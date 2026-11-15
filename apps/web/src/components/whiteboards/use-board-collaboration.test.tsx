import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { board } from "@/test/board-fixtures";
import type { TaskMember } from "@/lib/supabase/database.types";
import { useBoardCollaboration } from "./use-board-collaboration";

const mock = vi.hoisted(() => ({ subscribe: vi.fn() }));
vi.mock("@/modules/whiteboards/realtime", () => ({
  subscribeToBoardCollaboration: mock.subscribe,
}));
const callbacks = { element: vi.fn(), comment: vi.fn() };
const user = { id: board.created_by, displayName: "Fictional member" };
const members: TaskMember[] = [
  { member_user_id: user.id, display_name: user.displayName, role: "MEMBER" },
];
const props = () => ({
  board,
  user: { ...user },
  members: members.map((member) => ({ ...member })),
});
const useFixture = (value: ReturnType<typeof props>) =>
  useBoardCollaboration(
    value.board,
    value.user,
    value.members,
    callbacks.element,
    callbacks.comment,
  );

beforeEach(() => {
  mock.subscribe.mockReset();
  mock.subscribe.mockImplementation(() => ({
    unsubscribe: vi.fn(),
    updateCursor: vi.fn(),
  }));
});

describe("Board collaboration refresh identity", () => {
  it("retains the channel across equivalent server refresh props after a save", () => {
    const { rerender, unmount } = renderHook(useFixture, {
      initialProps: props(),
    });
    const channel = mock.subscribe.mock.results[0]!.value;
    rerender({
      ...props(),
      board: { ...board, updated_at: "2026-11-15T00:00:00Z" },
    });
    expect(mock.subscribe).toHaveBeenCalledTimes(1);
    expect(channel.unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(channel.unsubscribe).toHaveBeenCalledOnce();
  });

  it("replaces the channel when authorized directory content changes", () => {
    const { rerender, unmount } = renderHook(useFixture, {
      initialProps: props(),
    });
    const original = mock.subscribe.mock.results[0]!.value;
    const changed = {
      ...props(),
      members: members.map((member) => ({
        ...member,
        role: "VIEWER" as const,
      })),
    };
    rerender(changed);
    expect(original.unsubscribe).toHaveBeenCalledOnce();
    expect(mock.subscribe).toHaveBeenCalledTimes(2);
    expect(mock.subscribe.mock.calls[1]![0].members[0].role).toBe("VIEWER");
    unmount();
  });

  it("unsubscribes before switching board/account and uses the fresh scoped identity", () => {
    const { rerender, result, unmount } = renderHook(useFixture, {
      initialProps: props(),
    });
    const original = mock.subscribe.mock.results[0]!.value;
    const next = {
      ...props(),
      board: {
        ...board,
        id: "20000000-0000-4000-8000-000000000002",
        organization_id: "10000000-0000-4000-8000-000000000002",
      },
      user: {
        id: "50000000-0000-4000-8000-000000000002",
        displayName: "Another fixture member",
      },
      members: [],
    };
    rerender(next);
    expect(original.unsubscribe).toHaveBeenCalledOnce();
    expect(mock.subscribe.mock.calls[1]![0]).toMatchObject({
      boardId: next.board.id,
      organizationId: next.board.organization_id,
      currentUser: next.user,
      members: [],
    });
    act(() => result.current.updateCursor({ x: 10, y: 20 }));
    expect(
      mock.subscribe.mock.results[1]!.value.updateCursor,
    ).toHaveBeenCalledWith({ x: 10, y: 20 });
    unmount();
    expect(
      mock.subscribe.mock.results[1]!.value.unsubscribe,
    ).toHaveBeenCalledOnce();
  });
});
