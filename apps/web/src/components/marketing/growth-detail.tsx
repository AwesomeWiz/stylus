"use client";
import Link from "next/link";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ViewerLocalDateTime } from "@/components/ui/viewer-local-date-time";
import {
  growthLabel,
  growthLinkColumn,
  type GrowthKind,
} from "@/modules/marketing/growth";
import type { GrowthDetail } from "@/modules/marketing/server/growth-data";
import {
  ChoiceLink,
  GrowthMutationButton,
  SourceLinkForm,
  ExecutionLinkForm,
} from "./growth-links";
export function GrowthDetailContent({
  kind,
  detail,
  canEdit,
  owner,
  onOpen,
  headingRef,
}: {
  kind: GrowthKind;
  detail: GrowthDetail;
  canEdit: boolean;
  owner: (id: string | null | undefined) => string;
  onOpen: (next: "edit" | "evaluate" | "learning" | "memory") => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const record = detail.record;
  return (
    <>
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold break-words outline-none"
        >
          {record.title}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {record.status ? growthLabel(record.status) : "Learning"}
          {record.confidence
            ? " · " + growthLabel(record.confidence) + " confidence"
            : ""}
          {record.archived_at ? " · Archived" : ""}
        </p>
        {kind !== "learning" ? (
          <p className="text-muted-foreground mt-1 text-sm">
            Owner: {owner(record.owner_id)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {canEdit ? (
          <Button variant="secondary" onClick={() => onOpen("edit")}>
            Edit {kind}
          </Button>
        ) : null}
        {canEdit && kind === "hypothesis" && !record.archived_at ? (
          <Link
            className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium"
            href={`/apps/marketing/experiments?create=1&hypothesis=${record.id}`}
          >
            Create Experiment
          </Link>
        ) : null}
        {canEdit &&
        kind === "experiment" &&
        record.status === "EVALUATING" &&
        !record.archived_at ? (
          <Button onClick={() => onOpen("evaluate")}>
            Evaluate experiment
          </Button>
        ) : null}
      </div>
      {kind === "hypothesis" ? (
        <p className="max-w-[72ch] text-sm leading-7 break-words whitespace-pre-wrap">
          {record.statement}
        </p>
      ) : null}
      {detail.hypothesis && kind !== "hypothesis" ? (
        <section className="space-y-2 border-t pt-4">
          <h3 className="font-medium">Based on Hypothesis</h3>
          <Link
            className="text-primary inline-block min-h-11 py-2 text-sm underline"
            href={`/apps/marketing/hypotheses?item=${detail.hypothesis.id}`}
          >
            {detail.hypothesis.title}
          </Link>
          <p className="text-muted-foreground text-sm break-words whitespace-pre-wrap">
            {detail.experiment?.evaluated_hypothesis_statement ??
              detail.hypothesis.statement}
          </p>
          {detail.experiment?.status === "COMPLETE" ? (
            <p className="text-muted-foreground text-xs">
              Statement and source identities at evaluation; the current
              Hypothesis may have changed.
            </p>
          ) : null}
        </section>
      ) : null}
      {kind === "experiment" ? (
        <>
          <Prose title="Test plan" text={record.test_plan} />
          <Prose
            title="Success / evaluation criteria"
            text={record.success_criteria}
          />
          <p className="text-muted-foreground text-sm">
            {record.starts_on ? "Start: " + record.starts_on : "Start not set"}{" "}
            ·{" "}
            {record.ends_on
              ? "Target end: " + record.ends_on
              : "Target end not set"}
          </p>
          {record.status === "COMPLETE" ? (
            <section className="space-y-2 border-t pt-4">
              <h3 className="font-medium">
                Result · {growthLabel(record.outcome ?? "")}
              </h3>
              <p className="text-sm break-words whitespace-pre-wrap">
                {record.result_summary}
              </p>
              <p className="text-muted-foreground text-xs">
                Reviewed{" "}
                {record.evaluated_at ? (
                  <ViewerLocalDateTime value={record.evaluated_at} />
                ) : (
                  ""
                )}{" "}
                by {owner(record.evaluated_by)}. Evaluation is retained
                unchanged.
              </p>
            </section>
          ) : null}
        </>
      ) : null}
      {kind === "learning" ? (
        <>
          <Prose title="Accepted conclusion" text={record.conclusion} />
          {detail.experiment ? (
            <section className="space-y-2 border-t pt-4">
              <h3 className="font-medium">Produced by Experiment</h3>
              <Link
                className="text-primary inline-block min-h-11 py-2 text-sm underline"
                href={`/apps/marketing/experiments?item=${detail.experiment.id}`}
              >
                {detail.experiment.title}
              </Link>
              <p className="text-sm">
                {growthLabel(detail.experiment.outcome ?? "")}:{" "}
                {detail.experiment.result_summary}
              </p>
            </section>
          ) : null}
        </>
      ) : null}
      <section className="space-y-3 border-t pt-4">
        <h3 className="font-medium">
          {kind === "hypothesis"
            ? "Why is this worth testing?"
            : "Evidence at the source"}
        </h3>
        <ul className="space-y-3">
          {detail.sources.map(({ row, choice }) => (
            <li key={row.id}>
              <ChoiceLink choice={choice} />
              {canEdit &&
              kind === "hypothesis" &&
              !record.archived_at &&
              choice.source ? (
                <GrowthMutationButton
                  input={{
                    operation: "source",
                    hypothesisId: record.id,
                    source: choice.source,
                    archived: true,
                  }}
                  label="Remove source"
                />
              ) : null}
            </li>
          ))}
        </ul>
        {!detail.sources.length ? (
          <p className="text-muted-foreground text-sm">
            No source was explicitly linked.
          </p>
        ) : null}
        {canEdit && kind === "hypothesis" && !record.archived_at ? (
          <SourceLinkForm hypothesisId={record.id} />
        ) : null}
      </section>
      {kind === "hypothesis" ? (
        <section className="space-y-2 border-t pt-4">
          <h3 className="font-medium">Experiments</h3>
          <ul>
            {detail.experiments.map((e) => (
              <li key={e.id}>
                <Link
                  className="text-primary inline-block min-h-11 py-2 text-sm underline"
                  href={`/apps/marketing/experiments?item=${e.id}`}
                >
                  {e.title} · {growthLabel(e.status ?? "")}
                  {e.archived_at ? " · Archived" : ""}
                </Link>
              </li>
            ))}
          </ul>
          {!detail.experiments.length ? (
            <p className="text-muted-foreground text-sm">
              No linked experiments yet.
            </p>
          ) : null}
          {detail.experiments.length === 25 ? (
            <Link
              className="text-sm underline"
              href="/apps/marketing/experiments"
            >
              Browse all experiments
            </Link>
          ) : null}
        </section>
      ) : null}
      {detail.experiment ? (
        <section className="space-y-3 border-t pt-4">
          <h3 className="font-medium">Executed through / measured by</h3>
          <ul className="space-y-3">
            {detail.links.map(({ row, kind: linkKind, choice }) => (
              <li key={row.id}>
                <ChoiceLink choice={choice} />
                {canEdit &&
                kind === "experiment" &&
                !record.archived_at &&
                !["COMPLETE", "CANCELLED"].includes(record.status ?? "") ? (
                  <GrowthMutationButton
                    input={{
                      operation: "link",
                      experimentId: record.id,
                      kind: linkKind,
                      targetId: row[growthLinkColumn[linkKind]],
                      archived: true,
                    }}
                    label="Remove link"
                  />
                ) : null}
              </li>
            ))}
          </ul>
          {!detail.links.length ? (
            <p className="text-muted-foreground text-sm">
              No execution or performance record has been explicitly linked.
            </p>
          ) : null}
          {canEdit &&
          kind === "experiment" &&
          !record.archived_at &&
          !["COMPLETE", "CANCELLED"].includes(record.status ?? "") ? (
            <ExecutionLinkForm experimentId={record.id} />
          ) : null}
        </section>
      ) : null}
      {kind === "experiment" ? (
        <section className="space-y-3 border-t pt-4">
          <h3 className="font-medium">Learning</h3>
          {detail.learning ? (
            <Link
              className="text-primary inline-block min-h-11 py-2 text-sm underline"
              href={`/apps/marketing/learn?item=${detail.learning.id}`}
            >
              {detail.learning.title}
              {detail.learning.archived_at ? " · Archived" : ""}
            </Link>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                No conclusion has been recorded. Inconclusive results do not
                require an invented insight.
              </p>
              {canEdit &&
              record.status === "COMPLETE" &&
              !record.archived_at ? (
                <Button variant="secondary" onClick={() => onOpen("learning")}>
                  Record Learning
                </Button>
              ) : null}
            </>
          )}
        </section>
      ) : null}
      {kind === "learning" ? (
        <section className="space-y-3 border-t pt-4">
          <h3 className="font-medium">Company Memory</h3>
          {detail.memory ? (
            <>
              <p className="text-sm">
                Explicitly added: {detail.memory.title}
                {detail.memory.archived_at ? " · Archived" : ""}
              </p>
              <Link
                className="text-primary inline-block min-h-11 py-2 text-sm underline"
                href="/memory"
              >
                Review Company Memory
              </Link>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                This Learning is working information. It has not been promoted.
              </p>
              {canEdit && !record.archived_at ? (
                <Button variant="secondary" onClick={() => onOpen("memory")}>
                  Add to Company Memory
                </Button>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
function Prose({ title, text }: { title: string; text?: string | null }) {
  return (
    <section className="space-y-2 border-t pt-4">
      <h3 className="font-medium">{title}</h3>
      <p className="max-w-[72ch] text-sm leading-7 break-words whitespace-pre-wrap">
        {text || "Not recorded"}
      </p>
    </section>
  );
}
