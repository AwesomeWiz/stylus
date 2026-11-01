import "server-only";

import type { TaskMember } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TASK_LIST_COLUMNS, type TaskListItem } from "../list";

export interface TaskWorkspaceData {
  members: TaskMember[];
  tasks: TaskListItem[];
}

export async function getTaskWorkspaceData(
  organizationId: string,
): Promise<TaskWorkspaceData> {
  const supabase = await createServerSupabaseClient();
  // Preserve complete client-side view/search/archive semantics. Each transport
  // page is bounded; product pagination of the total list is deferred. Explicit
  // paging also avoids silently treating Supabase's default row cap as complete.
  async function readList() {
    const tasks: TaskListItem[] = [];
    const pageSize = 1000;
    let afterId: string | null = null;
    for (;;) {
      let query = supabase
        .from("tasks")
        .select(TASK_LIST_COLUMNS)
        .eq("organization_id", organizationId)
        .order("id", { ascending: true });
      if (afterId) query = query.gt("id", afterId);
      const { data, error } = await query.limit(pageSize);
      if (error) throw new Error("Task workspace could not be loaded.");
      tasks.push(...(data ?? []));
      if ((data?.length ?? 0) < pageSize) return tasks;
      afterId = data!.at(-1)!.id;
    }
  }
  const [tasks, membersResult] = await Promise.all([
    readList(),
    supabase.rpc("list_organization_task_members", {
      p_organization_id: organizationId,
    }),
  ]);

  if (membersResult.error) {
    throw new Error("Task workspace could not be loaded.");
  }

  return {
    members: membersResult.data ?? [],
    tasks,
  };
}

export async function validateTaskAssignee(
  organizationId: string,
  assigneeId: string | null,
) {
  if (!assigneeId) return;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("list_organization_task_members", {
    p_organization_id: organizationId,
  });
  if (error || !data?.some((member) => member.member_user_id === assigneeId)) {
    throw new Error("The assignee must be an organization member.");
  }
}
