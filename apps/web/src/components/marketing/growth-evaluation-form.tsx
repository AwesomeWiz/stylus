"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveGrowth } from "./growth-requests";
import { growthControl } from "./growth-forms";
import {
  growthConfidence,
  growthLabel,
  growthOutcomes,
  type GrowthRow,
} from "@/modules/marketing/growth";
export function GrowthEvaluationForm({
  experiment,
  onSaved,
}: {
  experiment: GrowthRow;
  onSaved: () => void;
}) {
  const router = useRouter(),
    [outcome, setOutcome] = useState("INCONCLUSIVE"),
    [summary, setSummary] = useState(""),
    [withLearning, setWithLearning] = useState(false),
    [title, setTitle] = useState(""),
    [conclusion, setConclusion] = useState(""),
    [confidence, setConfidence] = useState("MEDIUM"),
    [updateHypothesis, setUpdateHypothesis] = useState(false),
    [learningId] = useState(() => crypto.randomUUID()),
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
          operation: "evaluate",
          experimentId: experiment.id,
          revision: experiment.updated_at,
          outcome,
          resultSummary: summary,
          updateHypothesis,
          learning: withLearning
            ? { id: learningId, title, conclusion, confidence }
            : null,
        });
        setBusy(false);
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        onSaved();
        router.refresh();
      }}
    >
      <p className="text-sm">Criteria: {experiment.success_criteria}</p>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <label className="block text-sm">
        What happened? *
        <textarea
          className={growthControl + " min-h-28"}
          required
          minLength={2}
          maxLength={4000}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </label>
      <fieldset>
        <legend className="text-sm font-medium">Outcome</legend>
        {growthOutcomes.map((o) => (
          <label key={o} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="outcome"
              value={o}
              checked={outcome === o}
              onChange={() => setOutcome(o)}
            />
            {growthLabel(o)}
          </label>
        ))}
      </fieldset>
      <p className="text-muted-foreground text-xs">
        Review the linked observations and their limitations. A single test does
        not establish absolute truth.
      </p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={withLearning}
          onChange={(e) => setWithLearning(e.target.checked)}
        />
        Record an accepted Learning (optional)
      </label>
      {withLearning ? (
        <>
          <label className="block text-sm">
            Learning title *
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
            What did we learn? *
            <textarea
              className={growthControl + " min-h-28"}
              required
              minLength={2}
              maxLength={4000}
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Learning confidence
            <select
              className={growthControl}
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
            >
              {growthConfidence.map((c) => (
                <option key={c} value={c}>
                  {growthLabel(c)}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={updateHypothesis}
          onChange={(e) => setUpdateHypothesis(e.target.checked)}
        />
        Also update the Hypothesis status to {growthLabel(outcome)}
      </label>
      <p className="text-muted-foreground text-xs">
        Completion freezes this evaluation and its provenance. No Learning or
        Company Memory is created unless explicitly selected.
      </p>
      <Button type="submit" disabled={busy}>
        {busy ? "Completing…" : "Complete experiment"}
      </Button>
    </form>
  );
}
