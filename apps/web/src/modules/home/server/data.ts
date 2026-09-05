import "server-only";

import type {
  ActivityEventRow,
  TaskMember,
  TaskRow,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface HomeCoreData {
  activity: ActivityEventRow[];
  members: TaskMember[];
  tasks: TaskRow[];
}

export async function getHomeCoreData(
  organizationId: string,
): Promise<HomeCoreData> {
  const supabase = await createServerSupabaseClient();
  const [tasks, activity, members] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("organization_id", organizationId)
      .in("status", ["TODO", "IN_PROGRESS"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("activity_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(6),
    supabase.rpc("list_organization_task_members", {
      p_organization_id: organizationId,
    }),
  ]);

  if (tasks.error || activity.error || members.error) {
    throw new Error("Home dashboard could not be loaded.");
  }

  return {
    activity: activity.data ?? [],
    members: members.data ?? [],
    tasks: tasks.data ?? [],
  };
}
