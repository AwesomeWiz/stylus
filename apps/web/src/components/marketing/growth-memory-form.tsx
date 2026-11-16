"use client";
import { Select } from "@/components/ui/select";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveGrowth } from "./growth-requests";
import { growthControl } from "./growth-forms";
import { growthLabel, type GrowthRow } from "@/modules/marketing/growth";
export function GrowthMemoryForm({
  learning,
  onSaved,
}: {
  learning: GrowthRow;
  onSaved: (id: string) => void;
}) {
  const router = useRouter(),
    [title, setTitle] = useState(learning.title),
    [content, setContent] = useState(learning.conclusion ?? ""),
    [kind, setKind] = useState("INSIGHT"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        const result = await saveGrowth({
          operation: "promote",
          learningId: learning.id,
          title,
          content,
          kind,
        });
        setBusy(false);
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        onSaved(result.data.id);
        router.refresh();
      }}
    >
      <p className="text-sm">
        Review durable company context before confirming. The source Learning
        and Experiment are recorded. Repeated confirmation reuses the existing
        memory and never overwrites it.
      </p>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <label className="block text-sm">
        Memory type
        <Select
          className={growthControl}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {["FACT", "DECISION", "INSIGHT", "PREFERENCE", "NOTE"].map((k) => (
            <option key={k} value={k}>
              {growthLabel(k)}
            </option>
          ))}
        </Select>
      </label>
      <label className="block text-sm">
        Memory title *
        <input
          className={growthControl}
          required
          minLength={2}
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Approved text *
        <textarea
          className={growthControl + " min-h-36"}
          required
          maxLength={10000}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "Confirming…" : "Confirm Add to Company Memory"}
      </Button>
    </form>
  );
}
