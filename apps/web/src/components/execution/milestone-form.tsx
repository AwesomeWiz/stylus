"use client";
import { Select } from "@/components/ui/select";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MilestoneRow, TaskMember } from "@/lib/supabase/database.types";
import { saveExecution } from "./requests";
import { milestoneStatuses } from "@/modules/execution/schemas";
export const executionControl =
  "bg-background mt-1 min-h-11 w-full rounded-md border px-3 py-2 text-sm";
export function MilestoneForm({
  record,
  members,
  onSaved,
}: {
  record?: MilestoneRow | null;
  members: TaskMember[];
  onSaved: (id: string) => void;
}) {
  const errorId = useId();
  const [titleInvalid, setTitleInvalid] = useState(false);
  const [id] = useState(() => record?.id ?? crypto.randomUUID()),
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
        const f = new FormData(e.currentTarget),
          title = String(f.get("title") ?? "").trim();
        if (title.length < 2) {
          setTitleInvalid(true);
          setError("Enter a title of at least two characters.");
          e.currentTarget
            .querySelector<HTMLInputElement>("[name=title]")
            ?.focus();
          return;
        }
        setBusy(true);
        setError("");
        const r = await saveExecution({
          operation: "milestone",
          id,
          title,
          description: String(f.get("description") ?? ""),
          status: String(f.get("status")),
          ownerId: String(f.get("ownerId") ?? "") || null,
          targetDate: String(f.get("targetDate") ?? "") || null,
          archived: f.get("archived") === "on",
          revision: record?.updated_at ?? null,
        });
        setBusy(false);
        if (r.status === "error") {
          setError(r.message);
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
          defaultValue={record?.title}
          maxLength={160}
          required
          aria-invalid={titleInvalid || undefined}
          aria-describedby={titleInvalid ? errorId : undefined}
          disabled={busy}
        />
      </label>
      <label className="block text-sm">
        Description (optional)
        <textarea
          className={executionControl + " min-h-28"}
          name="description"
          maxLength={4000}
          defaultValue={record?.description}
          disabled={busy}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Target date (optional)
          <input
            className={executionControl}
            type="date"
            name="targetDate"
            defaultValue={record?.target_date ?? ""}
            disabled={busy}
          />
        </label>
        <label className="block text-sm">
          Status
          <Select
            className={executionControl}
            name="status"
            defaultValue={record?.status ?? "PLANNED"}
            disabled={busy}
          >
            {milestoneStatuses.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label className="block text-sm">
        Owner (optional)
        <Select
          className={executionControl}
          name="ownerId"
          defaultValue={record?.owner_id ?? ""}
          disabled={busy}
        >
          <option value="">Unassigned</option>
          {record?.owner_id &&
          !members.some((m) => m.member_user_id === record.owner_id) ? (
            <option value={record.owner_id}>
              Former member · choose an active owner or Unassigned
            </option>
          ) : null}
          {members.map((m) => (
            <option key={m.member_user_id} value={m.member_user_id}>
              {m.display_name}
            </option>
          ))}
        </Select>
      </label>
      {record ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="archived"
            defaultChecked={!!record.archived_at}
            disabled={busy}
          />
          Archived
        </label>
      ) : null}
      <p className="text-muted-foreground text-xs">
        A delivery checkpoint. Completing Tasks updates progress, never this
        status or Company Memory automatically.
      </p>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : record ? "Save Milestone" : "Create Milestone"}
      </Button>
    </form>
  );
}
