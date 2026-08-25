import "server-only";

import type {
  ActivityEventRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface ActivityHistoryData {
  events: ActivityEventRow[];
  members: TaskMember[];
}

export async function getActivityHistory(
  organizationId: string,
): Promise<ActivityHistoryData> {
  const supabase = await createServerSupabaseClient();
  const [events, members] = await Promise.all([
    supabase
      .from("activity_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(100),
    supabase.rpc("list_organization_task_members", {
      p_organization_id: organizationId,
    }),
  ]);

  if (events.error || members.error) {
    throw new Error("Activity history could not be loaded.");
  }

  return { events: events.data ?? [], members: members.data ?? [] };
}
