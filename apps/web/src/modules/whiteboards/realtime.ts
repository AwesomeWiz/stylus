"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BoardCommentRow,
  BoardElementRow,
  Database,
  TaskMember,
} from "@/lib/supabase/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

import { normalizeBoardPresence, type BoardPresence } from "./collaboration";

export type CollaborationConnectionState =
  "CONNECTING" | "CONNECTED" | "DEGRADED";

type SubscriptionOptions = {
  boardId: string;
  organizationId: string;
  currentUser: { id: string };
  members: TaskMember[];
  onComment: (comment: BoardCommentRow) => void;
  onConnection: (state: CollaborationConnectionState) => void;
  onElement: (element: BoardElementRow) => void;
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
  onElement,
  onPresence,
  supabase = createBrowserSupabaseClient(),
}: SubscriptionOptions) {
  let disposed = false;
  onConnection("CONNECTING");
  const channel = supabase.channel(`board:${organizationId}:${boardId}`, {
    config: {
      presence: { key: `${currentUser.id}:${crypto.randomUUID()}` },
      private: true,
    },
  });
  let latestCursor: { x: number; y: number } | null = null;
  let cursorTimer: ReturnType<typeof setTimeout> | null = null;
  let lastCursorTrackAt = 0;
  const onlineAt = new Date().toISOString();
  const track = () => {
    lastCursorTrackAt = Date.now();
    void channel.track({
      cursor: latestCursor,
      onlineAt,
      userId: currentUser.id,
    });
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
    .on("presence", { event: "sync" }, () => {
      onPresence(
        normalizeBoardPresence(
          channel.presenceState() as Record<string, unknown[]>,
          members,
        ),
      );
    })
    .subscribe((status) => {
      if (disposed) return;
      if (status === "SUBSCRIBED") {
        onConnection("CONNECTED");
        track();
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        onConnection("DEGRADED");
      }
    });

  return {
    unsubscribe() {
      disposed = true;
      if (cursorTimer) clearTimeout(cursorTimer);
      void channel.untrack();
      void supabase.removeChannel(channel);
    },
    updateCursor(cursor: { x: number; y: number }) {
      if (disposed || !Number.isFinite(cursor.x) || !Number.isFinite(cursor.y))
        return;
      if (Math.abs(cursor.x) > 1_000_000 || Math.abs(cursor.y) > 1_000_000)
        return;
      latestCursor = cursor;
      const wait = Math.max(0, 50 - (Date.now() - lastCursorTrackAt));
      if (wait === 0) track();
      else if (!cursorTimer)
        cursorTimer = setTimeout(() => {
          cursorTimer = null;
          track();
        }, wait);
    },
  };
}
