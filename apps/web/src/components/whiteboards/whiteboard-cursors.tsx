import { MousePointer2 } from "lucide-react";

import {
  boardPresenceColor,
  flowPointToViewport,
  type BoardCursorUpdate,
  type BoardPresence,
} from "@/modules/whiteboards/collaboration";

export function WhiteboardCursors({
  currentUserId,
  cursors,
  presence,
  viewport,
}: {
  currentUserId: string;
  cursors: BoardCursorUpdate[];
  presence: BoardPresence[];
  viewport: { x: number; y: number; zoom: number };
}) {
  const people = new Map(presence.map((person) => [person.userId, person]));
  return (
    <div
      aria-label="Collaborator cursors"
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      {cursors
        .filter((cursor) => cursor.userId !== currentUserId && cursor.cursor)
        .map((cursor) => {
          const person = people.get(cursor.userId);
          if (!person || !cursor.cursor) return null;
          const color = boardPresenceColor(cursor.userId);
          const position = flowPointToViewport(cursor.cursor, viewport);
          return (
            <div
              className="absolute top-0 left-0 transition-transform duration-75 ease-linear motion-reduce:transition-none"
              data-testid={`collaborator-cursor-${cursor.userId}`}
              key={cursor.userId}
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
              }}
            >
              <MousePointer2
                aria-hidden="true"
                className="size-5 fill-current"
                style={{
                  color,
                  filter:
                    "drop-shadow(0 0 1px var(--background)) drop-shadow(0 1px 1px rgb(0 0 0 / 0.35))",
                }}
              />
              <span
                className="-mt-1 ml-3 block max-w-32 truncate rounded-sm px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm"
                style={{ backgroundColor: color }}
              >
                {person.displayName}
              </span>
            </div>
          );
        })}
    </div>
  );
}
