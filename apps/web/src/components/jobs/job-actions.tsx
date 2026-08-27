"use client";

import { useActionState } from "react";
import { Ban, Clock3, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  cancelJobAction,
  enqueueExampleJobAction,
  enqueueWorkerExampleJobAction,
  retryJobAction,
} from "@/modules/jobs/actions";
import { initialJobActionState } from "@/modules/jobs/schemas";

function Feedback({ state }: { state: typeof initialJobActionState }) {
  return state.message ? (
    <p
      aria-live="polite"
      className={
        state.status === "error"
          ? "text-destructive text-xs"
          : "text-muted-foreground text-xs"
      }
    >
      {state.message}
    </p>
  ) : null;
}

export function EnqueueExampleControls({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(
    enqueueExampleJobAction,
    initialJobActionState,
  );
  const [workerState, workerAction, workerPending] = useActionState(
    enqueueWorkerExampleJobAction,
    initialJobActionState,
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <Button
          disabled={disabled || pending}
          name="schedule"
          type="submit"
          value="now"
        >
          <Play aria-hidden="true" className="size-4" /> Queue test
        </Button>
        <Button
          disabled={disabled || pending}
          name="schedule"
          type="submit"
          value="later"
          variant="secondary"
        >
          <Clock3 aria-hidden="true" className="size-4" /> Schedule in 5 min
        </Button>
        <Feedback state={state} />
      </form>
      <form action={workerAction}>
        <Button
          disabled={disabled || workerPending}
          type="submit"
          variant="secondary"
        >
          <Play aria-hidden="true" className="size-4" /> Queue worker test
        </Button>
      </form>
      <Feedback state={workerState} />
    </div>
  );
}

export function JobLifecycleControls({
  canCancel,
  canRetry,
  jobId,
}: {
  canCancel: boolean;
  canRetry: boolean;
  jobId: string;
}) {
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelJobAction,
    initialJobActionState,
  );
  const [retryState, retryAction, retryPending] = useActionState(
    retryJobAction,
    initialJobActionState,
  );
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        {canCancel ? (
          <form action={cancelAction}>
            <input name="jobId" type="hidden" value={jobId} />
            <Button
              disabled={cancelPending}
              size="icon"
              title="Cancel job"
              type="submit"
              variant="ghost"
            >
              <Ban aria-hidden="true" className="size-4" />
              <span className="sr-only">Cancel job</span>
            </Button>
          </form>
        ) : null}
        {canRetry ? (
          <form action={retryAction}>
            <input name="jobId" type="hidden" value={jobId} />
            <Button
              disabled={retryPending}
              size="icon"
              title="Retry job"
              type="submit"
              variant="ghost"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              <span className="sr-only">Retry job</span>
            </Button>
          </form>
        ) : null}
      </div>
      <Feedback
        state={cancelState.status === "idle" ? retryState : cancelState}
      />
    </div>
  );
}
