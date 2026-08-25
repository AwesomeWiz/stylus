import type { Route } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { TaskWorkspace } from "@/components/tasks/task-workspace";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/database.types";
import { logoutAction } from "@/modules/auth/actions";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getOnboardingData } from "@/modules/onboarding/server/data";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { canMutateTasks } from "@/modules/tasks/authorization";
import {
  filterTasks,
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
  return {
    assigneeId,
    priority: taskPriorityValues.includes(requestedPriority as TaskPriority)
      ? (requestedPriority as TaskPriority)
      : undefined,
    query,
    status: taskStatusValues.includes(requestedStatus as TaskStatus)
      ? (requestedStatus as TaskStatus)
      : undefined,
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
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");

  const onboarding = await getOnboardingData(context.organization.id);
  const onboardingDecision = getWorkspaceRouteDecision({
    completedAt: onboarding.progress?.completed_at ?? null,
    currentStep: onboarding.progress?.current_step ?? 1,
    role: context.membership.role,
  });
  if (onboardingDecision) redirect(onboardingDecision as Route);

  const [workspace, params] = await Promise.all([
    getTaskWorkspaceData(context.organization.id),
    searchParams,
  ]);
  const now = new Date();
  const filters = parseFilters(params);
  const tasks = filterTasks(workspace.tasks, filters, context.user.id, now);

  return (
    <AppShell
      activePath="/tasks"
      identity={{
        displayName: context.user.displayName,
        email: context.user.email,
      }}
      logoutAction={logoutAction}
      organization={{
        name: context.organization.name,
        role: context.membership.role,
      }}
    >
      <TaskWorkspace
        canMutate={canMutateTasks(context.membership.role)}
        comments={workspace.comments}
        currentUserId={context.user.id}
        filters={filters}
        members={workspace.members}
        nowIso={now.toISOString()}
        tasks={tasks}
      />
    </AppShell>
  );
}
