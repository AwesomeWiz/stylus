import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
  act,
  renderHook,
} from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({
  read: vi.fn(),
  start: vi.fn(),
  vote: vi.fn(),
  end: vi.fn(),
}));
vi.mock("@/modules/whiteboards/voting-actions", () => ({
  startBoardVotingAction: api.start,
  setBoardVoteAction: api.vote,
  endBoardVotingAction: api.end,
}));
vi.mock("@/modules/whiteboards/voting-client", () => ({
  readBoardVoting: api.read,
}));
import { BoardVoting } from "./board-voting";
import { useBoardVoting } from "./use-board-voting";
import { BoardVotingContext, BoardVoteBadge } from "./board-voting-context";
import { createBoardVotingStore } from "@/modules/whiteboards/voting-store";
import { emptyVoting } from "@/modules/whiteboards/voting";
import { indexBoardObjects } from "@/modules/whiteboards/operations";
import { object, board } from "@/test/board-fixtures";
import type {
  BoardVotingSessionRow,
  BoardVotingSnapshot,
} from "@/lib/supabase/database.types";
const user = crypto.randomUUID(),
  other = crypto.randomUUID(),
  row = object({ element_type: "STICKY", content: { text: "Concept A" } });
const session: BoardVotingSessionRow = {
  id: crypto.randomUUID(),
  organization_id: board.organization_id,
  board_id: board.id,
  status: "ACTIVE",
  allowance: 3,
  eligible_types: ["STICKY"],
  started_by: user,
  ended_by: null,
  created_at: board.created_at,
  updated_at: board.updated_at,
  ended_at: null,
  revision: 1,
};
let server: BoardVotingSnapshot;
beforeEach(() => {
  vi.clearAllMocks();
  server = emptyVoting;
  api.read.mockImplementation(async () => ({
    status: "success",
    data: server,
  }));
  api.start.mockImplementation(async () => {
    server = { ...emptyVoting, session };
    return { status: "success", data: session };
  });
  api.end.mockImplementation(async () => {
    server = {
      ...server,
      session: {
        ...session,
        status: "ENDED",
        ended_at: board.updated_at,
        revision: 3,
      },
    };
    return { status: "success", data: server.session };
  });
});
afterEach(cleanup);
function mount(canMutate = true, ids = [row.id]) {
  const store = createBoardVotingStore(user, canMutate);
  render(
    <BoardVotingContext.Provider value={store}>
      <BoardVoting
        board={board}
        userId={user}
        canMutate={canMutate}
        role={canMutate ? "MEMBER" : "VIEWER"}
        members={[
          { member_user_id: user, display_name: "Person A", role: "MEMBER" },
          { member_user_id: other, display_name: "Person B", role: "MEMBER" },
        ]}
        ids={ids}
        selected={[row.id]}
        index={indexBoardObjects([row])}
        store={store}
        onLocate={vi.fn()}
        ref={null}
      />
      <BoardVoteBadge row={row} />
    </BoardVotingContext.Provider>,
  );
  return store;
}
describe("Board voting UI and transport", () => {
  it("starts only after an explicit bounded dialog submission", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Start voting" }));
    const dialog = screen.getByRole("dialog", { name: "Start voting" });
    await waitFor(() =>
      expect(
        within(dialog).getByRole("combobox", { name: "Votes per person" }),
      ).toBeInTheDocument(),
    );
    expect(api.start).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Start voting" }),
    );
    await waitFor(() =>
      expect(api.start).toHaveBeenCalledWith(
        expect.objectContaining({
          allowance: 3,
          types: expect.arrayContaining([
            "STICKY",
            "TEXT",
            "IMAGE",
            "SHAPE",
            "GROUP",
          ]),
        }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "Voting in progress" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getAllByText(/3 of 3 votes remaining/).length,
    ).toBeGreaterThan(0);
  });
  it("shows current counts, directory identities and exact own allocation", async () => {
    server = {
      ...emptyVoting,
      session,
      results: [
        {
          element_id: row.id,
          total: 4,
          mine: 0,
          rank: 1,
          participants: [other],
        },
      ],
      summaries: [
        { element_id: row.id, total: 4, mine: 0, participants: [other] },
      ],
    };
    mount();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Voting in progress" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Voting in progress" }));
    expect(screen.getByText("Person B")).toBeInTheDocument();
    expect(screen.getByText(/4 votes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Locate" })).toBeEnabled();
  });
  it("rolls back only an unconfirmed allocation while retaining a remote count", async () => {
    server = { ...emptyVoting, session };
    const store = mount();
    await waitFor(() => expect(store.getSnapshot().loading).toBe(false));
    let finish!: (value: unknown) => void;
    api.vote.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add vote to object" }));
    expect(store.getObject(row.id)).toMatchObject({ total: 1, mine: 1 });
    server = {
      ...emptyVoting,
      session: { ...session, revision: 2 },
      summaries: [
        { element_id: row.id, total: 3, mine: 0, participants: [other] },
      ],
    };
    act(() => store.accept(server));
    await act(async () =>
      finish({
        status: "error",
        message: "Vote could not be confirmed. Refresh voting before retrying.",
      }),
    );
    await waitFor(() =>
      expect(store.getObject(row.id)).toMatchObject({ total: 3, mine: 0 }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "could not be confirmed",
    );
    expect(api.vote).toHaveBeenCalledWith(
      expect.objectContaining({ slot: 1, expectedVersion: 0, active: true }),
    );
  });
  it("requires confirmation to end, then freezes allocation and retains results", async () => {
    server = { ...emptyVoting, session };
    mount();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Voting in progress" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Voting in progress" }));
    fireEvent.click(screen.getByRole("button", { name: "End voting" }));
    expect(api.end).not.toHaveBeenCalled();
    expect(
      screen.getByText(/No more votes can be cast afterward/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "End voting" }));
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "Voting results" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Add vote to object" }),
    ).not.toBeInTheDocument();
    expect(api.end).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Start another vote" }));
    expect(
      screen.getByRole("combobox", { name: "Votes per person" }),
    ).toBeInTheDocument();
    expect(api.start).not.toHaveBeenCalled();
  });
  it("keeps VIEWER participation read-only", async () => {
    server = { ...emptyVoting, session };
    mount(false);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Voting in progress" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Add vote to object" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Voting in progress" }));
    expect(
      screen.queryByRole("button", { name: "End voting" }),
    ).not.toBeInTheDocument();
    expect(api.vote).not.toHaveBeenCalled();
  });
});

