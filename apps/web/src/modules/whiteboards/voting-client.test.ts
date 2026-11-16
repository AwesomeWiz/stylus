import { afterEach, describe, expect, it, vi } from "vitest";
import { readBoardVoting } from "./voting-client";
import { emptyVoting } from "./voting";
const input = {
  boardId: crypto.randomUUID(),
  organizationId: crypto.randomUUID(),
  ids: [],
};
afterEach(() => vi.unstubAllGlobals());
describe("voting reads outside the action queue", () => {
  it("uses a bounded credentialed private fetch and validates the snapshot", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ status: "success", data: emptyVoting }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await readBoardVoting(input)).toEqual({
      status: "success",
      data: emptyVoting,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/boards/voting",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(input),
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it("does not submit oversized projections", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      readBoardVoting({
        ...input,
        ids: Array.from({ length: 201 }, () => crypto.randomUUID()),
      }),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("classifies revocation and rejects malformed success payloads", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(
        Response.json({
          status: "success",
          data: { ...emptyVoting, own_votes: [{}] },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await readBoardVoting(input)).toEqual({
      status: "error",
      code: "ACCESS",
    });
    await expect(readBoardVoting(input)).rejects.toThrow();
  });
});
