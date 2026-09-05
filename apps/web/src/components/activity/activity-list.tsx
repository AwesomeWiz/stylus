import {
  Archive,
  CheckCircle2,
  CircleDot,
  FilePlus2,
  MessageSquare,
  Pencil,
  RotateCcw,
  UserRoundCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import type {
  ActivityEventRow,
  ActivityEventType,
  TaskMember,
} from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const icons: Record<ActivityEventType, LucideIcon> = {
  BOARD_COMMENTED: MessageSquare,
  MEMORY_ARCHIVED: Archive,
  MEMORY_CREATED: FilePlus2,
  MEMORY_RESTORED: RotateCcw,
  MEMORY_UPDATED: Pencil,
  MARKETING_RECORD_ARCHIVED: Archive,
  MARKETING_RECORD_CREATED: FilePlus2,
  MARKETING_RECORD_RESTORED: RotateCcw,
  MARKETING_RECORD_UPDATED: Pencil,
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

function activityIconStyle(type: ActivityEventType) {
  if (type === "TASK_COMPLETED" || type === "MEMORY_RESTORED")
    return "bg-success-subtle text-success";
  if (type === "TASK_CANCELLED") return "bg-destructive/10 text-destructive";
  if (type.includes("ARCHIVED")) return "bg-warning-subtle text-warning";
  if (type.includes("CREATED") || type === "TASK_ASSIGNED")
    return "bg-primary-subtle text-accent-foreground";
  return "bg-info-subtle text-info";
}

export function activityDescription(
  event: ActivityEventRow,
  members: TaskMember[],
) {
  const actor = memberName(members, event.actor_id);
  const title = metadataText(event, "title") ?? "a task";
  const descriptions: Record<ActivityEventType, string> = {
    MARKETING_RECORD_ARCHIVED: `${actor} archived Marketing ${metadataText(event, "record_type") ?? "record"} “${title}”`,
    MARKETING_RECORD_CREATED: `${actor} created Marketing ${metadataText(event, "record_type") ?? "record"} “${title}”`,
    MARKETING_RECORD_RESTORED: `${actor} restored Marketing ${metadataText(event, "record_type") ?? "record"} “${title}”`,
    MARKETING_RECORD_UPDATED: `${actor} updated Marketing ${metadataText(event, "record_type") ?? "record"} “${title}”`,
    BOARD_COMMENTED: `${actor} commented on board “${title}”`,
    MEMORY_ARCHIVED: `${actor} archived company memory “${title}”`,
    MEMORY_CREATED: `${actor} added company memory “${title}”`,
    MEMORY_RESTORED: `${actor} restored company memory “${title}”`,
    MEMORY_UPDATED: `${actor} updated company memory “${title}”`,
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
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                activityIconStyle(event.event_type),
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <Link
                className="hover:underline"
                href={
                  (event.entity_type === "MARKETING"
                    ? `/apps/marketing/${marketingPath(metadataText(event, "record_type"))}`
                    : event.entity_type === "KNOWLEDGE"
                      ? "/memory"
                      : event.entity_type === "BOARD"
                        ? `/whiteboards/${encodeURIComponent(event.entity_id)}`
                        : `/tasks?view=all&task=${encodeURIComponent(event.entity_id)}`) as Route
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

function marketingPath(recordType: string | null) {
  return (
    (
      {
        campaign: "campaigns",
        competitor: "competitors",
        "creative brief": "creative-briefs",
        "reel idea": "reel-ideas",
        "research note": "research",
      } as Record<string, string>
    )[recordType ?? ""] ?? ""
  );
}
