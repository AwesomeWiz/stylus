"use client";
import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveGrowth } from "./growth-requests";
import { growthLabel, growthLinkKinds } from "@/modules/marketing/growth";
import type { GrowthChoice } from "@/modules/marketing/server/growth-data";
import { GrowthChoicePicker } from "./growth-choice-picker";
import { growthControl } from "./growth-forms";
export function ChoiceLink({ choice }: { choice: GrowthChoice }) {
  return (
    <div>
      {choice.href ? (
        <Link
          className="text-primary inline-block min-h-11 max-w-full py-2 text-sm font-medium break-words underline"
          href={choice.href as Route}
        >
          {choice.title}
        </Link>
      ) : (
        <p className="text-sm">{choice.title}</p>
      )}
      <p className="text-muted-foreground text-xs break-words">
        {choice.detail}
      </p>
    </div>
  );
}
export function GrowthMutationButton({
  input,
  label,
}: {
  input: unknown;
  label: string;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await saveGrowth(input);
          setBusy(false);
          if (r.status === "error") setError(r.message);
          else {
            setError("");
            router.refresh();
          }
        }}
      >
        {busy ? "Saving…" : label}
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
export function SourceLinkForm({ hypothesisId }: { hypothesisId: string }) {
  const [kind, setKind] = useState("evidence"),
    [choice, setChoice] = useState<GrowthChoice | null>(null);
  return (
    <details className="space-y-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
        Link a source
      </summary>
      <select
        aria-label="Source type"
        className={growthControl}
        value={kind}
        onChange={(e) => {
          setKind(e.target.value);
          setChoice(null);
        }}
      >
        <option value="evidence">Research Evidence</option>
        <option value="note">Manual Research Note</option>
        <option value="opportunity">Content Opportunity candidate</option>
      </select>
      <GrowthChoicePicker
        key={kind}
        kind={kind}
        label="Find source records"
        onSelect={setChoice}
      />
      {choice?.source ? (
        <>
          <ChoiceLink choice={choice} />
          <GrowthMutationButton
            label="Confirm source link"
            input={{
              operation: "source",
              hypothesisId,
              source: choice.source,
              archived: false,
            }}
          />
        </>
      ) : null}
    </details>
  );
}
export function ExecutionLinkForm({ experimentId }: { experimentId: string }) {
  const [kind, setKind] = useState("task"),
    [choice, setChoice] = useState<GrowthChoice | null>(null);
  return (
    <details className="space-y-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
        Link execution or result
      </summary>
      <select
        aria-label="Execution or result type"
        className={growthControl}
        value={kind}
        onChange={(e) => {
          setKind(e.target.value);
          setChoice(null);
        }}
      >
        {growthLinkKinds.map((k) => (
          <option key={k} value={k}>
            {k === "snapshot"
              ? "Performance Snapshot"
              : k === "performance-learning"
                ? "Deterministic Performance Learning"
                : growthLabel(k.replaceAll("-", "_"))}
          </option>
        ))}
      </select>
      <GrowthChoicePicker
        key={kind}
        kind={kind}
        label="Find execution or result records"
        onSelect={setChoice}
      />
      {choice ? (
        <>
          <ChoiceLink choice={choice} />
          <GrowthMutationButton
            label="Confirm experiment link"
            input={{
              operation: "link",
              experimentId,
              kind,
              targetId: choice.id,
              archived: false,
            }}
          />
        </>
      ) : null}
      {kind === "task" ? (
        <Link
          className="inline-block min-h-11 py-2 text-sm underline"
          href="/tasks?create=1"
          target="_blank"
          rel="noopener noreferrer"
        >
          Create a Task in Tasks, then select it here
        </Link>
      ) : null}
    </details>
  );
}
