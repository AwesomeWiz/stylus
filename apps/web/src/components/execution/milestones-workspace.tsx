"use client";
import Link from "next/link";
import Form from "next/form";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { MilestoneForm } from "./milestone-form";
import type { MilestoneRow, TaskMember } from "@/lib/supabase/database.types";
import type { getMilestones } from "@/modules/execution/server/data";
export function MilestonesWorkspace({
  page,
  selected,
  selectedId,
  canEdit,
  members,
  archived,
  query,
}: {
  page: Awaited<ReturnType<typeof getMilestones>>;
  selected:
    (MilestoneRow & { completed_count: number; total_count: number }) | null;
  selectedId?: string;
  canEdit: boolean;
  members: TaskMember[];
  archived: boolean;
  query: string;
}) {
  const router = useRouter(),
    [modal, setModal] = useState<"new" | "edit" | null>(null),
    opener = useRef<HTMLElement | null>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const listScroll = useRef<{ key: string; y: number } | null>(null),
    listKey = JSON.stringify([query, archived, page.after]);
  useEffect(() => {
    if (selectedId) heading.current?.focus();
    else if (listScroll.current?.key === listKey)
      window.scrollTo({ top: listScroll.current.y });
  }, [selectedId, listKey]);
  function href(extra: Record<string, string | undefined> = {}) {
    const p = new URLSearchParams({ milestones: "1" });
    if (query) p.set("query", query);
    if (archived) p.set("archived", "true");
    if (page.after) p.set("after", page.after);
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    return ("/tasks?" + p) as Route;
  }
  function open(mode: typeof modal) {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setModal(mode);
  }
  return (
    <div className="max-w-[1200px] space-y-5 [&_button]:min-h-11 [&_button]:min-w-11">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Milestones</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Small delivery checkpoints, with progress from actual linked Tasks.
          </p>
        </div>
        {canEdit ? (
          <Button onClick={() => open("new")}>New Milestone</Button>
        ) : null}
      </header>
      <nav className="flex flex-wrap gap-5">
        <Link
          className="inline-block min-h-11 py-2 text-sm underline"
          href="/tasks"
        >
          Back to Tasks
        </Link>
        <Link
          className="inline-block min-h-11 py-2 text-sm underline"
          href={
            archived
              ? "/tasks?milestones=1"
              : "/tasks?milestones=1&archived=true"
          }
        >
          {archived ? "Active Milestones" : "Archived Milestones"}
        </Link>
      </nav>
      <Form action="/tasks" role="search" className="flex flex-wrap gap-2">
        <input type="hidden" name="milestones" value="1" />
        {archived ? <input type="hidden" name="archived" value="true" /> : null}
        <label className="min-w-0 flex-1 text-sm">
          Search Milestones
          <input
            className="bg-background mt-1 min-h-11 w-full rounded-md border px-3"
            type="search"
            name="query"
            maxLength={100}
            defaultValue={query}
          />
        </label>
        <Button type="submit" className="self-end" variant="secondary">
          Search
        </Button>
      </Form>
      <div
        className={
          selectedId
            ? "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]"
            : ""
        }
      >
        <section
          aria-label="Milestones list"
          className={selectedId ? "hidden xl:block" : ""}
        >
          <ul className="divide-y border-y">
            {page.rows.map((row) => (
              <li key={row.id}>
                <Link
                  prefetch={false}
                  className="hover:bg-muted block py-3 text-sm"
                  href={href({ milestone: row.id })}
                  onClick={() => {
                    listScroll.current = { key: listKey, y: window.scrollY };
                  }}
                  scroll={false}
                >
                  <p className="font-medium break-words">{row.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {row.status.toLowerCase()} · {row.completed_count ?? 0} /{" "}
                    {row.total_count ?? 0} Tasks complete
                    {row.target_date ? " · Target " + row.target_date : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {!page.rows.length ? (
            <p className="text-muted-foreground py-5 text-sm">
              {query
                ? "No matching Milestones."
                : canEdit
                  ? "Create a checkpoint when several Tasks share a delivery commitment."
                  : "No Milestones to review."}
            </p>
          ) : null}
          {page.hasMore ? (
            <Link
              className="inline-block min-h-11 py-2 text-sm underline"
              href={href({ after: page.cursor })}
            >
              Next 25 Milestones
            </Link>
          ) : null}
        </section>
        {selectedId ? (
          <section className="min-w-0 space-y-4 rounded-md border p-4">
            <Link
              href={href()}
              className="inline-block min-h-11 py-2 text-sm underline"
            >
              Back to Milestones
            </Link>
            {selected ? (
              <>
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="text-xl font-semibold break-words outline-none"
                >
                  {selected.title}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {selected.completed_count} / {selected.total_count} Tasks
                  complete · {selected.status.toLowerCase()}
                  {selected.archived_at ? " · Archived" : ""}
                  {selected.target_date
                    ? " · Target " + selected.target_date
                    : ""}
                </p>
                <p className="max-w-[72ch] text-sm leading-7 break-words whitespace-pre-wrap">
                  {selected.description || "No description."}
                </p>
                <Link
                  className="inline-block min-h-11 py-2 text-sm underline"
                  href={`/tasks?view=all&milestone=${selected.id}`}
                >
                  Open linked Tasks
                </Link>
                {canEdit ? (
                  <div>
                    <Button variant="secondary" onClick={() => open("edit")}>
                      Edit Milestone
                    </Button>
                  </div>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  Task progress excludes cancelled work. Status is an explicit
                  team decision.
                </p>
              </>
            ) : (
              <p role="status">
                This Milestone is unavailable in the current organization.
              </p>
            )}
          </section>
        ) : null}
      </div>
      <Dialog
        open={modal !== null}
        mobileSheet
        title={modal === "edit" ? "Edit Milestone" : "Create Milestone"}
        description="An optional delivery checkpoint, distinct from a Goal, Experiment or Campaign."
        className="[&_button]:min-h-11 [&_button]:min-w-11"
        onOpenChange={(isOpen) => {
          if (!isOpen) setModal(null);
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(() => {
            (opener.current?.isConnected
              ? opener.current
              : heading.current
            )?.focus();
          });
        }}
      >
        <div className="p-5 sm:p-6">
          <MilestoneForm
            key={modal + (selected?.id ?? "new")}
            record={modal === "edit" ? selected : null}
            members={members}
            onSaved={(id) => {
              setModal(null);
              router.push(href({ milestone: id }), { scroll: false });
              router.refresh();
            }}
          />
        </div>
      </Dialog>
    </div>
  );
}
