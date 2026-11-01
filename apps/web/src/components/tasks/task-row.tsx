"use client";

import { Check, Circle, Clock3, UserRound } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { TaskMember } from "@/lib/supabase/database.types";
import type { TaskListItem } from "@/modules/tasks/list";
import { ViewerLocalDateTime } from "@/components/ui/viewer-local-date-time";
import { cn } from "@/lib/utils";
import { setTaskCompletionAction } from "@/modules/tasks/actions";
import { isOverdue } from "@/modules/tasks/filters";
import { initialTaskActionState } from "@/modules/tasks/schemas";

import { taskLabel, taskMemberName } from "./presentation";

function CompletionButton({
  completed,
  title,
}: {
  completed: boolean;
  title: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      aria-label={completed ? `Reopen ${title}` : `Complete ${title}`}
      className={cn(
        "hover:bg-muted inline-flex size-11 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-50",
        completed ? "text-success" : "text-muted-foreground",
      )}
      disabled={pending}
      type="submit"
    >
      {completed ? (
        <span className="border-success bg-success/10 inline-flex size-5 items-center justify-center rounded-full border">
          <Check aria-hidden="true" className="size-3" />
        </span>
      ) : (
        <Circle aria-hidden="true" className="size-5" />
      )}
    </button>
  );
}

function CompletionControl({ task }: { task: TaskListItem }) {
  const [state, action] = useActionState(
    setTaskCompletionAction,
    initialTaskActionState,
  );
  const completed = task.status === "COMPLETED";
  return (
    <form action={action} className="shrink-0">
      <input name="taskId" type="hidden" value={task.id} />
      <input name="completed" type="hidden" value={String(!completed)} />
      <CompletionButton completed={completed} title={task.title} />
      {state.status === "error" ? (
        <span className="sr-only" role="alert">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

export function TaskRowItem({
  canMutate,
  members,
  now,
  onOpen,
  task,
  selected,
}: {
  canMutate: boolean;
  members: TaskMember[];
  now: Date;
  onOpen: () => void;
  task: TaskListItem;
  selected: boolean;
}) {
  const overdue = isOverdue(task, now);
  return (
    <li
      className={cn(
        "hover:bg-muted/45 flex min-w-0 items-start gap-1 border-b py-1.5 last:border-b-0",
        selected && "bg-primary/5",
      )}
    >
      {canMutate && task.status !== "CANCELLED" ? (
        <CompletionControl task={task} />
      ) : (
        <span className="inline-flex size-11 shrink-0 items-center justify-center">
          <Circle aria-hidden="true" className="text-muted-foreground size-5" />
        </span>
      )}
      <button
        aria-current={selected ? "true" : undefined}
        aria-haspopup="dialog"
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-1.5 py-1 pr-2 text-left"
        data-task-open={task.id}
        onClick={onOpen}
        type="button"
      >
        <span
          className={cn(
            "block max-w-full truncate text-sm font-medium",
            task.status === "COMPLETED" && "line-through",
          )}
        >
          {task.title}
        </span>
        <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <UserRound aria-hidden="true" className="size-3" />
            {taskMemberName(members, task.assignee_id)}
          </span>
          <span>{taskLabel(task.status)}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1",
              overdue && "text-destructive font-medium",
            )}
          >
            <Clock3 aria-hidden="true" className="size-3 shrink-0" />
            {overdue ? "Overdue · " : ""}
            {task.due_at ? (
              <ViewerLocalDateTime value={task.due_at} />
            ) : task.scheduled_at ? (
              <>
                Scheduled · <ViewerLocalDateTime value={task.scheduled_at} />
              </>
            ) : (
              "No deadline"
            )}
          </span>
          <span
            className={cn(
              (task.priority === "HIGH" || task.priority === "URGENT") &&
                "text-foreground font-medium",
            )}
          >
            {taskLabel(task.priority)} priority
          </span>
        </span>
      </button>
    </li>
  );
}
