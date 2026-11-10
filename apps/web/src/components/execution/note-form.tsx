"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CoreNoteRow } from "@/lib/supabase/database.types";
import { executionControl } from "./milestone-form";
import { NoteMarkdown } from "./note-markdown";
import { saveExecution } from "./requests";
export function NoteForm({
  record,
  onSaved,
}: {
  record?: CoreNoteRow | null;
  onSaved: (id: string) => void;
}) {
  const errorId = useId();
  const [titleInvalid, setTitleInvalid] = useState(false);
  const [id] = useState(() => record?.id ?? crypto.randomUUID()),
    [title, setTitle] = useState(record?.title ?? ""),
    [content, setContent] = useState(record?.content ?? ""),
    [archived, setArchived] = useState(!!record?.archived_at),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setTitleInvalid(false);
        if (title.trim().length < 2) {
          setTitleInvalid(true);
          setError("Enter a title of at least two characters.");
          e.currentTarget
            .querySelector<HTMLInputElement>("[name=title]")
            ?.focus();
          return;
        }
        setBusy(true);
        setError("");
        const result = await saveExecution({
          operation: "note",
          id,
          title,
          content,
          archived,
          revision: record?.updated_at ?? null,
        });
        setBusy(false);
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        onSaved(id);
      }}
    >
      {error ? (
        <p id={errorId} role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
      <label className="block text-sm">
        Title *
        <input
          className={executionControl}
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          disabled={busy}
          required
          aria-invalid={titleInvalid || undefined}
          aria-describedby={titleInvalid ? errorId : undefined}
        />
      </label>
      <div className="flex items-center justify-between gap-2">
        <p id="note-format" className="text-muted-foreground text-xs">
          Markdown: # heading, - list, **bold**, *italic*, `code`,
          [label](https://…). No HTML or embeds.
        </p>
        <Button
          variant="ghost"
          aria-pressed={preview}
          onClick={() => setPreview((v) => !v)}
        >
          {preview ? "Edit text" : "Preview"}
        </Button>
      </div>
      {preview ? (
        <section
          aria-label="Note preview"
          className="min-h-56 rounded-md border p-3"
        >
          <NoteMarkdown content={content} />
        </section>
      ) : (
        <label className="block text-sm">
          Content
          <textarea
            className={executionControl + " min-h-64"}
            name="content"
            aria-describedby="note-format"
            value={content}
            maxLength={40000}
            onChange={(e) => setContent(e.target.value)}
            disabled={busy}
          />
        </label>
      )}
      {record ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
            disabled={busy}
          />
          Archived
        </label>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Working information. Saving a Note never adds it to Company Memory.
      </p>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : record ? "Save Note" : "Create Note"}
      </Button>
    </form>
  );
}
