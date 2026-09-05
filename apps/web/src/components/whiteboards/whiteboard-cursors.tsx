import { MousePointer2 } from "lucide-react";

import {
  boardPresenceColor,
  type BoardPresence,
} from "@/modules/whiteboards/collaboration";

export function WhiteboardCursors({
  currentUserId,
  presence,
  viewport,
}: {
  currentUserId: string;
  presence: BoardPresence[];
  viewport: { x: number; y: number; zoom: number };
}) {
  return (
    <div
      aria-label="Collaborator cursors"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {presence
        .filter((person) => person.userId !== currentUserId && person.cursor)
        .map((person) => {
          const color = boardPresenceColor(person.userId);
          const cursor = person.cursor!;
          return (
            <div
              className="absolute top-0 left-0 transition-transform duration-75 ease-linear motion-reduce:transition-none"
              data-testid={`collaborator-cursor-${person.userId}`}
              key={person.userId}
              style={{
                transform: `translate(${cursor.x * viewport.zoom + viewport.x}px, ${cursor.y * viewport.zoom + viewport.y}px)`,
              }}
            >
              <MousePointer2
                aria-hidden="true"
                className="size-5 fill-current drop-shadow-sm"
                style={{ color }}
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
