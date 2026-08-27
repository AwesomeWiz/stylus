import { describe, expect, it, vi } from "vitest";

import {
  WorkerApi,
  WorkerUnauthorizedError,
  WorkerUnexpectedResponseError,
} from "./api.js";

describe("worker API", () => {
  it("sends the credential only as a bearer header and fixed capabilities", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(null), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await new WorkerApi(
      "https://stylus.example",
      "a".repeat(64),
      fetcher,
    ).claim();
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://stylus.example/api/worker/claim",
    );
    expect((request.headers as Record<string, string>).authorization).toBe(
      `Bearer ${"a".repeat(64)}`,
    );
    expect(request.body).not.toContain("a".repeat(64));
    expect(request.body).toContain("core.worker.echo");
  });

  it("normalizes revoked credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("{}", {
        headers: { "content-type": "application/json" },
        status: 401,
      }),
    );
    await expect(
      new WorkerApi(
        "https://stylus.example",
        "a".repeat(64),
        fetcher,
      ).heartbeat(),
    ).rejects.toBeInstanceOf(WorkerUnauthorizedError);
  });

  it("rejects non-JSON without reading or exposing the HTML body", async () => {
    const html = "<!DOCTYPE html><title>Login</title>";
    const response = new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: 200,
    });
    const text = vi.spyOn(response, "text");
    const json = vi.spyOn(response, "json");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetcher = vi.fn().mockResolvedValue(response);

    await expect(
      new WorkerApi("https://stylus.example", undefined, fetcher).pair(
        "a".repeat(64),
      ),
    ).rejects.toEqual(new WorkerUnexpectedResponseError(200));
    expect(text).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with a safe normalized error", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("not-json", {
        headers: { "content-type": "application/json" },
        status: 500,
      }),
    );
    const result = new WorkerApi(
      "https://stylus.example",
      undefined,
      fetcher,
    ).pair("a".repeat(64));

    await expect(result).rejects.toEqual(
      new WorkerUnexpectedResponseError(500),
    );
  });
});
