"use client";
import { Select } from "@/components/ui/select";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CoreNoteRow } from "@/lib/supabase/database.types";
import { executionControl } from "./milestone-form";
import { saveExecution } from "./requests";
export function NoteMemoryForm({
  note,
  onSaved,
}: {
  note: CoreNoteRow;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        const result = await saveExecution({
          operation: "note-memory",
          noteId: note.id,
          revision: note.updated_at,
          title: String(data.get("title") ?? ""),
          content: String(data.get("content") ?? ""),
          kind: String(data.get("kind") ?? "NOTE"),
        });
        setBusy(false);
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        onSaved();
      }}
    >
      <p className="text-sm">
        Review and edit what should become durable Company Memory. This creates
        one human-authored record linked to this Note; later Note edits do not
        rewrite it.
      </p>
      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
      <label className="block text-sm">
        Memory title
        <input
          className={executionControl}
          name="title"
          defaultValue={note.title}
          maxLength={160}
          disabled={busy}
        />
      </label>
      <label className="block text-sm">
        Kind
        <Select
          className={executionControl}
          name="kind"
          defaultValue="NOTE"
          disabled={busy}
        >
          {["FACT", "DECISION", "INSIGHT", "PREFERENCE", "NOTE"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </Select>
      </label>
      {note.content.length > 10000 ? (
        <p id="memory-limit" className="text-sm">
          This Note is longer than Memory’s 10,000-character limit. Write a
          reviewed excerpt below; nothing has been truncated.
        </p>
      ) : null}
      <label className="block text-sm">
        Reviewed content
        <textarea
          className={executionControl + " min-h-56"}
          name="content"
          defaultValue={note.content.length <= 10000 ? note.content : ""}
          maxLength={10000}
          aria-describedby={
            note.content.length > 10000 ? "memory-limit" : undefined
          }
          disabled={busy}
        />
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "Confirming…" : "Confirm addition to Company Memory"}
      </Button>
    </form>
  );
}
