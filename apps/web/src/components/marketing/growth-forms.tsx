"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { TaskMember } from "@/lib/supabase/database.types";
import { saveGrowth } from "./growth-requests";
import {
  experimentStatuses,
  growthConfidence,
  growthLabel,
  growthRoutes,
  hypothesisStatuses,
  type GrowthKind,
  type GrowthRow,
} from "@/modules/marketing/growth";
import type { GrowthChoice } from "@/modules/marketing/server/growth-data";
import { GrowthChoicePicker } from "./growth-choice-picker";

export const growthControl =
  "bg-background mt-1 min-h-11 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-70";
export function recordFields(
  kind: GrowthKind,
  record?: GrowthRow,
  hypothesisId = "",
): Record<string, string | boolean> {
  if (kind === "hypothesis")
    return {
      title: record?.title ?? "",
      statement: record?.statement ?? "",
      status: record?.status ?? "DRAFT",
      confidence: record?.confidence ?? "",
      ownerId: record?.owner_id ?? "",
      archived: !!record?.archived_at,
    };
  if (kind === "experiment")
    return {
      title: record?.title ?? "",
      hypothesisId: record?.hypothesis_id ?? hypothesisId,
      testPlan: record?.test_plan ?? "",
      successCriteria: record?.success_criteria ?? "",
      status: record?.status ?? "DRAFT",
      ownerId: record?.owner_id ?? "",
      startsOn: record?.starts_on ?? "",
      endsOn: record?.ends_on ?? "",
      archived: !!record?.archived_at,
    };
  return {
    title: record?.title ?? "",
    conclusion: record?.conclusion ?? "",
    confidence: record?.confidence ?? "MEDIUM",
    archived: !!record?.archived_at,
  };
}
export function GrowthRecordForm({
  kind,
  record,
  members,
  hypothesis,
  experimentId,
  source,
  onSaved,
}: {
  kind: GrowthKind;
  record?: GrowthRow;
  members: TaskMember[];
  hypothesis?: GrowthChoice | null;
  experimentId?: string;
  source?: GrowthChoice | null;
  onSaved: () => void;
}) {
  const router = useRouter(),
    [id] = useState(() => record?.id ?? crypto.randomUUID());
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
      recordFields(kind, record, hypothesis?.id),
    ),
    [selectedHypothesis, setSelectedHypothesis] = useState(hypothesis),
    [selectedSource, setSelectedSource] = useState(source),
    [sourceKind, setSourceKind] = useState("evidence"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const frozen = kind === "experiment" && record?.status === "COMPLETE";
  function text(
    key: string,
    label: string,
    max: number,
    required = false,
    multiline = false,
  ) {
    return (
      <label className="block text-sm" key={key}>
        {label}
        {required ? " *" : ""}
        {multiline ? (
          <textarea
            className={growthControl + " min-h-28"}
            maxLength={max}
            required={required}
            readOnly={frozen}
            value={String(values[key] ?? "")}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          />
        ) : (
          <input
            className={growthControl}
            maxLength={max}
            required={required}
            readOnly={frozen}
            value={String(values[key] ?? "")}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          />
        )}
      </label>
    );
  }
  async function save() {
    setBusy(true);
    setError("");
    const result = await saveGrowth({
      operation: kind,
      id,
      fields: values,
      revision: record?.updated_at ?? null,
      ...(kind === "learning"
        ? { experimentId: record?.experiment_id ?? experimentId }
        : {}),
      ...(kind === "hypothesis" && !record && selectedSource?.source
        ? { source: selectedSource.source }
        : {}),
    });
    setBusy(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    onSaved();
    router.push(`${growthRoutes[kind]}?item=${id}`);
    router.refresh();
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) void save();
      }}
    >
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {text("title", "Title", 160, true)}
      {kind === "hypothesis" ? (
        text("statement", "Testable belief", 4000, true, true)
      ) : kind === "experiment" ? (
        <>
          {record || selectedHypothesis ? (
            <div className="text-sm">
              <p className="font-medium">Based on Hypothesis</p>
              <p>{selectedHypothesis?.title ?? "Linked Hypothesis"}</p>
              {!record ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedHypothesis(null);
                    setValues({ ...values, hypothesisId: "" });
                  }}
                >
                  Choose another
                </Button>
              ) : null}
            </div>
          ) : (
            <GrowthChoicePicker
              kind="hypothesis"
              label="Choose a Hypothesis"
              onSelect={(choice) => {
                setSelectedHypothesis(choice);
                setValues({ ...values, hypothesisId: choice.id });
              }}
            />
          )}
          {text("testPlan", "Test plan", 4000, false, true)}
          {text(
            "successCriteria",
            "Success / evaluation criteria",
            2000,
            false,
            true,
          )}
          <p className="text-muted-foreground text-xs">
            Qualitative criteria are valid. Criteria are required before
            Running; an outcome is never inferred automatically.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["startsOn", "Start date"],
              ["endsOn", "Target end date"],
            ].map(([key, label]) => (
              <label key={key} className="text-sm">
                {label}
                <input
                  type="date"
                  className={growthControl}
                  readOnly={frozen}
                  value={String(values[key!] ?? "")}
                  onChange={(e) =>
                    setValues({ ...values, [key!]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
        </>
      ) : (
        text("conclusion", "Accepted conclusion", 4000, true, true)
      )}
      {kind !== "learning" ? (
        <label className="block text-sm">
          Status
          <select
            className={growthControl}
            disabled={frozen}
            value={String(values.status)}
            onChange={(e) => setValues({ ...values, status: e.target.value })}
          >
            {(kind === "hypothesis"
              ? hypothesisStatuses
              : record
                ? experimentStatuses.filter((s) => s !== "COMPLETE" || frozen)
                : ["DRAFT", "PLANNED"]
            ).map((s) => (
              <option key={s} value={s}>
                {growthLabel(s)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {kind !== "experiment" ? (
        <label className="block text-sm">
          Confidence
          <select
            className={growthControl}
            value={String(values.confidence)}
            onChange={(e) =>
              setValues({ ...values, confidence: e.target.value })
            }
          >
            {kind === "hypothesis" ? (
              <option value="">Unspecified</option>
            ) : null}
            {growthConfidence.map((c) => (
              <option key={c} value={c}>
                {growthLabel(c)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {kind !== "learning" ? (
        <label className="block text-sm">
          Owner
          <select
            className={growthControl}
            disabled={frozen}
            value={String(values.ownerId)}
            onChange={(e) => setValues({ ...values, ownerId: e.target.value })}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.member_user_id} value={m.member_user_id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {kind === "hypothesis" && !record ? (
        <section className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">
            Why is this worth testing? (optional)
          </p>
          {selectedSource ? (
            <>
              <p className="text-sm">{selectedSource.title}</p>
              <p className="text-muted-foreground text-xs">
                {selectedSource.detail}
              </p>
              <Button variant="ghost" onClick={() => setSelectedSource(null)}>
                Remove source
              </Button>
            </>
          ) : (
            <>
              <label className="block text-sm">
                Source type
                <select
                  className={growthControl}
                  value={sourceKind}
                  onChange={(e) => setSourceKind(e.target.value)}
                >
                  <option value="evidence">Research Evidence</option>
                  <option value="note">Manual Research Note</option>
                  <option value="opportunity">
                    Content Opportunity candidate
                  </option>
                </select>
              </label>
              <GrowthChoicePicker
                key={sourceKind}
                kind={sourceKind}
                label="Find a source"
                onSelect={setSelectedSource}
              />
            </>
          )}
          <p className="text-muted-foreground text-xs">
            A citation gives context; it does not establish that this belief is
            true.
          </p>
        </section>
      ) : null}
      {record ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(values.archived)}
            onChange={(e) =>
              setValues({ ...values, archived: e.target.checked })
            }
          />
          Archived
        </label>
      ) : null}
      <Button
        type="submit"
        disabled={busy || (kind === "experiment" && !values.hypothesisId)}
      >
        {busy ? "Saving…" : record ? "Save changes" : `Create ${kind}`}
      </Button>
    </form>
  );
}
