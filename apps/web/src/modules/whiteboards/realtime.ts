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
  const channel = supabase.channel(`board:${boardId}`, {
    config: {
      presence: { key: `${currentUser.id}:${crypto.randomUUID()}` },
      private: true,
    },
  });
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
        void channel.track({
          onlineAt: new Date().toISOString(),
          userId: currentUser.id,
        });
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        onConnection("DEGRADED");
      }
    });

  return () => {
    disposed = true;
    void channel.untrack();
    void supabase.removeChannel(channel);
  };
}
