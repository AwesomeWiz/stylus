"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Button } from "@/components/ui/button";
import { ViewerLocalDateTime } from "@/components/ui/viewer-local-date-time";
import type { TaskMember } from "@/lib/supabase/database.types";
import { loadTaskComments, loadTaskDetail } from "@/modules/tasks/read-actions";
import { ReadOnlyTask, TaskDiscussion } from "./task-detail";
import { TaskForm } from "./task-form";

const desktopQuery = "(min-width: 1200px)";
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => false;
function subscribeDesktop(listener: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

type Detail = Awaited<ReturnType<typeof loadTaskDetail>>;
type Comments = Awaited<ReturnType<typeof loadTaskComments>>;
type SuccessfulComments = Extract<Comments, { status: "success" }>;

function Discussion({
  organizationId,
  taskId,
  canMutate,
  members,
}: {
  organizationId: string;
  taskId: string;
  canMutate: boolean;
  members: TaskMember[];
}) {
  const [result, setResult] = useState<Comments | null>(null);
  const [retry, setRetry] = useState(0);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [earlierError, setEarlierError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const generation = useRef({ active: false });
  useEffect(() => {
    const request = { active: true };
    generation.current = request;
    loadTaskComments({ organizationId, taskId }).then(
      (data) => {
        if (request.active) {
          setResult(data);
          setRefreshing(false);
        }
      },
      () => {
        if (request.active) {
          setResult({ status: "error" });
          setRefreshing(false);
        }
      },
    );
    return () => {
      request.active = false;
    };
  }, [organizationId, taskId, retry]);
  const refresh = useCallback(() => {
    generation.current.active = false;
    setResult(null);
    setEarlierError(false);
    setLoadingEarlier(false);
    setRetry((value) => value + 1);
  }, []);
  const posted = useCallback(() => {
    generation.current.active = false;
    setRefreshing(true);
    setEarlierError(false);
    setLoadingEarlier(false);
    setRetry((value) => value + 1);
  }, []);
  async function earlier(current: SuccessfulComments) {
    const request = generation.current;
    setLoadingEarlier(true);
    setEarlierError(false);
    try {
      const page = await loadTaskComments({
        organizationId,
        taskId,
        before: current.before,
      });
      if (!request.active) return;
      if (page.status === "success")
        setResult({
          ...page,
          comments: [...page.comments, ...current.comments],
        });
      else if (page.status === "unavailable") setResult(page);
      else setEarlierError(true);
    } catch {
      if (request.active) setEarlierError(true);
    } finally {
      if (request.active) setLoadingEarlier(false);
    }
  }
  if (!result)
    return (
      <p className="border-t p-6 text-sm" role="status">
        Loading discussion…
      </p>
    );
  if (result.status !== "success")
    return (
      <div className="border-t p-6">
        <p role="alert" className="text-sm">
          {result.status === "unavailable"
            ? "Discussion is unavailable. Your access may have changed."
            : "Comments could not be loaded."}
        </p>
        <Button className="mt-2" onClick={refresh} variant="secondary">
          Retry comments
        </Button>
      </div>
    );
  return (
    <>
      {refreshing ? (
        <p className="text-muted-foreground px-6 pt-4 text-sm" role="status">
          Refreshing discussion…
        </p>
      ) : null}
      {result.before ? (
        <div className="border-t px-6 pt-4">
          <Button
            disabled={loadingEarlier}
            onClick={() => void earlier(result)}
            variant="ghost"
          >
            {loadingEarlier
              ? "Loading earlier comments…"
              : "Load earlier comments"}
          </Button>
          {earlierError ? (
            <p className="text-sm" role="alert">
              Earlier comments could not load. Try again.
            </p>
          ) : null}
        </div>
      ) : null}
      <TaskDiscussion
        canMutate={canMutate}
        comments={result.comments}
        members={members}
        onPosted={posted}
        taskId={taskId}
      />
    </>
  );
}

/** Keyed by organization + task in the workspace: no previous selection survives. */
export function TaskPanel({
  organizationId,
  taskId,
  members,
  onClose,
  onSaved,
}: {
  organizationId: string;
  taskId: string;
  members: TaskMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    desktopSnapshot,
    serverSnapshot,
  );
  const [detail, setDetail] = useState<Detail | null>(null);
  const [retry, setRetry] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let active = true;
    loadTaskDetail({ organizationId, taskId }).then(
      (data) => {
        if (active) setDetail(data);
      },
      () => {
        if (active) setDetail({ status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, [organizationId, taskId, retry]);
  const reload = useCallback(() => {
    setDetail(null);
    setRetry((value) => value + 1);
  }, []);
  const saved = useCallback(() => {
    reload();
    onSaved();
  }, [reload, onSaved]);
  return (
    <DialogPrimitive.Root
      open
      modal={!desktop}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        {!desktop ? (
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/35" />
        ) : null}
        <DialogPrimitive.Content
          data-task-detail-panel
          aria-modal={!desktop}
          aria-describedby="task-panel-description"
          className="bg-background fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l shadow-lg focus:outline-none min-[1200px]:top-12 min-[1200px]:z-30 md:w-[480px]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            heading.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              // Switching A -> B must leave focus in the new panel. Closing or
              // browser Back returns to the row, with a heading fallback.
              if (document.querySelector("[data-task-detail-panel]")) return;
              const row = Array.from(
                document.querySelectorAll<HTMLButtonElement>(
                  "[data-task-open]",
                ),
              ).find((element) => element.dataset.taskOpen === taskId);
              (row ?? document.getElementById("tasks-heading"))?.focus();
            });
          }}
          onInteractOutside={(event) => {
            if (desktop) event.preventDefault();
          }}
        >
          <div className="shrink-0 border-b p-6">
            <Button className="mb-3 -ml-3" onClick={onClose} variant="ghost">
              <ArrowLeft aria-hidden="true" className="size-4" /> Back to list
            </Button>
            <DialogPrimitive.Title asChild>
              <h2
                className="text-lg font-semibold break-words outline-none"
                ref={heading}
                tabIndex={-1}
              >
                {detail?.status === "success"
                  ? detail.task.title
                  : "Task details"}
              </h2>
            </DialogPrimitive.Title>
            <DialogPrimitive.Description
              className="text-muted-foreground mt-1 text-sm"
              id="task-panel-description"
            >
              {desktop
                ? "Task detail panel. Use Back to list to return to your task."
                : "Task detail. Close to return to your list."}
            </DialogPrimitive.Description>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            {!detail ? (
              <div className="space-y-4 p-6" role="status">
                <p className="text-sm">Loading task details…</p>
                <div className="bg-muted h-10 rounded-md" />
                <div className="bg-muted h-24 rounded-md" />
              </div>
            ) : detail.status !== "success" ? (
              <div className="p-6">
                <p className="text-sm" role="alert">
                  {detail.status === "unavailable"
                    ? "This task is unavailable or you no longer have access."
                    : "Task details could not be loaded."}
                </p>
                <Button className="mt-3" onClick={reload} variant="secondary">
                  Retry details
                </Button>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground px-6 pt-4 text-xs">
                  Created <ViewerLocalDateTime value={detail.task.created_at} />
                  {!detail.canMutate ? " · Read-only access" : ""}
                </p>
                {detail.canMutate ? (
                  <TaskForm
                    key={detail.task.updated_at}
                    members={members}
                    onCancel={onClose}
                    onSaved={saved}
                    task={detail.task}
                  />
                ) : (
                  <ReadOnlyTask members={members} task={detail.task} />
                )}
                <Discussion
                  canMutate={detail.canMutate}
                  members={members}
                  organizationId={organizationId}
                  taskId={taskId}
                />
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
