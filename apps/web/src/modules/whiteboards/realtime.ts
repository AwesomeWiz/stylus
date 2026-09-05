"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BoardCommentRow,
  BoardElementRow,
  Database,
  TaskMember,
} from "@/lib/supabase/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

import {
  boardCollaborationTopic,
  includeLocalBoardPresence,
  normalizeBoardCursorBroadcast,
  normalizeBoardPresence,
  type BoardCursorUpdate,
  type BoardPresence,
} from "./collaboration";

export type CollaborationConnectionState =
  "CONNECTING" | "CONNECTED" | "DEGRADED";

type SubscriptionOptions = {
  boardId: string;
  organizationId: string;
  currentUser: { displayName: string; id: string };
  members: TaskMember[];
  onComment: (comment: BoardCommentRow) => void;
  onConnection: (state: CollaborationConnectionState) => void;
  onElement: (element: BoardElementRow) => void;
  onCursor: (cursor: BoardCursorUpdate) => void;
  onPresence: (presence: BoardPresence[]) => void;
  supabase?: SupabaseClient<Database>;
};

export function subscribeToBoardCollaboration({
  boardId,
  organizationId,
  currentUser,
  members,
  onComment,
  onConnection,
  onCursor,
  onElement,
  onPresence,
  supabase = createBrowserSupabaseClient(),
}: SubscriptionOptions) {
  let disposed = false;
  let subscribed = false;
  onConnection("CONNECTING");
  onPresence(includeLocalBoardPresence([], currentUser, members));
  const sessionId = crypto.randomUUID();
  const channel = supabase.channel(
    boardCollaborationTopic(organizationId, boardId),
    {
      config: {
        broadcast: { ack: true, self: false },
        presence: { key: `${currentUser.id}:${sessionId}` },
        private: true,
      },
    },
  );
  let latestCursor: { x: number; y: number } | null = null;
  let cursorTimer: ReturnType<typeof setTimeout> | null = null;
  let lastCursorSendAt = 0;
  const staleCursorTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const visibleCursorUsers = new Set<string>();
  const markDegradedOnFailure = async (
    operation: Promise<string> | undefined,
  ) => {
    try {
      const result = await operation;
      if (!disposed && result && result !== "ok") onConnection("DEGRADED");
    } catch {
      if (!disposed) onConnection("DEGRADED");
    }
  };
  const clearRemoteCursor = (userId: string) => {
    const timer = staleCursorTimers.get(userId);
    if (timer) clearTimeout(timer);
    staleCursorTimers.delete(userId);
    if (visibleCursorUsers.delete(userId)) onCursor({ cursor: null, userId });
  };
  const publishCursor = () => {
    if (!subscribed || !latestCursor) return;
    lastCursorSendAt = Date.now();
    void markDegradedOnFailure(
      channel.send({
        event: "cursor",
        payload: { sessionId, x: latestCursor.x, y: latestCursor.y },
        type: "broadcast",
      }),
    );
  };
  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        filter: `board_id=eq.${boardId}`,
        schema: "public",
        table: "board_elements",
      },
      (payload) => onElement(payload.new as BoardElementRow),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        filter: `board_id=eq.${boardId}`,
        schema: "public",
        table: "board_comments",
      },
      (payload) => onComment(payload.new as BoardCommentRow),
    )
    .on("broadcast", { event: "cursor" }, ({ payload }) => {
      const cursor = normalizeBoardCursorBroadcast(
        payload,
        channel.presenceState() as Record<string, unknown[]>,
        members,
        currentUser.id,
      );
      if (!cursor?.cursor) return;
      visibleCursorUsers.add(cursor.userId);
      onCursor(cursor);
      const existingTimer = staleCursorTimers.get(cursor.userId);
      if (existingTimer) clearTimeout(existingTimer);
      staleCursorTimers.set(
        cursor.userId,
        setTimeout(() => clearRemoteCursor(cursor.userId), 4_000),
      );
    })
    .on("presence", { event: "sync" }, () => {
      const people = includeLocalBoardPresence(
        normalizeBoardPresence(
          channel.presenceState() as Record<string, unknown[]>,
          members,
        ),
        currentUser,
        members,
      );
      const presentIds = new Set(people.map((person) => person.userId));
      for (const userId of visibleCursorUsers)
        if (!presentIds.has(userId)) clearRemoteCursor(userId);
      onPresence(people);
    })
    .subscribe((status) => {
      if (disposed) return;
      if (status === "SUBSCRIBED") {
        subscribed = true;
        onConnection("CONNECTED");
        void markDegradedOnFailure(
          channel.track({ sessionId, userId: currentUser.id }),
        );
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        subscribed = false;
        onConnection("DEGRADED");
      }
    });

  return {
    unsubscribe() {
      disposed = true;
      if (cursorTimer) clearTimeout(cursorTimer);
      for (const userId of [...visibleCursorUsers]) clearRemoteCursor(userId);
      void channel.untrack();
      void supabase.removeChannel(channel);
    },
    updateCursor(cursor: { x: number; y: number }) {
      if (disposed || !Number.isFinite(cursor.x) || !Number.isFinite(cursor.y))
        return;
      if (Math.abs(cursor.x) > 1_000_000 || Math.abs(cursor.y) > 1_000_000)
        return;
      latestCursor = cursor;
      const wait = Math.max(0, 40 - (Date.now() - lastCursorSendAt));
      if (wait === 0) publishCursor();
      else if (!cursorTimer)
        cursorTimer = setTimeout(() => {
          cursorTimer = null;
          publishCursor();
        }, wait);
    },
  };
}
