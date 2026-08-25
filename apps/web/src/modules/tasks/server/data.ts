import "server-only";

import type {
  TaskCommentRow,
  TaskMember,
  TaskRow,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface TaskWorkspaceData {
  comments: TaskCommentRow[];
  members: TaskMember[];
  tasks: TaskRow[];
}

export async function getTaskWorkspaceData(
  organizationId: string,
): Promise<TaskWorkspaceData> {
  const supabase = await createServerSupabaseClient();
  const [tasksResult, commentsResult, membersResult] = await Promise.all([
    supabase.from("tasks").select("*").eq("organization_id", organizationId),
    supabase
      .from("task_comments")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase.rpc("list_organization_task_members", {
      p_organization_id: organizationId,
    }),
  ]);

  if (tasksResult.error || commentsResult.error || membersResult.error) {
    throw new Error("Task workspace could not be loaded.");
  }

  return {
    comments: commentsResult.data ?? [],
    members: membersResult.data ?? [],
    tasks: tasksResult.data ?? [],
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
