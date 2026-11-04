import { beforeEach, describe, it, expect, vi } from "vitest";
import { board } from "@/test/board-fixtures";
const api = vi.hoisted(() => ({
  context: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  eq: vi.fn(),
  sessionAvailable: true,
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: api.context,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc: api.rpc, from: api.from }),
}));
import {
  readBoardVotingAction,
  setBoardVoteAction,
  startBoardVotingAction,
  endBoardVotingAction,
} from "./voting-actions";
const scope = { boardId: board.id, organizationId: board.organization_id },
  sessionId = crypto.randomUUID(),
  elementId = crypto.randomUUID();
const command = {
  ...scope,
  sessionId,
  elementId,
  slot: 1,
  active: true,
  requestId: crypto.randomUUID(),
  expectedVersion: 0,
};
beforeEach(() => {
  vi.clearAllMocks();
  api.sessionAvailable = true;
  api.context.mockResolvedValue({
    organization: { id: scope.organizationId },
    membership: { role: "MEMBER" },
  });
  api.from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain,
      eq: (...args: unknown[]) => {
        api.eq(...args);
        return chain;
      },
      is: () => chain,
      maybeSingle: async () => ({
        data:
          table === "board_voting_sessions" && !api.sessionAvailable
            ? null
            : { id: board.id },
        error: null,
      }),
    };
    return chain;
  });
  api.rpc.mockResolvedValue({
    data: {
      session: null,
      own_votes: [],
      summaries: [],
      results: [],
      has_more: false,
    },
    error: null,
  });
});
describe("fresh voting action boundaries", () => {
  it("reads bounded counts under the current organization and active Board", async () => {
    expect(
      (await readBoardVotingAction({ ...scope, ids: [elementId] })).status,
    ).toBe("success");
    expect(api.eq).toHaveBeenCalledWith(
      "organization_id",
      scope.organizationId,
    );
    expect(api.rpc).toHaveBeenCalledWith("read_board_voting", {
      p_board_id: scope.boardId,
      p_element_ids: [elementId],
    });
  });
  it("does not accept a foreign organization supplied by the client", async () => {
    expect(
      (
        await readBoardVotingAction({
          ...scope,
          organizationId: crypto.randomUUID(),
          ids: [],
        })
      ).status,
    ).toBe("error");
    expect(api.rpc).not.toHaveBeenCalled();
  });
  it("validates allowance/types before reaching persistence", async () => {
    expect(
      (
        await startBoardVotingAction({
          ...scope,
          allowance: 6,
          types: ["TEXT"],
        })
      ).status,
    ).toBe("error");
    expect(api.rpc).not.toHaveBeenCalled();
  });
  it("rechecks current role on every start/cast/end while VIEWER may read", async () => {
    api.context.mockResolvedValue({
      organization: { id: scope.organizationId },
      membership: { role: "VIEWER" },
    });
    for (const action of [
      () => startBoardVotingAction({ ...scope, allowance: 3, types: ["TEXT"] }),
      () => setBoardVoteAction(command),
      () => endBoardVotingAction({ ...scope, sessionId }),
    ])
      expect((await action()).status).toBe("error");
    expect(api.rpc).not.toHaveBeenCalled();
    expect((await readBoardVotingAction({ ...scope, ids: [] })).status).toBe(
      "success",
    );
  });
  it("checks session plus Board scope before cast/end", async () => {
    api.sessionAvailable = false;
    expect((await setBoardVoteAction(command)).status).toBe("error");
    expect((await endBoardVotingAction({ ...scope, sessionId })).status).toBe(
      "error",
    );
    expect(api.rpc).not.toHaveBeenCalled();
    expect(api.eq).toHaveBeenCalledWith("board_id", scope.boardId);
  });
  it("uses only actor-owned versioned slots and strips SQL details from errors", async () => {
    api.rpc.mockResolvedValue({
      data: null,
      error: { code: "PT409", message: "private SQL detail" },
    });
    const result = await setBoardVoteAction(command);
    expect(result).toMatchObject({
      status: "error",
      message: "Voting changed. Refresh and try again.",
    });
    expect(JSON.stringify(result)).not.toContain("private SQL");
    expect(api.rpc).toHaveBeenCalledWith(
      "set_board_vote",
      expect.objectContaining({
        p_slot: 1,
        p_expected_version: 0,
        p_request_id: command.requestId,
      }),
    );
    expect(api.rpc.mock.calls[0]![1]).not.toHaveProperty("voter_id");
  });
  it("rejects oversized reads and invalid returned tenant projections", async () => {
    expect(
      (
        await readBoardVotingAction({
          ...scope,
          ids: Array(201).fill(elementId),
        })
      ).status,
    ).toBe("error");
    expect(api.rpc).not.toHaveBeenCalled();
  });
});
