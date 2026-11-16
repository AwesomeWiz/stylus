"use client";

import { MessageSquare } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ViewerLocalDateTime } from "@/components/ui/viewer-local-date-time";
import type {
  TaskCommentRow,
  TaskMember,
  TaskRow,
} from "@/lib/supabase/database.types";
import { addTaskCommentAction } from "@/modules/tasks/actions";
import { initialTaskActionState } from "@/modules/tasks/schemas";

import { taskLabel, taskMemberName } from "./presentation";

function CommentComposer({
  taskId,
  onPosted,
}: {
  taskId: string;
  onPosted: () => void;
}) {
  const [state, action] = useActionState(
    addTaskCommentAction,
    initialTaskActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      onPosted();
    }
  }, [state, onPosted]);
  return (
    <form action={action} className="mt-4" ref={formRef}>
      <input name="taskId" type="hidden" value={taskId} />
      <label className="text-sm font-medium" htmlFor={`comment-${taskId}`}>
        Add context
      </label>
      <div className="mt-1.5 flex gap-2">
        <Input
          id={`comment-${taskId}`}
          maxLength={2000}
          name="body"
          placeholder="Write a comment…"
        />
        <SubmitButton pendingLabel="Posting…">Post</SubmitButton>
      </div>
      {state.fieldErrors?.body?.[0] || state.message ? (
        <p className="text-destructive mt-1 text-xs" role="alert">
          {state.fieldErrors?.body?.[0] ?? state.message}
        </p>
      ) : null}
    </form>
  );
}

export function TaskDiscussion({
  canMutate,
  comments,
  members,
  taskId,
  onPosted,
}: {
  canMutate: boolean;
  comments: TaskCommentRow[];
  members: TaskMember[];
  taskId: string;
  onPosted: () => void;
}) {
  const taskComments = comments.filter((comment) => comment.task_id === taskId);
  return (
    <section className="border-t px-5 py-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquare aria-hidden="true" className="size-4" /> Discussion
      </h3>
      {taskComments.length ? (
        <ul className="mt-3 space-y-3">
          {taskComments.map((comment) => (
            <li className="text-sm" key={comment.id}>
              <p className="font-medium">
                {taskMemberName(members, comment.created_by)}
              </p>
              <p className="mt-0.5 [overflow-wrap:anywhere] whitespace-pre-wrap">
                {comment.body}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                <ViewerLocalDateTime value={comment.created_at} />
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-2 text-sm">No comments yet.</p>
      )}
      {canMutate ? (
        <CommentComposer onPosted={onPosted} taskId={taskId} />
      ) : null}
    </section>
  );
}

export function ReadOnlyTask({
  members,
  task,
}: {
  members: TaskMember[];
  task: TaskRow;
}) {
  return (
    <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground text-xs">Description</dt>
        <dd className="mt-1 [overflow-wrap:anywhere] whitespace-pre-wrap">
          {task.description || "No description"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Status</dt>
        <dd className="mt-1">{taskLabel(task.status)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Priority</dt>
        <dd className="mt-1">{taskLabel(task.priority)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Assignee</dt>
        <dd className="mt-1">{taskMemberName(members, task.assignee_id)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Due</dt>
        <dd className="mt-1">
          {task.due_at ? (
            <ViewerLocalDateTime value={task.due_at} />
          ) : (
            "No deadline"
          )}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Scheduled</dt>
        <dd className="mt-1">
          {task.scheduled_at ? (
            <ViewerLocalDateTime value={task.scheduled_at} />
          ) : (
            "Not scheduled"
          )}
        </dd>
      </div>
    </dl>
  );
}
