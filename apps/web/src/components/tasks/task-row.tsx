"use client";

import { Check, Circle, Clock3, UserRound } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { TaskMember, TaskRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { priorityVisual } from "@/components/ui/semantic-visuals";
import { setTaskCompletionAction } from "@/modules/tasks/actions";
import { isOverdue } from "@/modules/tasks/filters";
import { initialTaskActionState } from "@/modules/tasks/schemas";

import { formatTaskDate, taskLabel, taskMemberName } from "./presentation";

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
        "hover:bg-muted inline-flex size-8 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-50",
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

function CompletionControl({ task }: { task: TaskRow }) {
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
}: {
  canMutate: boolean;
  members: TaskMember[];
  now: Date;
  onOpen: () => void;
  task: TaskRow;
}) {
  const overdue = isOverdue(task, now);
  const priority = priorityVisual(task.priority);
  return (
    <li className="hover:bg-muted/45 flex min-w-0 items-start gap-2 border-b px-2 py-3 last:border-b-0 sm:items-center sm:px-3">
      {canMutate && task.status !== "CANCELLED" ? (
        <CompletionControl task={task} />
      ) : (
        <span className="inline-flex size-8 shrink-0 items-center justify-center">
          <Circle aria-hidden="true" className="text-muted-foreground size-5" />
        </span>
      )}
      <button
        className="min-w-0 flex-1 text-left"
        onClick={onOpen}
        type="button"
      >
        <span
          className={cn(
            "block truncate text-sm font-medium",
            task.status === "COMPLETED" && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
        <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:hidden">
          <span>{taskMemberName(members, task.assignee_id)}</span>
          {task.due_at ? <span>{formatTaskDate(task.due_at)}</span> : null}
        </span>
      </button>
      <span className="text-muted-foreground hidden w-36 items-center gap-1.5 truncate text-xs sm:flex">
        <UserRound aria-hidden="true" className="size-3.5 shrink-0" />
        {taskMemberName(members, task.assignee_id)}
      </span>
      <span
        className={cn(
          "hidden w-40 items-center gap-1.5 text-xs md:flex",
          overdue ? "text-destructive font-medium" : "text-muted-foreground",
        )}
      >
        <Clock3 aria-hidden="true" className="size-3.5" />
        {task.due_at ? formatTaskDate(task.due_at) : "No deadline"}
      </span>
      <span
        className={cn(
          "hidden w-20 rounded-sm px-1.5 py-0.5 text-center text-xs font-medium lg:block",
          priority
            ? [priority.surface, priority.text]
            : "bg-muted text-muted-foreground",
        )}
      >
        {taskLabel(task.priority)}
      </span>
    </li>
  );
}
