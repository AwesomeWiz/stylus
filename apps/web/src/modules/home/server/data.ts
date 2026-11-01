import "server-only";

import type {
  ActivityEventRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TASK_LIST_COLUMNS, type TaskListItem } from "@/modules/tasks/list";
import { DUE_SOON_MS, HOME_ATTENTION_LIMIT, homeAttention } from "../attention";

export interface HomeCoreData {
  activity: ActivityEventRow[];
  members: TaskMember[];
  tasks: TaskListItem[];
}

export async function getHomeCoreData(
  organizationId: string,
  currentUserId: string,
  now: Date,
): Promise<HomeCoreData> {
  const supabase = await createServerSupabaseClient();
  const taskQuery = () =>
    supabase
      .from("tasks")
      .select(TASK_LIST_COLUMNS)
      .eq("organization_id", organizationId)
      .in("status", ["TODO", "IN_PROGRESS"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(HOME_ATTENTION_LIMIT);
  // Six candidates in each priority arm are sufficient for the final top six,
  // including after deduplication: every earlier arm contains higher ranks.
  const [overdue, dueSoon, assigned, active, activity, members] =
    await Promise.all([
      taskQuery().lte("due_at", now.toISOString()),
      taskQuery()
        .gt("due_at", now.toISOString())
        .lte("due_at", new Date(now.getTime() + DUE_SOON_MS).toISOString()),
      taskQuery().eq("assignee_id", currentUserId),
      taskQuery(),
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

  if (
    [overdue, dueSoon, assigned, active, activity, members].some(
      (result) => result.error,
    )
  ) {
    throw new Error("Home dashboard could not be loaded.");
  }

  return {
    activity: activity.data ?? [],
    members: members.data ?? [],
    tasks: homeAttention(
      [
        ...(overdue.data ?? []),
        ...(dueSoon.data ?? []),
        ...(assigned.data ?? []),
        ...(active.data ?? []),
      ],
      currentUserId,
      now,
    ),
  };
}
