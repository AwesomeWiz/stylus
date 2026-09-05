import { Users, WifiOff } from "lucide-react";

import {
  boardPresenceColor,
  boardPresenceInitials,
  type BoardPresence,
} from "@/modules/whiteboards/collaboration";
import type { CollaborationConnectionState } from "@/modules/whiteboards/realtime";

const VISIBLE_COLLABORATORS = 3;

export function WhiteboardCollaborators({
  connection,
  currentUserId,
  presence,
}: {
  connection: CollaborationConnectionState;
  currentUserId: string;
  presence: BoardPresence[];
}) {
  const visible = presence.slice(0, VISIBLE_COLLABORATORS);
  const overflow = Math.max(0, presence.length - visible.length);
  const names = presence
    .map(
      (person) =>
        `${person.displayName}${person.userId === currentUserId ? " · You" : ""}`,
    )
    .join("\n");

  return (
    <div
      aria-label={`${presence.length} ${presence.length === 1 ? "person" : "people"} here`}
      className="flex items-center gap-2"
      title={names}
    >
      <div className="flex -space-x-1.5" role="list">
        {visible.map((person) => (
          <span
            aria-label={`${person.displayName}${person.userId === currentUserId ? ", you" : ""}`}
            className="border-background relative inline-flex size-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold shadow-sm"
            data-testid={`collaborator-avatar-${person.userId}`}
            key={person.userId}
            role="listitem"
            style={{
              backgroundColor: boardPresenceColor(person.userId),
              color: "var(--collaborator-foreground)",
            }}
            title={`${person.displayName}${person.userId === currentUserId ? " · You" : ""}`}
          >
            {boardPresenceInitials(person.displayName)}
          </span>
        ))}
        {overflow ? (
          <span
            aria-label={`${overflow} more collaborators`}
            className="bg-muted text-muted-foreground border-background relative inline-flex size-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold"
            role="listitem"
          >
            +{overflow}
          </span>
        ) : null}
      </div>
      <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
        {connection === "DEGRADED" ? (
          <WifiOff aria-hidden="true" className="text-destructive size-4" />
        ) : (
          <Users aria-hidden="true" className="size-4" />
        )}
        {connection === "DEGRADED"
          ? "Offline collaboration"
          : `${presence.length} ${presence.length === 1 ? "person" : "people"} here`}
      </span>
    </div>
  );
}
