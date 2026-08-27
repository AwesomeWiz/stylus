import { describe, expect, it, vi } from "vitest";

import { WorkerApi, WorkerUnauthorizedError } from "./api.js";

describe("worker API", () => {
  it("sends the credential only as a bearer header and fixed capabilities", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(null), { status: 200 }));
    await new WorkerApi(
      "https://stylus.example",
      "a".repeat(64),
      fetcher,
    ).claim();
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect((request.headers as Record<string, string>).authorization).toBe(
      `Bearer ${"a".repeat(64)}`,
    );
    expect(request.body).not.toContain("a".repeat(64));
    expect(request.body).toContain("core.worker.echo");
  });

  it("normalizes revoked credentials", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(
      new WorkerApi(
        "https://stylus.example",
        "a".repeat(64),
        fetcher,
      ).heartbeat(),
    ).rejects.toBeInstanceOf(WorkerUnauthorizedError);
  });
});
