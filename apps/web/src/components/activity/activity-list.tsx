import {
  CheckCircle2,
  CircleDot,
  MessageSquare,
  Pencil,
  RotateCcw,
  UserRoundCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import type {
  ActivityEventRow,
  ActivityEventType,
  TaskMember,
} from "@/lib/supabase/database.types";

const icons: Record<ActivityEventType, LucideIcon> = {
  BOARD_COMMENTED: MessageSquare,
  TASK_ASSIGNED: UserRoundCheck,
  TASK_CANCELLED: XCircle,
  TASK_COMMENTED: MessageSquare,
  TASK_COMPLETED: CheckCircle2,
  TASK_CREATED: CircleDot,
  TASK_REOPENED: RotateCcw,
  TASK_UPDATED: Pencil,
};

function metadataText(event: ActivityEventRow, key: string) {
  const value = event.metadata[key];
  return typeof value === "string" ? value : null;
}

function memberName(members: TaskMember[], userId: string | null) {
  if (!userId) return "unassigned";
  return (
    members.find((member) => member.member_user_id === userId)?.display_name ??
    "a former teammate"
  );
}

export function activityDescription(
  event: ActivityEventRow,
  members: TaskMember[],
) {
  const actor = memberName(members, event.actor_id);
  const title = metadataText(event, "title") ?? "a task";
  const descriptions: Record<ActivityEventType, string> = {
    BOARD_COMMENTED: `${actor} commented on board “${title}”`,
    TASK_ASSIGNED: `${actor} assigned “${title}” to ${memberName(members, metadataText(event, "to_assignee_id"))}`,
    TASK_CANCELLED: `${actor} cancelled “${title}”`,
    TASK_COMMENTED: `${actor} commented on “${title}”`,
    TASK_COMPLETED: `${actor} completed “${title}”`,
    TASK_CREATED: `${actor} created “${title}”`,
    TASK_REOPENED: `${actor} reopened “${title}”`,
    TASK_UPDATED: `${actor} updated “${title}”`,
  };
  return descriptions[event.event_type];
}

function activityTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ActivityList({
  events,
  members,
}: {
  events: ActivityEventRow[];
  members: TaskMember[];
}) {
  if (!events.length) {
    return (
      <div className="mt-6 border-y px-4 py-14 text-center">
        <p className="text-sm font-medium">No activity yet.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Meaningful task and comment changes will appear here.
        </p>
      </div>
    );
  }

  return (
    <ol className="mt-6 divide-y border-y">
      {events.map((event) => {
        const Icon = icons[event.event_type];
        return (
          <li className="flex gap-3 py-3.5" key={event.id}>
            <span className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <Link
                className="hover:underline"
                href={
                  event.entity_type === "BOARD"
                    ? `/whiteboards/${encodeURIComponent(event.entity_id)}`
                    : `/tasks?view=all&task=${encodeURIComponent(event.entity_id)}`
                }
              >
                <span className="text-sm">
                  {activityDescription(event, members)}
                </span>
              </Link>
              <time
                className="text-muted-foreground mt-1 block text-xs"
                dateTime={event.created_at}
              >
                {activityTime(event.created_at)}
              </time>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
