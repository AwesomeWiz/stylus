"use client";
import { Select } from "@/components/ui/select";
import { GrowthEvaluationForm } from "./growth-evaluation-form";
import { GrowthMemoryForm } from "./growth-memory-form";
import { GrowthDetailContent } from "./growth-detail";
import Link from "next/link";
import Form from "next/form";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type {
  OrganizationRole,
  TaskMember,
} from "@/lib/supabase/database.types";
import { canMutateMarketing } from "@/modules/marketing/authorization";
import {
  growthLabel,
  growthRoutes,
  experimentStatuses,
  hypothesisStatuses,
  type GrowthKind,
} from "@/modules/marketing/growth";
import type {
  GrowthChoice,
  GrowthDetail,
  GrowthList,
} from "@/modules/marketing/server/growth-data";
import { GrowthRecordForm, growthControl } from "./growth-forms";

const labels = {
  hypothesis: "Hypotheses",
  experiment: "Experiments",
  learning: "Learnings",
};
export function GrowthWorkspace({
  kind,
  list,
  detail,
  selectedId,
  role,
  members,
  initialCreate = false,
  initialHypothesis,
  initialSource,
}: {
  kind: GrowthKind;
  list: GrowthList;
  detail: GrowthDetail | null;
  selectedId?: string;
  role: OrganizationRole;
  members: TaskMember[];
  initialCreate?: boolean;
  initialHypothesis?: GrowthChoice | null;
  initialSource?: GrowthChoice | null;
}) {
  const canEdit = canMutateMarketing(role),
    [modal, setModal] = useState<
      "create" | "edit" | "evaluate" | "learning" | "memory" | null
    >(initialCreate && canEdit ? "create" : null),
    [notice, setNotice] = useState("");
  const router = useRouter();
  const actions = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null),
    heading = useRef<HTMLHeadingElement>(null);
  function open(next: typeof modal) {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setModal(next);
  }
  useEffect(() => {
    if (selectedId) heading.current?.focus();
  }, [selectedId]);
  function path(extra: Record<string, string | undefined> = {}) {
    const p = new URLSearchParams();
    if (list.query) p.set("query", list.query);
    if (list.status) p.set("status", list.status);
    if (list.archived) p.set("archived", "true");
    if (list.after) p.set("after", list.after);
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return growthRoutes[kind] + (p.size ? "?" + p : "");
  }
  const owner = (id: string | null | undefined) =>
    id
      ? (members.find((m) => m.member_user_id === id)?.display_name ??
        "Former member")
      : "Unassigned";
  const record = detail?.record;
  return (
    <div className="space-y-5 [&_button]:min-h-11">
      {notice ? (
        <p role="status" className="text-sm">
          {notice}
        </p>
      ) : null}
      <div
        ref={actions}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <p className="text-muted-foreground max-w-[65ch] text-sm">
          {kind === "hypothesis"
            ? "Testable beliefs grounded in evidence. A citation gives context, not proof."
            : kind === "experiment"
              ? "Deliberate tests with clear criteria, canonical execution and reviewed results."
              : "Accepted conclusions from completed experiments. Company Memory requires a separate confirmation."}
        </p>
        {canEdit && kind !== "learning" ? (
          <Button onClick={() => open("create")}>New {kind}</Button>
        ) : null}
      </div>
      {kind === "experiment" ? (
        <nav aria-label="Experiment views" className="flex flex-wrap gap-2">
          {[
            ["All", ""],
            ["Running", "RUNNING"],
            ["Planned", "PLANNED"],
            ["Evaluating", "EVALUATING"],
            ["Complete", "COMPLETE"],
          ].map(([label, status]) => (
            <Link
              key={label}
              href={path({ status, after: undefined }) as Route}
              aria-current={list.status === status ? "page" : undefined}
              className="hover:bg-muted inline-flex min-h-11 items-center rounded-md border px-3 text-sm"
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
      <Form
        action={growthRoutes[kind]}
        className="flex flex-wrap items-end gap-3"
        role="search"
      >
        <label className="w-full min-w-0 flex-auto text-sm sm:w-auto sm:flex-1">
          Search {labels[kind].toLowerCase()}
          <input
            name="query"
            type="search"
            maxLength={100}
            defaultValue={list.query}
            className={growthControl}
          />
        </label>
        {kind !== "learning" ? (
          <label className="text-sm">
            Status
            <Select
              className={growthControl}
              name="status"
              defaultValue={list.status}
            >
              <option value="">All statuses</option>
              {(kind === "hypothesis"
                ? hypothesisStatuses
                : experimentStatuses
              ).map((s) => (
                <option key={s} value={s}>
                  {growthLabel(s)}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        {list.archived ? (
          <input type="hidden" name="archived" value="true" />
        ) : null}
        <Button variant="secondary" type="submit">
          Apply
        </Button>
        <Link
          href={
            path({
              archived: list.archived ? undefined : "true",
              after: undefined,
            }) as Route
          }
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          {list.archived ? "Active records" : "Archived records"}
        </Link>
      </Form>
      <div
        className={
          selectedId
            ? "grid min-w-0 gap-6 xl:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)]"
            : ""
        }
      >
        <section
          aria-label={labels[kind] + " list"}
          className={selectedId ? "hidden min-w-0 xl:block" : "min-w-0"}
        >
          <ul className="divide-y border-y">
            {list.rows.map((row) => {
              const count = list.counts.find((c) => c.id === row.id);
              return (
                <li key={row.id}>
                  <Link
                    href={path({ item: row.id }) as Route}
                    aria-current={selectedId === row.id ? "page" : undefined}
                    className="hover:bg-muted block rounded-sm py-3 focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <p className="font-medium break-words">{row.title}</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {row.status
                        ? growthLabel(row.status)
                        : "Confidence: " +
                          growthLabel(row.confidence ?? "MEDIUM")}{" "}
                      · {owner(row.owner_id)}
                      {row.archived_at ? " · Archived" : ""}
                    </p>
                    {count ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {count.source_count} sources · {count.experiment_count}{" "}
                        experiments
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          {!list.rows.length ? (
            <div className="space-y-2 border-y py-6">
              <p className="font-medium">
                {list.query || list.status
                  ? "No matching records"
                  : `No ${labels[kind].toLowerCase()} yet`}
              </p>
              <p className="text-muted-foreground text-sm">
                {kind === "learning"
                  ? "Complete an experiment and record a reviewed conclusion when one is justified."
                  : canEdit
                    ? "Start from evidence or create a focused testable belief."
                    : "Your team’s shared records will appear here. Your role is read-only."}
              </p>
            </div>
          ) : null}
          {list.hasMore ? (
            <Link
              href={path({ after: list.cursor }) as Route}
              className="inline-flex min-h-11 items-center text-sm underline"
            >
              Next 25 records
            </Link>
          ) : null}
        </section>
        {selectedId ? (
          <section
            aria-label="Selected record"
            className="min-w-0 space-y-5 rounded-md border p-4 sm:p-5"
          >
            <Link
              href={path() as Route}
              className="inline-flex min-h-11 items-center text-sm underline"
            >
              Back to {labels[kind]}
            </Link>
            {record && detail ? (
              <GrowthDetailContent
                kind={kind}
                detail={detail}
                canEdit={canEdit}
                owner={owner}
                onOpen={open}
                headingRef={heading}
              />
            ) : (
              <p role="status">
                This record is unavailable in the current organization.
              </p>
            )}
          </section>
        ) : null}
      </div>
      <Dialog
        open={modal !== null}
        mobileSheet
        className="[&_button]:min-h-11"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => {
            const target = opener.current?.isConnected
              ? opener.current
              : (heading.current ?? actions.current?.querySelector("button"));
            target?.focus();
          });
        }}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setModal(null);
            if (initialCreate)
              router.replace(path() as Route, { scroll: false });
          }
        }}
        title={
          modal === "evaluate"
            ? "Evaluate experiment"
            : modal === "memory"
              ? "Add to Company Memory"
              : modal === "learning"
                ? "Record Learning"
                : `${modal === "edit" ? "Edit" : "Create"} ${kind}`
        }
        description={
          modal === "memory"
            ? "Review and confirm durable company knowledge."
            : modal === "evaluate"
              ? "Record the actual result and a bounded conclusion."
              : "Explicit shared working data. No AI or automatic Company Memory update."
        }
      >
        <div className="p-5 sm:p-6">
          {modal === "create" || modal === "edit" ? (
            <GrowthRecordForm
              key={modal + ":" + (record?.id ?? "new")}
              kind={kind}
              record={modal === "edit" ? record : undefined}
              members={members}
              hypothesis={
                initialHypothesis ??
                (detail?.hypothesis
                  ? {
                      id: detail.hypothesis.id,
                      title: detail.hypothesis.title,
                      detail: "Hypothesis",
                      href: "",
                    }
                  : null)
              }
              source={initialSource}
              onSaved={() => setModal(null)}
            />
          ) : modal === "evaluate" && record ? (
            <GrowthEvaluationForm
              experiment={record}
              onSaved={() => setModal(null)}
            />
          ) : modal === "learning" && record ? (
            <GrowthRecordForm
              kind="learning"
              experimentId={record.id}
              members={members}
              onSaved={() => setModal(null)}
            />
          ) : modal === "memory" && record ? (
            <GrowthMemoryForm
              learning={record}
              onSaved={() => {
                setModal(null);
                setNotice(
                  "Company Memory confirmed. Repeated submissions reuse the same memory.",
                );
              }}
            />
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
