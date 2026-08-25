import "server-only";

import type { NotificationRow } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface NotificationSummary {
  items: NotificationRow[];
  unreadCount: number;
}

export async function getNotificationSummary(
  organizationId: string,
  userId: string,
): Promise<NotificationSummary> {
  const supabase = await createServerSupabaseClient();
  const [recent, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("recipient_id", userId)
      .is("read_at", null),
  ]);

  if (recent.error || unread.error) {
    throw new Error("Notifications could not be loaded.");
  }

  return { items: recent.data ?? [], unreadCount: unread.count ?? 0 };
}
