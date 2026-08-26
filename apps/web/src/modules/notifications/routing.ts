import type { NotificationRow } from "@/lib/supabase/database.types";

export function notificationDestination(
  notification: Pick<NotificationRow, "entity_id" | "entity_type">,
) {
  if (notification.entity_type === "TASK" && notification.entity_id) {
    return `/tasks?view=all&task=${encodeURIComponent(notification.entity_id)}`;
  }
  if (notification.entity_type === "BOARD" && notification.entity_id) {
    return `/whiteboards/${encodeURIComponent(notification.entity_id)}`;
  }
  return null;
}
