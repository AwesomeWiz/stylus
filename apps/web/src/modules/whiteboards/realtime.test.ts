import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { subscribeToBoardCollaboration } from "./realtime";

describe("whiteboard realtime subscription", () => {
  it("scopes rows to one board, tracks presence, and cleans up", () => {
    const handlers: Array<{
      config: Record<string, unknown>;
      event: string;
      callback: (payload: { new: unknown }) => void;
    }> = [];
    let subscribeCallback: ((status: string) => void) | undefined;
    const channel = {
      on: vi.fn(
        (
          event: string,
          config: Record<string, unknown>,
          callback: (payload: { new: unknown }) => void,
        ) => {
          handlers.push({ callback, config, event });
          return channel;
        },
      ),
      presenceState: vi.fn(() => ({ session: [{ userId: "user-a" }] })),
      subscribe: vi.fn((callback: (status: string) => void) => {
        subscribeCallback = callback;
        return channel;
      }),
      track: vi.fn(),
      untrack: vi.fn(),
    };
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    } as unknown as SupabaseClient<Database>;
    const onConnection = vi.fn();
    const onPresence = vi.fn();
    const cleanup = subscribeToBoardCollaboration({
      boardId: "board-a",
      currentUser: { id: "user-a" },
      members: [
        { display_name: "Alex", member_user_id: "user-a", role: "MEMBER" },
      ],
      onComment: vi.fn(),
      onConnection,
      onElement: vi.fn(),
      onPresence,
      supabase,
    });

    expect(supabase.channel).toHaveBeenCalledWith(
      "board:board-a",
      expect.objectContaining({
        config: expect.objectContaining({ private: true }),
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
      expect.objectContaining({ userId: "user-a" }),
    );
    handlers[2]?.callback({ new: {} });
    expect(onPresence).toHaveBeenCalledWith([
      { displayName: "Alex", role: "MEMBER", userId: "user-a" },
    ]);
    cleanup();
    expect(channel.untrack).toHaveBeenCalled();
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });

  it("reports degraded connectivity without blocking local editing", () => {
    let callback: ((status: string) => void) | undefined;
    const channel = {
      on: vi.fn(() => channel),
      presenceState: vi.fn(() => ({})),
      subscribe: vi.fn((next: (status: string) => void) => {
        callback = next;
        return channel;
      }),
      track: vi.fn(),
      untrack: vi.fn(),
    };
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    } as unknown as SupabaseClient<Database>;
    const onConnection = vi.fn();
    subscribeToBoardCollaboration({
      boardId: "board-a",
      currentUser: { id: "user-a" },
      members: [],
      onComment: vi.fn(),
      onConnection,
      onElement: vi.fn(),
      onPresence: vi.fn(),
      supabase,
    });
    callback?.("CHANNEL_ERROR");
    expect(onConnection).toHaveBeenLastCalledWith("DEGRADED");
  });
});
