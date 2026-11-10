"use client";
import Link from "next/link";
import Form from "next/form";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ViewerLocalDateTime } from "@/components/ui/viewer-local-date-time";
import { EntityProvenance } from "@/components/entities/entity-provenance";
import type { getNotes, getNote } from "@/modules/execution/server/data";
import { NoteMarkdown } from "./note-markdown";
import { NoteForm } from "./note-form";
import { NoteMemoryForm } from "./note-memory-form";
import { ExecutionChoicePicker } from "./choice-picker";
import { saveExecution } from "./requests";
type Selected = Awaited<ReturnType<typeof getNote>>;
export function NotesWorkspace({
  page,
  selected,
  selectedId,
  canEdit,
}: {
  page: Awaited<ReturnType<typeof getNotes>>;
  selected: Selected;
  selectedId?: string;
  canEdit: boolean;
}) {
  const router = useRouter(),
    [modal, setModal] = useState<"new" | "edit" | "memory" | null>(null),
    [picker, setPicker] = useState<"task" | "milestone" | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    opener = useRef<HTMLElement | null>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const listScroll = useRef<{ key: string; y: number } | null>(null),
    listKey = JSON.stringify([page.query, page.archived, page.before]);
  useEffect(() => {
    if (selectedId) heading.current?.focus();
    else if (listScroll.current?.key === listKey)
      window.scrollTo({ top: listScroll.current.y });
  }, [selectedId, listKey]);
  function href(extra: Record<string, string | undefined> = {}) {
    const p = new URLSearchParams();
    if (page.query) p.set("query", page.query);
    if (page.archived) p.set("archived", "true");
    if (page.before) p.set("before", page.before);
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    return ("/notes" + (p.size ? "?" + p : "")) as Route;
  }
  function open(mode: typeof modal) {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setModal(mode);
  }
  async function link(kind: "task" | "milestone", id: string, add: boolean) {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    const result = await saveExecution({
      operation: "note-link",
      noteId: selected.note.id,
      kind,
      targetId: id,
      link: add,
    });
    setBusy(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setPicker(null);
    router.refresh();
  }
  const links = selected
    ? [
        ...selected.tasks.map((t) => ({
          label: "Linked Task",
          title: t.title + " · " + t.status.toLowerCase().replaceAll("_", " "),
          href: "/tasks?task=" + t.id,
        })),
        ...selected.milestones.map((m) => ({
          label: "Part of Milestone",
          title: m.title + (m.archived_at ? " · Archived" : ""),
          href: "/tasks?milestones=1&milestone=" + m.id,
        })),
      ]
    : [];
  return (
    <div className="max-w-[1200px] space-y-5 [&_button]:min-h-11 [&_button]:min-w-11">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Working Notes</h1>
          <p className="text-muted-foreground mt-1 max-w-[72ch] text-sm">
            Plans, decisions in progress and team reference. Separate from
            durable Company Memory.
          </p>
        </div>
        {canEdit ? (
          <Button id="new-working-note" onClick={() => open("new")}>
            New Note
          </Button>
        ) : null}
      </header>
      <nav className="flex flex-wrap gap-5 text-sm">
        <Link className="inline-block min-h-11 py-2 underline" href="/settings">
          Settings / Knowledge
        </Link>
        <Link className="inline-block min-h-11 py-2 underline" href="/memory">
          Company Knowledge / Memory
        </Link>
        <Link
          className="inline-block min-h-11 py-2 underline"
          href={page.archived ? "/notes" : "/notes?archived=true"}
        >
          {page.archived ? "Active Notes" : "Archived Notes"}
        </Link>
      </nav>
      <Form action="/notes" role="search" className="flex flex-wrap gap-2">
        {page.archived ? (
          <input type="hidden" name="archived" value="true" />
        ) : null}
        <label className="min-w-0 flex-1 text-sm">
          Search Note titles
          <input
            className="bg-background mt-1 min-h-11 w-full rounded-md border px-3"
            name="query"
            type="search"
            defaultValue={page.query}
            maxLength={100}
          />
        </label>
        <Button variant="secondary" type="submit" className="self-end">
          Search
        </Button>
      </Form>
      <div
        className={
          selectedId
            ? "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]"
            : ""
        }
      >
        <section
          aria-label="Notes list"
          className={selectedId ? "hidden xl:block" : ""}
        >
          <ul className="divide-y border-y">
            {page.rows.map((row) => (
              <li key={row.id}>
                <Link
                  prefetch={false}
                  href={href({ note: row.id })}
                  onClick={() => {
                    listScroll.current = { key: listKey, y: window.scrollY };
                  }}
                  scroll={false}
                  className="hover:bg-muted block py-3"
                >
                  <p className="text-sm font-medium break-words">{row.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Updated <ViewerLocalDateTime value={row.updated_at} />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {!page.rows.length ? (
            <p className="text-muted-foreground py-5 text-sm">
              {page.query
                ? "No matching Note titles."
                : canEdit
                  ? "Capture a working plan or decision with New Note."
                  : "No Notes to review."}
            </p>
          ) : null}
          {page.more ? (
            <Link
              className="inline-block min-h-11 py-2 text-sm underline"
              href={href({ before: page.cursor })}
            >
              Next 25 Notes
            </Link>
          ) : null}
        </section>
        {selectedId ? (
          <article className="min-w-0 space-y-4 rounded-md border p-4 sm:p-5">
            <Link
              className="inline-block min-h-11 py-2 text-sm underline"
              href={href()}
            >
              Back to Notes
            </Link>
            {selected ? (
              <>
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="text-xl font-semibold break-words outline-none"
                >
                  {selected.note.title}
                </h2>
                <p className="text-muted-foreground text-xs">
                  Working Note{selected.note.archived_at ? " · Archived" : ""} ·
                  Updated{" "}
                  <ViewerLocalDateTime value={selected.note.updated_at} />
                </p>
                {canEdit ? (
                  <Button variant="secondary" onClick={() => open("edit")}>
                    Edit Note
                  </Button>
                ) : null}
                <NoteMarkdown content={selected.note.content} />
                <EntityProvenance links={links} title="Related work" />
                {error ? (
                  <p role="alert" className="text-sm">
                    {error}
                  </p>
                ) : null}
                {canEdit && !selected.note.archived_at ? (
                  <section
                    aria-label="Manage Note links"
                    className="space-y-2 border-t pt-4"
                  >
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          setPicker(picker === "task" ? null : "task")
                        }
                      >
                        Link Task
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          setPicker(picker === "milestone" ? null : "milestone")
                        }
                      >
                        Link Milestone
                      </Button>
                    </div>
                    {picker ? (
                      <ExecutionChoicePicker
                        key={picker}
                        kind={picker}
                        onSelect={(item) => void link(picker, item.id, true)}
                      />
                    ) : null}
                    <ul>
                      {selected.tasks.map((t) => (
                        <li key={t.id}>
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void link("task", t.id, false)}
                          >
                            Unlink Task: {t.title}
                          </Button>
                        </li>
                      ))}
                      {selected.milestones.map((m) => (
                        <li key={m.id}>
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void link("milestone", m.id, false)}
                          >
                            Unlink Milestone: {m.title}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <section
                  aria-label="Company Memory"
                  className="space-y-2 border-t pt-4"
                >
                  <h3 className="text-sm font-semibold">Company Memory</h3>
                  {selected.memory ? (
                    <Link
                      href={`/memory?memory=${selected.memory.id}`}
                      className="inline-block min-h-11 py-2 text-sm underline"
                    >
                      Open promoted Memory
                      {selected.memory.archived_at ? " (archived)" : ""}
                    </Link>
                  ) : (
                    <>
                      <p className="text-muted-foreground text-sm">
                        This Note has not been promoted. Notes are never
                        ingested automatically.
                      </p>
                      {canEdit && !selected.note.archived_at ? (
                        <Button
                          variant="secondary"
                          onClick={() => open("memory")}
                        >
                          Preview addition to Company Memory
                        </Button>
                      ) : null}
                    </>
                  )}
                </section>
              </>
            ) : (
              <p role="status">
                This Note is unavailable in the current organization.
              </p>
            )}
          </article>
        ) : null}
      </div>
      <Dialog
        open={modal !== null}
        mobileSheet
        title={
          modal === "memory"
            ? "Review Company Memory"
            : modal === "edit"
              ? "Edit working Note"
              : "Create working Note"
        }
        description={
          modal === "memory"
            ? "An explicit, reviewed promotion to durable Company Knowledge."
            : "A lightweight team document with plain-text Markdown."
        }
        className="[&_button]:min-h-11 [&_button]:min-w-11"
        onOpenChange={(v) => {
          if (!v) setModal(null);
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(() => {
            (opener.current?.isConnected
              ? opener.current
              : (heading.current ?? document.getElementById("new-working-note"))
            )?.focus();
          });
        }}
      >
        <div className="p-5 sm:p-6">
          {modal === "memory" && selected ? (
            <NoteMemoryForm
              note={selected.note}
              onSaved={() => {
                setModal(null);
                router.refresh();
              }}
            />
          ) : (
            <NoteForm
              key={modal + (selected?.note.updated_at ?? "new")}
              record={modal === "edit" ? selected?.note : null}
              onSaved={(id) => {
                setModal(null);
                router.push(href({ note: id }), { scroll: false });
                router.refresh();
              }}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
}
