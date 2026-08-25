"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { TaskMember, TaskRow } from "@/lib/supabase/database.types";
import { createTaskAction, updateTaskAction } from "@/modules/tasks/actions";
import {
  isoToLocalDateTime,
  localDateTimeToIso,
} from "@/modules/tasks/datetime";
import {
  initialTaskActionState,
  taskPriorityValues,
  taskStatusValues,
} from "@/modules/tasks/schemas";

interface TaskFormProps {
  members: TaskMember[];
  onCancel: () => void;
  onSaved: () => void;
  task?: TaskRow;
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="text-destructive mt-1 text-xs" role="alert">
      {errors[0]}
    </p>
  ) : null;
}

function DateTimeField({
  initialValue,
  label,
  name,
}: {
  initialValue?: string | null;
  label: string;
  name: string;
}) {
  const [displayValue, setDisplayValue] = useState(() =>
    isoToLocalDateTime(initialValue),
  );
  const isoValue = localDateTimeToIso(displayValue);
  return (
    <label className="text-sm font-medium">
      {label}
      <Input
        className="mt-1.5"
        onChange={(event) => setDisplayValue(event.currentTarget.value)}
        type="datetime-local"
        value={displayValue}
      />
      <input name={name} readOnly type="hidden" value={isoValue} />
    </label>
  );
}

function labelFor(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function TaskForm({ members, onCancel, onSaved, task }: TaskFormProps) {
  const action = task ? updateTaskAction : createTaskAction;
  const [state, formAction] = useActionState(action, initialTaskActionState);

  useEffect(() => {
    if (state.status === "success") onSaved();
  }, [onSaved, state.status]);

  return (
    <form action={formAction} className="space-y-5 p-5">
      {task ? <input name="taskId" type="hidden" value={task.id} /> : null}
      <label className="block text-sm font-medium">
        Title
        <Input
          aria-invalid={Boolean(state.fieldErrors?.title)}
          autoFocus
          className="mt-1.5"
          defaultValue={task?.title}
          maxLength={200}
          name="title"
          placeholder="What needs to happen?"
          required
        />
        <FieldError errors={state.fieldErrors?.title} />
      </label>

      <label className="block text-sm font-medium">
        Description
        <Textarea
          aria-invalid={Boolean(state.fieldErrors?.description)}
          className="mt-1.5 min-h-24"
          defaultValue={task?.description ?? ""}
          maxLength={5000}
          name="description"
          placeholder="Add the context needed to complete this task."
        />
        <FieldError errors={state.fieldErrors?.description} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Assignee
          <select
            className="border-input bg-background focus:border-ring mt-1.5 h-10 w-full rounded-md border px-3 text-sm focus:outline-none"
            defaultValue={task?.assignee_id ?? ""}
            name="assigneeId"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.member_user_id} value={member.member_user_id}>
                {member.display_name}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.assigneeId} />
        </label>

        <label className="text-sm font-medium">
          Priority
          <select
            className="border-input bg-background focus:border-ring mt-1.5 h-10 w-full rounded-md border px-3 text-sm focus:outline-none"
            defaultValue={task?.priority ?? "MEDIUM"}
            name="priority"
          >
            {taskPriorityValues.map((priority) => (
              <option key={priority} value={priority}>
                {labelFor(priority)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {task ? (
        <label className="block text-sm font-medium">
          Status
          <select
            className="border-input bg-background focus:border-ring mt-1.5 h-10 w-full rounded-md border px-3 text-sm focus:outline-none"
            defaultValue={task.status}
            name="status"
          >
            {taskStatusValues.map((status) => (
              <option key={status} value={status}>
                {labelFor(status)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <DateTimeField
            initialValue={task?.scheduled_at}
            label="Scheduled"
            name="scheduledAt"
          />
          <FieldError errors={state.fieldErrors?.scheduledAt} />
        </div>
        <div>
          <DateTimeField initialValue={task?.due_at} label="Due" name="dueAt" />
          <FieldError errors={state.fieldErrors?.dueAt} />
        </div>
      </div>

      {state.message ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button onClick={onCancel} variant="ghost">
          Cancel
        </Button>
        <SubmitButton pendingLabel="Saving…">
          {task ? "Save changes" : "Create task"}
        </SubmitButton>
      </div>
    </form>
  );
}
