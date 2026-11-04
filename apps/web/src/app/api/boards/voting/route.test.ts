import { beforeEach, describe, expect, it, vi } from "vitest";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/modules/whiteboards/voting-actions", () => ({
  readBoardVotingAction: read,
}));
import { POST } from "./route";
const url = "https://stylus.example/api/boards/voting";
const request = (
  body: string,
  origin = "https://stylus.example",
  type = "application/json",
) =>
  new Request(url, {
    method: "POST",
    headers: { origin, "content-type": type },
    body,
  });
beforeEach(() => {
  read.mockReset();
});
describe("private voting read transport", () => {
  it("reuses fresh server authorization and marks successful data noncacheable", async () => {
    const data = {
      status: "success",
      data: {
        session: null,
        own_votes: [],
        summaries: [],
        results: [],
        has_more: false,
      },
    };
    read.mockResolvedValue(data);
    const response = await POST(request('{"boardId":"candidate"}'));
    expect(read).toHaveBeenCalledWith({ boardId: "candidate" });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual(data);
  });
  it("accepts the browser Host when Next canonicalizes the listening URL", async () => {
    read.mockResolvedValue({ status: "success", data: {} });
    const response = await POST(
      new Request("http://localhost:3347/api/boards/voting", {
        method: "POST",
        headers: {
          host: "127.0.0.1:3347",
          origin: "http://127.0.0.1:3347",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
    expect(read).toHaveBeenCalledOnce();
    const denied = await POST(
      new Request("http://localhost:3347/api/boards/voting", {
        method: "POST",
        headers: {
          host: "127.0.0.1:3347",
          origin: "http://127.0.0.1:3348",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(denied.status).toBe(403);
    expect(read).toHaveBeenCalledOnce();
  });
  it("returns no private data when the shared fresh access check denies", async () => {
    read.mockResolvedValue({
      status: "error",
      code: "ACCESS",
      message: "Board unavailable",
    });
    const response = await POST(request("{}"));
    expect(response.status).toBe(403);
    expect(await response.json()).not.toHaveProperty("data");
  });
  it("rejects foreign origins, invalid JSON and non-JSON bodies before server reads", async () => {
    expect((await POST(request("{}", "https://foreign.example"))).status).toBe(
      403,
    );
    expect((await POST(request("{"))).status).toBe(400);
    expect(
      (await POST(request("{}", "https://stylus.example", "text/plain")))
        .status,
    ).toBe(415);
    expect(read).not.toHaveBeenCalled();
  });
  it("bounds streamed bodies before parsing or authorizing a projection", async () => {
    const response = await POST(
      request(JSON.stringify({ text: "x".repeat(16_384) })),
    );
    expect(response.status).toBe(413);
    expect(read).not.toHaveBeenCalled();
  });
  it("does not expose unexpected server errors", async () => {
    read.mockRejectedValue(Error("private SQL trace"));
    const response = await POST(request("{}"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private SQL");
  });
});
