"use client";

import { CalendarDays, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import type {
  TaskCommentRow,
  TaskMember,
  TaskRow,
} from "@/lib/supabase/database.types";
import type { TaskFilters, TaskView } from "@/modules/tasks/filters";

import { formatTaskDate, taskMemberName } from "./presentation";
import { ReadOnlyTask, TaskDiscussion } from "./task-detail";
import { TaskForm } from "./task-form";
import { TaskRowItem } from "./task-row";
import { TaskToolbar } from "./task-toolbar";

interface TaskWorkspaceProps {
  canMutate: boolean;
  comments: TaskCommentRow[];
  currentUserId: string;
  filters: TaskFilters;
  members: TaskMember[];
  nextDeadlineIso: string | null;
  nowIso: string;
  tasks: TaskRow[];
}

function EmptyState({
  canMutate,
  onCreate,
  view,
}: {
  canMutate: boolean;
  onCreate: () => void;
  view: TaskView;
}) {
  const messages: Record<TaskView, string> = {
    all: "No tasks match these filters.",
    archive: "No completed tasks have reached the archive yet.",
    calendar: "No scheduled tasks or deadlines to show.",
    completed: "No recently completed tasks.",
    my: "No tasks assigned to you.",
    overdue: "Nothing overdue.",
    upcoming: "No upcoming work.",
  };
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border-y px-4 text-center">
      <p className="text-sm font-medium">{messages[view]}</p>
      <p className="text-muted-foreground mt-1 text-sm">
        {canMutate
          ? "Create a task when the team has a new commitment."
          : "There is nothing to review in this view."}
      </p>
      {canMutate ? (
        <Button className="mt-4" onClick={onCreate} variant="secondary">
          <Plus aria-hidden="true" className="size-4" /> Create task
        </Button>
      ) : null}
    </div>
  );
}

export function TaskWorkspace({
  canMutate,
  comments,
  currentUserId,
  filters,
  members,
  nextDeadlineIso,
  nowIso,
  tasks,
}: TaskWorkspaceProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeDetail = useCallback(() => setSelectedTask(null), []);
  const now = new Date(nowIso);

  useEffect(() => {
    if (!nextDeadlineIso) return;
    const delay = Math.max(0, Date.parse(nextDeadlineIso) - Date.now());
    const timer = window.setTimeout(() => router.refresh(), delay);
    return () => window.clearTimeout(timer);
  }, [nextDeadlineIso, router]);

  return (
    <>
      <PageHeader
        action={
          canMutate ? (
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" className="size-4" /> Create task
            </Button>
          ) : undefined
        }
        description="Coordinate ownership, schedules, deadlines and day-to-day commitments."
        title="Tasks"
      />
      <TaskToolbar filters={filters} members={members} />

      <div className="bg-card overflow-hidden rounded-md border">
        <div className="text-muted-foreground hidden border-b px-3 py-2 text-[11px] font-semibold tracking-wide uppercase sm:flex">
          <span className="w-10" />
          <span className="min-w-0 flex-1">Task</span>
          <span className="w-36">Assignee</span>
          <span className="hidden w-40 md:block">Deadline</span>
          <span className="hidden w-20 text-right lg:block">Priority</span>
        </div>
        {tasks.length ? (
          <ul>
            {tasks.map((task) => (
              <TaskRowItem
                canMutate={canMutate}
                key={task.id}
                members={members}
                now={now}
                onOpen={() => setSelectedTask(task)}
                task={task}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            canMutate={canMutate}
            onCreate={() => setCreating(true)}
            view={filters.view}
          />
        )}
      </div>

      <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
        <CalendarDays aria-hidden="true" className="size-3.5" />
        Dates are shown in your local time. Recently completed work remains
        visible for 14 days before appearing in Archive.
      </p>

      <Dialog
        description="Capture an operational commitment for your team."
        onOpenChange={setCreating}
        open={creating}
        title="Create task"
      >
        <TaskForm
          members={members}
          onCancel={closeCreate}
          onSaved={closeCreate}
        />
      </Dialog>

      {selectedTask ? (
        <Dialog
          description={`Created ${formatTaskDate(selectedTask.created_at)} by ${taskMemberName(members, selectedTask.created_by)}.`}
          onOpenChange={(open) => !open && closeDetail()}
          open
          title={selectedTask.title}
        >
          {canMutate ? (
            <TaskForm
              members={members}
              onCancel={closeDetail}
              onSaved={closeDetail}
              task={selectedTask}
            />
          ) : (
            <ReadOnlyTask members={members} task={selectedTask} />
          )}
          <TaskDiscussion
            canMutate={canMutate}
            comments={comments}
            members={members}
            taskId={selectedTask.id}
          />
        </Dialog>
      ) : null}

      <span className="sr-only">
        Signed in as {taskMemberName(members, currentUserId)}
      </span>
    </>
  );
}
