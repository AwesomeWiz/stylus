"use client";
import { useEffect, useRef, useState } from "react";
import type {
  BoardCommentRow,
  BoardElementRow,
  BoardReactionRow,
  BoardRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import {
  allocateBoardCollaboratorColors,
  includeLocalBoardPresence,
  type BoardCollaboratorColorAssignments,
  type BoardCursorUpdate,
} from "@/modules/whiteboards/collaboration";
import {
  subscribeToBoardCollaboration,
  type CollaborationConnectionState,
} from "@/modules/whiteboards/realtime";

export function useBoardCollaboration(
  board: BoardRow,
  currentUser: { id: string; displayName: string },
  members: TaskMember[],
  onElement: (row: BoardElementRow) => void,
  onComment: (row: BoardCommentRow) => void,
  onReaction?: (row: BoardReactionRow) => void,
) {
  const [presence, setPresence] = useState(() =>
    includeLocalBoardPresence([], currentUser, members),
  );
  const [colors, setColors] = useState<BoardCollaboratorColorAssignments>(() =>
    allocateBoardCollaboratorColors(presence.map((row) => row.userId)),
  );
  const [connection, setConnection] =
    useState<CollaborationConnectionState>("CONNECTING");
  const [cursors, setCursors] = useState<BoardCursorUpdate[]>([]);
  const subscription = useRef<ReturnType<
    typeof subscribeToBoardCollaboration
  > | null>(null);
  useEffect(() => {
    if (!currentUser.id) return;
    const channel = subscribeToBoardCollaboration({
      boardId: board.id,
      organizationId: board.organization_id,
      currentUser,
      members,
      onElement,
      onComment,
      onReaction,
      onConnection: setConnection,
      onCursor: (update) =>
        setCursors((rows) => [
          ...rows.filter((row) => row.userId !== update.userId),
          ...(update.cursor ? [update] : []),
        ]),
      onPresence: (people) => {
        setPresence(people);
        setColors((before) =>
          allocateBoardCollaboratorColors(
            people.map((person) => person.userId),
            before,
          ),
        );
      },
    });
    subscription.current = channel;
    return () => {
      subscription.current = null;
      channel.unsubscribe();
    };
  }, [
    board.id,
    board.organization_id,
    currentUser,
    members,
    onComment,
    onElement,
    onReaction,
  ]);
  return {
    presence,
    colors,
    connection,
    cursors,
    updateCursor: (position: { x: number; y: number }) =>
      subscription.current?.updateCursor(position),
  };
}