it("projects objects beyond the first 200 through separately authorized bounded reads", async () => {
  const ids = Array.from({ length: 401 }, () => crypto.randomUUID());
  server = { ...emptyVoting, session };
  api.read.mockImplementation(async (input) => ({
    status: "success",
    data: {
      ...server,
      summaries: input.ids.map((element_id: string) => ({
        element_id,
        total: 2,
        mine: 0,
        participants: [other],
      })),
    },
  }));
  const store = mount(true, ids);
  await waitFor(() => expect(store.getSnapshot().loading).toBe(false));
  expect(api.read.mock.calls.map(([input]) => input.ids.length)).toEqual([
    200, 200, 1,
  ]);
  expect(store.getObject(ids[400]!)).toMatchObject({ total: 2, mine: 0 });
});

it("does not refetch absent voting while panning but still discovers session events", async () => {
  const store = createBoardVotingStore(user, true);
  const { rerender } = renderHook(
    ({ ids }: { ids: string[] }) =>
      useBoardVoting(board, user, ids, true, store),
    { initialProps: { ids: [row.id] } },
  );
  await waitFor(() => expect(store.getSnapshot().loading).toBe(false));
  expect(api.read).toHaveBeenCalledTimes(1);
  rerender({ ids: [crypto.randomUUID()] });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  expect(api.read).toHaveBeenCalledTimes(1);
  server = { ...emptyVoting, session };
  act(() => store.commands.refresh());
  await waitFor(() =>
    expect(store.getSnapshot().data.session?.id).toBe(session.id),
  );
  rerender({ ids: [row.id] });
  await waitFor(() => expect(api.read).toHaveBeenCalledTimes(3));
});
