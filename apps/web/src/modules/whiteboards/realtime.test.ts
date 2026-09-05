import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { subscribeToBoardCollaboration } from "./realtime";

afterEach(() => vi.useRealTimers());

describe("whiteboard realtime subscription", () => {
  it("scopes rows to one board, tracks presence, and cleans up", () => {
    vi.useFakeTimers();
    const handlers: Array<{
      config: Record<string, unknown>;
      event: string;
      callback: (payload: { new?: unknown; payload?: unknown }) => void;
    }> = [];
    let subscribeCallback: ((status: string) => void) | undefined;
    let presenceState: Record<string, unknown[]> = {
      local: [{ sessionId: "local-session", userId: "user-a" }],
      remote: [
        { sessionId: "remote-one", userId: "user-b" },
        { sessionId: "remote-two", userId: "user-b" },
      ],
    };
    const channel = {
      on: vi.fn(
        (
          event: string,
          config: Record<string, unknown>,
          callback: (payload: { new?: unknown; payload?: unknown }) => void,
        ) => {
          handlers.push({ callback, config, event });
          return channel;
        },
      ),
      presenceState: vi.fn(() => presenceState),
      send: vi.fn(async () => "ok" as const),
      subscribe: vi.fn((callback: (status: string) => void) => {
        subscribeCallback = callback;
        return channel;
      }),
      track: vi.fn(async () => "ok" as const),
      untrack: vi.fn(),
    };
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    } as unknown as SupabaseClient<Database>;
    const onConnection = vi.fn();
    const onCursor = vi.fn();
    const onPresence = vi.fn();
    const subscription = subscribeToBoardCollaboration({
      boardId: "board-a",
      organizationId: "organization-a",
      currentUser: { displayName: "Alex", id: "user-a" },
      members: [
        { display_name: "Alex", member_user_id: "user-a", role: "MEMBER" },
        { display_name: "Blair", member_user_id: "user-b", role: "VIEWER" },
      ],
      onComment: vi.fn(),
      onConnection,
      onCursor,
      onElement: vi.fn(),
      onPresence,
      supabase,
    });

    expect(onPresence).toHaveBeenCalledWith([
      { displayName: "Alex", role: "MEMBER", userId: "user-a" },
    ]);

    expect(supabase.channel).toHaveBeenCalledWith(
      "board:organization-a:board-a",
      expect.objectContaining({
        config: expect.objectContaining({
          broadcast: { ack: true, self: false },
          private: true,
        }),
      }),
    );
    expect(handlers.slice(0, 2).map((handler) => handler.config)).toEqual([
      expect.objectContaining({
        filter: "board_id=eq.board-a",
        table: "board_elements",
      }),
      expect.objectContaining({
        filter: "board_id=eq.board-a",
        table: "board_comments",
      }),
    ]);
    subscribeCallback?.("SUBSCRIBED");
    expect(channel.track).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: expect.any(String),
        userId: "user-a",
      }),
    );
    expect(channel.track).toHaveBeenCalledTimes(1);
    const presenceHandler = handlers.find(
      (handler) => handler.event === "presence",
    )!;
    presenceHandler.callback({});
    expect(onPresence).toHaveBeenLastCalledWith([
      {
        displayName: "Alex",
        role: "MEMBER",
        userId: "user-a",
      },
      {
        displayName: "Blair",
        role: "VIEWER",
        userId: "user-b",
      },
    ]);
    subscribeCallback?.("CHANNEL_ERROR");
    subscribeCallback?.("SUBSCRIBED");
    presenceHandler.callback({});
    expect(onPresence.mock.lastCall?.[0]).toHaveLength(2);
    expect(
      new Set(
        (onPresence.mock.lastCall?.[0] as { userId: string }[]).map(
          (person) => person.userId,
        ),
      ).size,
    ).toBe(2);
    expect(channel.track).toHaveBeenCalledTimes(2);
    subscription.updateCursor({ x: 14, y: 22 });
    vi.advanceTimersByTime(40);
    expect(channel.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: "cursor",
        payload: expect.objectContaining({ x: 14, y: 22 }),
        type: "broadcast",
      }),
    );
    expect(channel.track).toHaveBeenCalledTimes(2);

    const broadcastHandler = handlers.find(
      (handler) => handler.event === "broadcast",
    )!;
    broadcastHandler.callback({
      payload: { sessionId: "remote-one", x: 31, y: 47 },
    });
    expect(onCursor).toHaveBeenLastCalledWith({
      cursor: { x: 31, y: 47 },
      userId: "user-b",
    });
    vi.advanceTimersByTime(4_000);
    expect(onCursor).toHaveBeenLastCalledWith({
      cursor: null,
      userId: "user-b",
    });
    expect(onPresence.mock.lastCall?.[0]).toHaveLength(2);
    broadcastHandler.callback({
      payload: { sessionId: "remote-two", x: 34, y: 52 },
    });

    presenceState = {
      local: [{ sessionId: "local-session", userId: "user-a" }],
      remote: [{ sessionId: "remote-two", userId: "user-b" }],
    };
    presenceHandler.callback({});
    expect(onPresence.mock.lastCall?.[0]).toHaveLength(2);
    expect(onCursor).not.toHaveBeenLastCalledWith({
      cursor: null,
      userId: "user-b",
    });

    presenceState = {
      local: [{ sessionId: "local-session", userId: "user-a" }],
    };
    presenceHandler.callback({});
    expect(onPresence.mock.lastCall?.[0]).toHaveLength(1);
    expect(onCursor).toHaveBeenLastCalledWith({
      cursor: null,
      userId: "user-b",
    });
    subscription.unsubscribe();
    expect(channel.untrack).toHaveBeenCalled();
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });

  it("reports degraded connectivity without blocking local editing", () => {
    let callback: ((status: string) => void) | undefined;
    const channel = {
      on: vi.fn(() => channel),
      presenceState: vi.fn(() => ({})),
      send: vi.fn(async () => "ok" as const),
      subscribe: vi.fn((next: (status: string) => void) => {
        callback = next;
        return channel;
      }),
      track: vi.fn(async () => "ok" as const),
      untrack: vi.fn(),
    };
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    } as unknown as SupabaseClient<Database>;
    const onConnection = vi.fn();
    subscribeToBoardCollaboration({
      boardId: "board-a",
      organizationId: "organization-a",
      currentUser: { displayName: "Alex", id: "user-a" },
      members: [],
      onComment: vi.fn(),
      onConnection,
      onCursor: vi.fn(),
      onElement: vi.fn(),
      onPresence: vi.fn(),
      supabase,
    });
    callback?.("CHANNEL_ERROR");
    expect(onConnection).toHaveBeenLastCalledWith("DEGRADED");
  });
});
