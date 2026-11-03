"use client";

import { CalendarDays, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { TaskMember } from "@/lib/supabase/database.types";
import type { TaskFilters, TaskView } from "@/modules/tasks/filters";
import type { TaskListItem } from "@/modules/tasks/list";
import { taskHref } from "@/modules/tasks/url-state";
import { taskMemberName } from "./presentation";
import { TaskForm } from "./task-form";
import { TaskPanel } from "./task-panel";
import { TaskRowItem } from "./task-row";
import { selectTaskQuery, useTaskQuery } from "./task-selection";
import { TaskToolbar } from "./task-toolbar";

interface TaskWorkspaceProps {
  canMutate: boolean;
  currentUserId: string;
  filters: TaskFilters;
  initialQuery: string;
  members: TaskMember[];
  nextDeadlineIso: string | null;
  nowIso: string;
  organizationId: string;
  tasks: TaskListItem[];
}
const emptyMessages: Record<TaskView, string> = {
  all: "No tasks yet.",
  archive: "No completed tasks have reached the archive yet.",
  calendar: "No scheduled tasks or deadlines to show.",
  completed: "No recently completed tasks.",
  my: "No tasks assigned to you.",
  overdue: "Nothing overdue.",
  upcoming: "No upcoming work.",
};

export function TaskWorkspace({
  canMutate,
  currentUserId,
  filters,
  initialQuery,
  members,
  nextDeadlineIso,
  nowIso,
  organizationId,
  tasks,
}: TaskWorkspaceProps) {
  const router = useRouter();
  const query = useTaskQuery(initialQuery);
  const params = new URLSearchParams(query);
  const selectedTaskId = params.get("task");
  const creating = params.get("create") === "true" && canMutate;
  const closeCreate = useCallback(() => {
    selectTaskQuery({ create: null });
    requestAnimationFrame(() =>
      document.getElementById("create-task")?.focus(),
    );
  }, []);
  const refresh = useCallback(() => router.refresh(), [router]);
  const closeDetail = useCallback(() => {
    selectTaskQuery({ task: null });
  }, []);
  const created = useCallback(() => {
    closeCreate();
    router.refresh();
  }, [closeCreate, router]);
  const now = new Date(nowIso);
  const hasFilters = Boolean(
    filters.query || filters.assigneeId || filters.status || filters.priority,
  );
  useEffect(() => {
    if (!nextDeadlineIso) return;
    const delay = Math.min(
      2_147_483_647,
      Math.max(0, Date.parse(nextDeadlineIso) - Date.now()),
    );
    const timer = window.setTimeout(() => router.refresh(), delay);
    return () => window.clearTimeout(timer);
  }, [nextDeadlineIso, router]);
  return (
    <div className={selectedTaskId ? "min-[1200px]:pr-[480px]" : undefined}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight outline-none"
            id="tasks-heading"
            tabIndex={-1}
          >
            Tasks
          </h1>
          {!canMutate ? (
            <p className="text-muted-foreground mt-1 text-sm">
              You have read-only access.
            </p>
          ) : null}
        </div>
        {canMutate ? (
          <Button
            id="create-task"
            onClick={() => selectTaskQuery({ create: "true" })}
          >
            <Plus aria-hidden="true" className="size-4" /> Create task
          </Button>
        ) : null}
      </header>
      <TaskToolbar filters={filters} members={members} query={query} />
      <div className="border-y">
        {tasks.length ? (
          <ul aria-label="Tasks">
            {tasks.map((task) => (
              <TaskRowItem
                canMutate={canMutate}
                key={task.id}
                members={members}
                now={now}
                onOpen={() => selectTaskQuery({ task: task.id, create: null })}
                selected={selectedTaskId === task.id}
                task={task}
              />
            ))}
          </ul>
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium">
              {hasFilters ? "No matching tasks." : emptyMessages[filters.view]}
            </p>
            {hasFilters ? (
              <Button
                className="mt-3"
                onClick={() =>
                  router.push(
                    taskHref(query, {
                      query: null,
                      assignee: null,
                      status: null,
                      priority: null,
                    }),
                    { scroll: false },
                  )
                }
                variant="secondary"
              >
                Clear filters
              </Button>
            ) : (
              <>
                <p className="text-muted-foreground mt-1 text-sm">
                  {canMutate
                    ? "Use tasks to give team commitments an owner and a deadline."
                    : "There is nothing to review in this view."}
                </p>
                {canMutate ? (
                  <Button
                    className="mt-4"
                    onClick={() => selectTaskQuery({ create: "true" })}
                    variant="secondary"
                  >
                    Create task
                  </Button>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-muted-foreground mt-3 flex items-start gap-1.5 text-xs">
        <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
        Dates use your local time. Completed work stays in Completed for 14
        days, then appears in Archive.
      </p>
      <Dialog
        description="Capture an operational commitment for your team."
        onOpenChange={(open) => {
          if (!open) closeCreate();
        }}
        open={creating}
        title="Create task"
      >
        <TaskForm members={members} onCancel={closeCreate} onSaved={created} />
      </Dialog>
      {selectedTaskId ? (
        <TaskPanel
          key={`${organizationId}:${selectedTaskId}`}
          members={members}
          onClose={closeDetail}
          onSaved={refresh}
          organizationId={organizationId}
          taskId={selectedTaskId}
        />
      ) : null}
      <span className="sr-only">
        Signed in as {taskMemberName(members, currentUserId)}
      </span>
    </div>
  );
}
