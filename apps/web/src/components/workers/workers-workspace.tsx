"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Clipboard, Laptop, Link2, ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import type { OrganizationRole } from "@/lib/supabase/database.types";
import {
  createWorkerPairingAction,
  revokeWorkerAction,
} from "@/modules/workers/actions";
import { initialWorkerActionState } from "@/modules/workers/schemas";

type Worker = Awaited<
  ReturnType<
    typeof import("@/modules/workers/server/data").getOrganizationWorkers
  >
>[number];

function status(worker: Worker) {
  if (worker.revoked_at) return "REVOKED";
  if (
    worker.last_seen_at &&
    Date.now() - new Date(worker.last_seen_at).getTime() <= 120_000
  )
    return "ONLINE";
  return "OFFLINE";
}

export function WorkersWorkspace({
  role,
  workers,
}: {
  role: OrganizationRole;
  workers: Worker[];
}) {
  const canManage = role === "OWNER" || role === "ADMIN";
  const [pairState, pairAction, pairPending] = useActionState(
    createWorkerPairingAction,
    initialWorkerActionState,
  );
  return (
    <div className="space-y-8">
      <PageHeader
        title="Workers"
        description="Pair optional Windows compute without making Stylus depend on a local PC."
      />
      {canManage ? (
        <section className="border-b pb-6" aria-labelledby="pair-worker">
          <h2 id="pair-worker" className="text-sm font-semibold">
            Add Windows worker
          </h2>
          <form action={pairAction} className="mt-3 flex max-w-xl gap-2">
            <input
              className="border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm"
              name="name"
              placeholder="Studio workstation"
              required
            />
            <Button disabled={pairPending} type="submit">
              <Link2 className="size-4" aria-hidden="true" />
              Create pairing code
            </Button>
          </form>
          {pairState.pairingToken ? (
            <PairingCodePanel token={pairState.pairingToken} />
          ) : null}
          {pairState.message ? (
            <p
              className="text-muted-foreground mt-2 text-xs"
              aria-live="polite"
            >
              {pairState.message}
            </p>
          ) : null}
        </section>
      ) : null}
      <section aria-labelledby="registered-workers">
        <h2
          id="registered-workers"
          className="border-b pb-3 text-sm font-semibold"
        >
          Registered workers
        </h2>
        {workers.length ? (
          <div className="divide-y">
            {workers.map((worker) => (
              <WorkerRow
                canManage={canManage}
                key={worker.id}
                worker={worker}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Laptop
              className="text-muted-foreground mx-auto size-5"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-medium">No workers paired</p>
            <p className="text-muted-foreground mt-1 text-sm">
              External jobs wait safely until a compatible worker is online.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export function PairingCodePanel({ token }: { token: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const label =
    copyState === "copied"
      ? "Copied"
      : copyState === "failed"
        ? "Copy failed"
        : "Copy";

  return (
    <div className="bg-muted mt-3 max-w-xl rounded-md p-3">
      <p className="text-xs font-medium">Shown once · expires in 15 minutes</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code
          className="min-w-0 flex-1 text-xs break-all"
          data-testid="pairing-token"
        >
          {token}
        </code>
        <Button
          aria-label={`${label} pairing code`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(token);
              setCopyState("copied");
            } catch {
              setCopyState("failed");
            }
            if (resetTimer.current) clearTimeout(resetTimer.current);
            resetTimer.current = setTimeout(() => setCopyState("idle"), 1500);
          }}
          type="button"
          variant="secondary"
        >
          {copyState === "copied" ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Clipboard aria-hidden="true" className="size-4" />
          )}
          <span aria-live="polite">{label}</span>
        </Button>
      </div>
    </div>
  );
}

function WorkerRow({
  canManage,
  worker,
}: {
  canManage: boolean;
  worker: Worker;
}) {
  const [state, action, pending] = useActionState(
    revokeWorkerAction,
    initialWorkerActionState,
  );
  const workerStatus = status(worker);
  return (
    <article className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{worker.name}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {worker.platform} · {worker.version ?? "version unavailable"} ·{" "}
          {workerStatus}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Last seen{" "}
          {worker.last_seen_at
            ? new Date(worker.last_seen_at).toISOString()
            : "never"}
        </p>
      </div>
      {canManage && !worker.revoked_at ? (
        <form action={action}>
          <input type="hidden" name="workerId" value={worker.id} />
          <Button disabled={pending} type="submit" variant="ghost">
            <ShieldX className="size-4" aria-hidden="true" />
            Revoke
          </Button>
          {state.message ? (
            <p className="text-muted-foreground text-xs">{state.message}</p>
          ) : null}
        </form>
      ) : null}
    </article>
  );
}
