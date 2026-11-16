// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionRow } from "@/core/integrations/public";
import {
  locatorSchema,
  targetSchema,
  validResourceUrl,
} from "@/core/integrations/public";
import { providerRequest } from "./http";
import { githubResolve, githubResolveBatch, githubSearch } from "./github";
import {
  calendarEventBody,
  createGoogleEvent,
  googleResolve,
  googleResolveBatch,
  googleSearch,
} from "./google";
import { IntegrationError } from "./errors";
const fetcher = vi.fn(),
  gh = {
    id: "connection",
    config: { repositories: [{ id: "12", fullName: "fictional/startup" }] },
  } as ConnectionRow;
const file = {
  id: "file_a",
  name: "Fictional launch plan",
  mimeType: "application/vnd.google-apps.document",
  webViewLink: "https://docs.google.com/document/d/file_a/edit",
};
const intent = "10000000-0000-4000-8000-000000000001";
const eventInput = {
  title: "Fictional checkpoint",
  date: "2026-11-30",
  time: "",
  timeZone: "Asia/Kolkata",
  calendarId: "primary",
};
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
beforeEach(() => {
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => vi.unstubAllGlobals());
describe("bounded provider transport", () => {
  it("blocks arbitrary hosts, credentials, ports and redirects", async () => {
    for (const url of [
      "http://api.github.com/user",
      "https://evil.test/user",
      "https://secret@api.github.com/user",
      "https://api.github.com:444/user",
    ])
      await expect(providerRequest(url)).rejects.toThrow(IntegrationError);
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(response({}));
    await providerRequest("https://api.github.com/user");
    expect(fetcher.mock.calls[0]![1]).toMatchObject({
      cache: "no-store",
      redirect: "error",
    });
  });
  it.each([
    [401, "authorization"],
    [403, "authorization"],
    [429, "rate-limit"],
    [404, "denied"],
    [503, "unavailable"],
    [409, "conflict"],
  ])(
    "classifies HTTP %i without returning provider bodies",
    async (status, category) => {
      fetcher.mockResolvedValue(
        response({ private: "must not escape" }, Number(status)),
      );
      await expect(
        providerRequest("https://api.github.com/user"),
      ).rejects.toMatchObject({ category });
    },
  );
  it("rejects oversized, malformed and disconnected responses", async () => {
    fetcher.mockResolvedValue(new Response("x".repeat(512001)));
    await expect(
      providerRequest("https://api.github.com/user"),
    ).rejects.toThrow(IntegrationError);
    fetcher.mockResolvedValue(new Response("not json"));
    await expect(
      providerRequest("https://api.github.com/user"),
    ).rejects.toThrow(IntegrationError);
    fetcher.mockRejectedValue(Error("network internal secret"));
    await expect(
      providerRequest("https://api.github.com/user"),
    ).rejects.toThrow("could not be reached");
  });
});
describe("provider projections and bounds", () => {
  it("classifies HTTP-success GraphQL throttling without exposing provider messages", async () => {
    fetcher.mockResolvedValue(
      response({
        errors: [
          {
            type: "RATE_LIMITED",
            message: "private diagnostic must not escape",
          },
        ],
      }),
    );
    await expect(
      githubResolveBatch(gh, "token", [
        {
          provider: "github",
          kind: "repository",
          repositoryId: "12",
          repository: "fictional/startup",
          id: "12",
        },
      ]),
    ).rejects.toMatchObject({
      category: "rate-limit",
      message: "The provider is busy. Try again later.",
    });
  });
  it("searches GitHub metadata through fixed GraphQL fields and opaque pagination", async () => {
    fetcher.mockResolvedValue(
      response({
        data: {
          repository: {
            databaseId: 12,
            nameWithOwner: "fictional/startup",
            result: {
              nodes: [{ number: 7, title: "Fictional marker", state: "OPEN" }],
              pageInfo: { hasNextPage: true, endCursor: "cursor_next" },
            },
          },
        },
      }),
    );
    const result = await githubSearch(gh, "token", {
      connectionId: "x",
      query: "marker",
      kind: "issue",
      repositoryId: "12",
    });
    expect(result.cursor).toBe("cursor_next");
    expect(result.items[0]?.locator.id).toBe("7");
    const request = fetcher.mock.calls[0]!;
    expect(request[0]).toBe("https://api.github.com/graphql");
    const query = JSON.parse(request[1].body).query;
    expect(query).toContain("issues(first:25");
    expect(query).not.toMatch(/\b(?:body|comments|files|patch|text)\b/);
  });
  it("resolves exact Commit identities without fetching source or patches", async () => {
    const sha = "a".repeat(40);
    fetcher.mockResolvedValue(
      response({
        data: {
          r0: {
            databaseId: 12,
            nameWithOwner: "fictional/startup",
            item: { oid: sha, messageHeadline: "Fictional commit" },
          },
        },
      }),
    );
    const result = await githubResolve(gh, "token", {
      provider: "github",
      kind: "commit",
      repositoryId: "12",
      repository: "fictional/startup",
      id: sha,
    });
    expect(result.title).toBe("Fictional commit");
    expect(fetcher.mock.calls[0]![0]).toBe("https://api.github.com/graphql");
    expect(JSON.parse(fetcher.mock.calls[0]![1].body).query).not.toMatch(
      /\b(?:text|files|patch|diff)\b/,
    );
    expect(
      locatorSchema.safeParse({ ...result.locator, id: "main" }).success,
    ).toBe(false);
  });
  it("keeps Calendar page ranges stable and rejects query-swapped cursors", async () => {
    const event = {
      id: "event_a",
      summary: "Checkpoint",
      htmlLink: "https://calendar.google.com/event?eid=fictional",
      start: { date: "2026-11-30" },
    };
    fetcher
      .mockResolvedValueOnce(
        response({ items: [event], nextPageToken: "page_two" }),
      )
      .mockResolvedValueOnce(response({ items: [event] }));
    const input = {
      connectionId: "x",
      query: "checkpoint",
      calendarId: "isolated@example.test",
    };
    const first = await googleSearch("google-calendar", "token", input);
    await googleSearch("google-calendar", "token", {
      ...input,
      cursor: first.cursor,
    });
    const a = new URL(fetcher.mock.calls[0]![0]),
      b = new URL(fetcher.mock.calls[1]![0]);
    expect(a.searchParams.get("timeMin")).toBe(b.searchParams.get("timeMin"));
    expect(a.searchParams.get("timeMax")).toBe(b.searchParams.get("timeMax"));
    expect(b.searchParams.get("pageToken")).toBe("page_two");
    await expect(
      googleSearch("google-calendar", "token", {
        ...input,
        query: "different",
        cursor: first.cursor,
      }),
    ).rejects.toMatchObject({ category: "invalid" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("keeps public targets and URLs typed and bounded", () => {
    expect(
      targetSchema.safeParse({ entityType: "agency.client", entityId: intent })
        .success,
    ).toBe(false);
    expect(
      locatorSchema.safeParse({
        provider: "google-drive",
        kind: "file",
        id: "../secret",
      }).success,
    ).toBe(false);
    for (const u of [
      "javascript:alert(1)",
      "https://github.com.evil.test/a",
      "https://secret@github.com/a",
    ])
      expect(validResourceUrl("github", u)).toBe(false);
  });
  it("searches metadata without downloading Drive contents and escapes query literals", async () => {
    fetcher.mockResolvedValue(
      response({
        files: [{ ...file, description: "not selected", owners: ["private"] }],
        nextPageToken: "page2",
      }),
    );
    const result = await googleSearch("google-drive", "fictional-token", {
      connectionId: "x",
      query: "foo' or trashed = true",
    });
    expect(result.cursor).toBe("page2");
    expect(result.items[0]!.title).toBe(file.name);
    expect(JSON.stringify(result)).not.toMatch(/owners|not selected/);
    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.searchParams.get("q")).toContain("foo\\' or trashed = true");
    expect(url.searchParams.get("fields")).not.toMatch(
      /description|content|owners/,
    );
    expect(url.searchParams.has("alt")).toBe(false);
  });
  it("does not render deleted files or unsafe provider URLs", async () => {
    fetcher.mockResolvedValue(response({ ...file, trashed: true }));
    await expect(
      googleResolve("token", {
        provider: "google-drive",
        kind: "file",
        id: "file_a",
      }),
    ).rejects.toMatchObject({ category: "denied" });
    fetcher.mockResolvedValue(
      response({ ...file, webViewLink: "https://evil.test/private" }),
    );
    await expect(
      googleResolve("token", {
        provider: "google-drive",
        kind: "file",
        id: "file_a",
      }),
    ).rejects.toThrow(IntegrationError);
  });
  it("bounds Calendar search and strips attendee/private data", async () => {
    fetcher.mockResolvedValue(
      response({
        items: [
          {
            id: "e1",
            summary: "Review",
            htmlLink: "https://calendar.google.com/event?eid=e1",
            start: { date: "2026-11-30" },
            attendees: [{ email: "private@example.test" }],
            description: "secret",
            extendedProperties: { private: { secret: "value" } },
          },
        ],
      }),
    );
    const r = await googleSearch("google-calendar", "token", {
      connectionId: "x",
      calendarId: "isolated@example.test",
      query: "review",
    });
    expect(r.items).toHaveLength(1);
    expect(JSON.stringify(r)).not.toMatch(
      /attendees|private@example|secret|value/,
    );
    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.searchParams.get("maxResults")).toBe("25");
    expect(url.searchParams.get("timeMax")).toBeTruthy();
    expect(url.searchParams.get("fields")).not.toContain("attendees");
  });
  it("never queries an unselected GitHub repository", async () => {
    await expect(
      githubResolve(gh, "token", {
        provider: "github",
        kind: "issue",
        repositoryId: "99",
        repository: "foreign/private",
        id: "1",
      }),
    ).rejects.toMatchObject({ category: "denied" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("maps PR merge state and paginates safely", async () => {
    fetcher.mockResolvedValue(
      response({
        data: {
          r0: {
            databaseId: 12,
            nameWithOwner: "fictional/startup",
            item: {
              number: 42,
              title: "Fix checkpoint",
              state: "CLOSED",
              mergedAt: "2026-11-10T00:00:00Z",
            },
          },
        },
      }),
    );
    const r = await githubResolve(gh, "token", {
      provider: "github",
      kind: "pull-request",
      repositoryId: "12",
      repository: "fictional/startup",
      id: "42",
    });
    expect(r.state).toBe("Merged");
    expect(r.url).toBe("https://github.com/fictional/startup/pull/42");
    await expect(
      githubSearch(gh, "token", {
        connectionId: "x",
        query: "",
        kind: "issue",
        repositoryId: "12",
        cursor: "https://evil.test",
      }),
    ).rejects.toThrow(IntegrationError);
  });
  it("resolves several GitHub references in a single bounded metadata query", async () => {
    fetcher.mockResolvedValue(
      response({
        data: {
          r0: {
            databaseId: 12,
            nameWithOwner: "fictional/startup",
            item: {
              number: 42,
              title: "Fix",
              state: "MERGED",
              mergedAt: "2026-11-10",
            },
          },
          r1: { databaseId: 12, nameWithOwner: "fictional/startup" },
        },
      }),
    );
    const r = await githubResolveBatch(gh, "token", [
      {
        provider: "github",
        kind: "pull-request",
        repositoryId: "12",
        repository: "fictional/startup",
        id: "42",
      },
      {
        provider: "github",
        kind: "repository",
        repositoryId: "12",
        repository: "fictional/startup",
        id: "12",
      },
    ]);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ state: "Merged" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]![0]).toBe("https://api.github.com/graphql");
  });
  it("resolves Google metadata in a batch and isolates unavailable items", async () => {
    const body = `--batch_response\r\nContent-Type: application/http\r\nContent-ID: <response-resource-0>\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(file)}\r\n--batch_response\r\nContent-Type: application/http\r\nContent-ID: <response-resource-1>\r\n\r\nHTTP/1.1 404 Not Found\r\n\r\n{}\r\n--batch_response--`;
    fetcher.mockResolvedValue(
      new Response(body, {
        headers: { "Content-Type": "multipart/mixed; boundary=batch_response" },
      }),
    );
    const r = await googleResolveBatch("token", [
      { provider: "google-drive", kind: "file", id: "file_a" },
      { provider: "google-drive", kind: "file", id: "missing" },
    ]);
    expect(r[0]).toMatchObject({ title: file.name });
    expect(r[1]).toMatchObject({ category: "denied" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("keeps all-day and timed event identities deterministic", () => {
    const body = calendarEventBody(
      eventInput,
      intent,
      "https://stylus.example/tasks",
    );
    expect(body.id).toMatch(/^[0-9a-v]{5,}$/);
    expect(body.start).toEqual({ date: "2026-11-30" });
    expect(body.end).toEqual({ date: "2026-12-01" });
    const timed = calendarEventBody(
      { ...eventInput, time: "23:50" },
      intent,
      "https://stylus.example/tasks",
    );
    expect(timed.end).toEqual({
      dateTime: "2026-12-01T00:20:00",
      timeZone: "Asia/Kolkata",
    });
    expect(timed.id).toBe(body.id);
  });
  it("recovers a lost Calendar creation response without another event ID", async () => {
    const body = calendarEventBody(
      eventInput,
      intent,
      "https://stylus.example/tasks",
    );
    fetcher.mockResolvedValueOnce(response({}, 409)).mockResolvedValueOnce(
      response({
        id: body.id,
        summary: eventInput.title,
        htmlLink: "https://calendar.google.com/event?eid=example",
        start: { date: eventInput.date },
        extendedProperties: { private: { stylusIntent: intent } },
      }),
    );
    expect(
      (
        await createGoogleEvent(
          "token",
          eventInput,
          intent,
          "https://stylus.example/tasks",
        )
      ).locator.id,
    ).toBe(body.id);
    expect(fetcher.mock.calls.map((c) => c[1].method ?? "GET")).toEqual([
      "POST",
      "GET",
    ]);
    expect(fetcher.mock.calls[1]![0]).toContain(body.id);
  });
  it("will not claim an unrelated event on a conflicting ID", async () => {
    fetcher.mockResolvedValue(
      response({
        id: "other",
        summary: "Other event",
        htmlLink: "https://calendar.google.com/event?eid=other",
      }),
    );
    await expect(
      createGoogleEvent(
        "token",
        eventInput,
        intent,
        "https://stylus.example/tasks",
      ),
    ).rejects.toMatchObject({ category: "denied" });
  });
});
