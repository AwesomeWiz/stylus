import type { TaskMember } from "@/lib/supabase/database.types";

export function taskLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function formatTaskDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function taskMemberName(members: TaskMember[], userId: string | null) {
  if (!userId) return "Unassigned";
  return (
    members.find((member) => member.member_user_id === userId)?.display_name ??
    "Unavailable member"
  );
}
