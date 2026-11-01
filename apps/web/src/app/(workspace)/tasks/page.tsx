import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { TaskWorkspace } from "@/components/tasks/task-workspace";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/database.types";
import { canMutateTasks } from "@/modules/tasks/authorization";
import {
  filterTasks,
  nextActiveDeadline,
  type TaskFilters,
  type TaskView,
  taskViewValues,
} from "@/modules/tasks/filters";
import { taskPriorityValues, taskStatusValues } from "@/modules/tasks/schemas";
import { getTaskWorkspaceData } from "@/modules/tasks/server/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parseFilters(params: Awaited<SearchParams>): TaskFilters {
  const requestedView = single(params.view);
  const requestedPriority = single(params.priority);
  const requestedStatus = single(params.status);
  const query = single(params.query)?.trim().slice(0, 100);
  const assigneeId = single(params.assignee)?.slice(0, 64);
  const selectedTaskId = single(params.task)?.slice(0, 64);
  return {
    assigneeId,
    priority: taskPriorityValues.includes(requestedPriority as TaskPriority)
      ? (requestedPriority as TaskPriority)
      : undefined,
    query,
    status: taskStatusValues.includes(requestedStatus as TaskStatus)
      ? (requestedStatus as TaskStatus)
      : undefined,
    selectedTaskId,
    view: taskViewValues.includes(requestedView as TaskView)
      ? (requestedView as TaskView)
      : "my",
  };
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await getWorkspaceContext();

  const [workspace, params] = await Promise.all([
    getTaskWorkspaceData(context.organization.id),
    searchParams,
  ]);
  const now = new Date();
  const filters = parseFilters(params);
  const tasks = filterTasks(workspace.tasks, filters, context.user.id, now);
  const nextDeadlineIso = nextActiveDeadline(workspace.tasks, now);

  return (
    <TaskWorkspace
      canMutate={canMutateTasks(context.membership.role)}
      comments={workspace.comments}
      currentUserId={context.user.id}
      filters={filters}
      initiallyCreating={single(params.create) === "true"}
      members={workspace.members}
      nextDeadlineIso={nextDeadlineIso}
      nowIso={now.toISOString()}
      selectedTaskId={filters.selectedTaskId}
      tasks={tasks}
    />
  );
}
