import {
  act,
  cleanup,
  renderHook,
  waitFor,
  render,
  screen,
  fireEvent,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { board, object } from "@/test/board-fixtures";
const mock = vi.hoisted(() => ({ read: vi.fn(), set: vi.fn() }));
vi.mock("@/modules/whiteboards/read-actions", () => ({
  readBoardReactionsAction: mock.read,
}));
vi.mock("@/modules/whiteboards/actions", () => ({
  setBoardReactionAction: mock.set,
}));
import { useBoardReactions } from "./use-board-reactions";
import { BoardReactions } from "./board-reactions";
const target = object(),
  ids = [target.id];
beforeEach(() => {
  mock.read.mockReset().mockResolvedValue({ status: "success", rows: [] });
  mock.set.mockReset().mockResolvedValue({ status: "success" });
});
afterEach(cleanup);
describe("bounded social feedback", () => {
  it("optimistically toggles once, rolls back a failed write and remains usable", async () => {
    let finish: (value: unknown) => void = () => {};
    mock.set.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useBoardReactions(board, "user", ids, true),
    );
    await waitFor(() => expect(mock.read).toHaveBeenCalledOnce());
    let saving: Promise<void>;
    act(() => {
      saving = result.current.toggle(target.id, "like");
    });
    expect(result.current.rows[0]!.total).toBe(1);
    await act(async () => {
      await result.current.toggle(target.id, "like");
    });
    expect(mock.set).toHaveBeenCalledOnce();
    await act(async () => {
      finish({ status: "error" });
      await saving!;
    });
    expect(result.current.rows).toEqual([]);
    expect(result.current.error).toMatch(/restored/);
  });
  it("reconciles duplicate realtime events from an authorized read without double counting", async () => {
    const summary = {
      element_id: target.id,
      reaction: "like",
      total: 2,
      mine: true,
      participants: ["user", "other"],
    };
    mock.read.mockResolvedValue({ status: "success", rows: [summary] });
    const { result } = renderHook(() =>
      useBoardReactions(board, "user", ids, true),
    );
    await waitFor(() => expect(result.current.rows[0]?.total).toBe(2));
    const event = {
      organization_id: board.organization_id,
      board_id: board.id,
      element_id: target.id,
      user_id: "other",
      reaction: "like" as const,
      active: true,
      updated_at: "2026-11-03T00:00:00Z",
    };
    act(() => {
      result.current.receive(event);
      result.current.receive(event);
    });
    await waitFor(() => expect(mock.read).toHaveBeenCalledTimes(2));
    expect(result.current.rows[0]!.total).toBe(2);
    act(() => result.current.receive({ ...event, organization_id: "foreign" }));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(mock.read).toHaveBeenCalledTimes(2);
  });
  it("preserves viewer read-only behavior and exposes named aggregate states", async () => {
    const { result } = renderHook(() =>
      useBoardReactions(board, "viewer", ids, false),
    );
    await act(async () => {
      await result.current.toggle(target.id, "fire");
    });
    expect(mock.set).not.toHaveBeenCalled();
    const toggle = vi.fn();
    render(
      <BoardReactions
        elementId={target.id}
        rows={[
          {
            element_id: target.id,
            reaction: "like",
            total: 3,
            mine: true,
            participants: [],
          },
        ]}
        canMutate
        onToggle={toggle}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Like: 3 reactions, you reacted",
    });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledWith(target.id, "like");
  });
});
