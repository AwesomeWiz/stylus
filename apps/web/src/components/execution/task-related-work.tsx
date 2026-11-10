"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { readTaskExecutionAction } from "@/modules/execution/actions";
import { selectTaskQuery } from "@/components/tasks/task-selection";
import { EntityProvenance } from "@/components/entities/entity-provenance";
import { ExecutionChoicePicker } from "./choice-picker";
import { saveExecution } from "./requests";
type Result = Awaited<ReturnType<typeof readTaskExecutionAction>>;
export function TaskRelatedWork({ taskId }: { taskId: string }) {
  const router = useRouter(),
    [result, setResult] = useState<Result>(),
    [turn, setTurn] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [picker, setPicker] = useState<"dependency" | "milestone" | null>(null);
  const refresh = useCallback(() => {
    setResult(undefined);
    setTurn((t) => t + 1);
  }, []);
  useEffect(() => {
    let active = true;
    void readTaskExecutionAction({ taskId }).then(
      (r) => {
        if (active) setResult(r);
      },
      () => {
        if (active)
          setResult({
            status: "error",
            code: "TRANSPORT",
            message: "Related work could not load. Retry.",
          });
      },
    );
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [taskId, turn, refresh]);
  async function mutate(input: unknown) {
    if (busy) return;
    setBusy(true);
    setError("");
    const r = await saveExecution(input);
    setBusy(false);
    if (r.status === "error") {
      setError(r.message);
      return;
    }
    setPicker(null);
    refresh();
    router.refresh();
  }
  function selectTask(e: MouseEvent<HTMLAnchorElement>, id: string) {
    if (
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault();
      selectTaskQuery({ task: id });
    }
  }
  if (!result)
    return (
      <p role="status" className="border-t px-6 py-5 text-sm">
        Loading related work…
      </p>
    );
  if (result.status === "error")
    return (
      <div className="border-t p-6">
        <p role="status" className="text-sm">
          {result.message}
        </p>
        <Button variant="secondary" onClick={refresh}>
          Retry related work
        </Button>
      </div>
    );
  const data = result.data,
    blocked = data.blockedBy.filter((t) => t.status !== "COMPLETED").length;
  return (
    <section
      aria-label="Task prerequisites and milestone"
      className="space-y-4 border-t px-6 py-5 [&_button]:min-h-11"
    >
      <h3 className="text-sm font-semibold">Execution</h3>
      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
      {blocked ? (
        <p role="status" className="text-sm font-medium">
          Blocked · {blocked} unfinished prerequisite{blocked === 1 ? "" : "s"}.
          Completing this task never completes other work.
        </p>
      ) : null}
      {(
        [
          ["Blocked by", data.blockedBy],
          ["Blocks", data.blocks],
        ] as const
      ).map(([label, rows]) => (
        <section key={label}>
          <h4 className="text-sm font-medium">{label}</h4>
          {rows.length ? (
            <ul className="mt-1 divide-y">
              {rows.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-2 py-1"
                >
                  <Link
                    prefetch={false}
                    href={`/tasks?view=all&task=${task.id}`}
                    onClick={(e) => selectTask(e, task.id)}
                    className="inline-block min-h-11 min-w-0 py-2 text-sm break-words underline"
                  >
                    {task.title}
                    <span className="text-muted-foreground block text-xs">
                      {task.status.replaceAll("_", " ")}
                    </span>
                  </Link>
                  {data.canEdit ? (
                    <Button
                      disabled={busy}
                      variant="ghost"
                      aria-label={"Remove prerequisite link to " + task.title}
                      onClick={() =>
                        void mutate({
                          operation: "dependency",
                          taskId: label === "Blocked by" ? taskId : task.id,
                          blockedById:
                            label === "Blocked by" ? task.id : taskId,
                          link: false,
                        })
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">None linked.</p>
          )}
        </section>
      ))}
      {data.milestone ? (
        <EntityProvenance
          title="Part of"
          links={[
            {
              label: "Milestone",
              title:
                data.milestone.title +
                (data.milestone.archived_at ? " · Archived" : ""),
              href: `/tasks?milestones=1&milestone=${data.milestone.id}`,
            },
          ]}
        />
      ) : (
        <p className="text-muted-foreground text-sm">No Milestone assigned.</p>
      )}
      {data.notes.length ? (
        <EntityProvenance
          title="Working Notes"
          links={data.notes.map((note) => ({
            label: "Note",
            title: note.title + (note.archived_at ? " · Archived" : ""),
            href: `/notes?note=${note.id}`,
          }))}
        />
      ) : null}
      {data.canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              setPicker(picker === "dependency" ? null : "dependency")
            }
          >
            Add prerequisite
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              setPicker(picker === "milestone" ? null : "milestone")
            }
          >
            {data.milestone ? "Change Milestone" : "Set Milestone"}
          </Button>
          {data.milestone ? (
            <Button
              disabled={busy}
              variant="ghost"
              onClick={() =>
                void mutate({
                  operation: "assignment",
                  taskId,
                  milestoneId: null,
                })
              }
            >
              Remove Milestone
            </Button>
          ) : null}
        </div>
      ) : null}
      {picker ? (
        <ExecutionChoicePicker
          key={picker}
          kind={picker === "dependency" ? "task" : "milestone"}
          onSelect={(choice) =>
            void mutate(
              picker === "dependency"
                ? {
                    operation: "dependency",
                    taskId,
                    blockedById: choice.id,
                    link: true,
                  }
                : { operation: "assignment", taskId, milestoneId: choice.id },
            )
          }
        />
      ) : null}
    </section>
  );
}
