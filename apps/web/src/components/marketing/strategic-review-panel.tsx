"use client";

import {
  CheckCircle2,
  Circle,
  FileSearch,
  LoaderCircle,
  Scale,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import type {
  MarketingReelBriefVersionRow,
  MarketingStrategicCouncilReviewVersionRow,
  MarketingStrategicReviewRunRow,
  MarketingStrategicReviewStage,
  MarketingStrategicReviewStageRow,
  OrganizationRole,
} from "@/lib/supabase/database.types";
import { canMutateMarketing } from "@/modules/marketing/authorization";
import { runStrategicReviewAction } from "@/modules/marketing/strategic-review-actions";
import {
  audienceResearchSchema,
  brandReviewSchema,
  challengeReviewSchema,
  contentStrategySchema,
  initialStrategicReviewActionState,
  strategicCouncilReviewSchema,
  type StrategicReviewActionState,
} from "@/modules/marketing/strategic-review";

const reviewStages = [
  "AUDIENCE",
  "BRAND",
  "STRATEGY",
  "CHALLENGE",
  "JUDGE",
] as const;

export function StrategicReviewPanel({
  briefs,
  initialIdempotencyKey,
  reviews,
  role,
  runs,
  stages,
}: {
  briefs: MarketingReelBriefVersionRow[];
  initialIdempotencyKey: string;
  reviews: MarketingStrategicCouncilReviewVersionRow[];
  role: OrganizationRole;
  runs: MarketingStrategicReviewRunRow[];
  stages: MarketingStrategicReviewStageRow[];
}) {
  const router = useRouter();
  const editable = canMutateMarketing(role);
  const [idempotencyKey, setIdempotencyKey] = useState(initialIdempotencyKey);
  const [briefId, setBriefId] = useState(briefs[0]?.id ?? "");
  const execute = useCallback(
    async (previous: StrategicReviewActionState, formData: FormData) => {
      const result = await runStrategicReviewAction(previous, formData);
      if (result.status === "success") setIdempotencyKey(crypto.randomUUID());
      return result;
    },
    [],
  );
  const [state, action, pending] = useActionState(
    execute,
    initialStrategicReviewActionState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.runId, state.status]);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => router.refresh(), 2_500);
    return () => window.clearInterval(timer);
  }, [pending, router]);

  return (
    <section aria-labelledby="strategic-review-heading" className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold" id="strategic-review-heading">
          Strategic review
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Review one exact immutable Reel Brief through Audience, Brand,
          Strategy, Challenge, and Judge. The review never changes its source.
        </p>
      </div>

      {briefs.length ? (
        <form action={action} className="space-y-4 border-y py-5">
          <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
          <label className="block max-w-xl">
            <span className="mb-1 block text-sm font-medium">
              Reel Brief version
            </span>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              disabled={!editable || pending}
              name="sourceReelBriefVersionId"
              onChange={(event) => setBriefId(event.target.value)}
              required
              value={briefId}
            >
              {briefs.map((brief) => (
                <option key={brief.id} value={brief.id}>
                  {brief.title} · Version {brief.version_number}
                </option>
              ))}
            </select>
          </label>
          <p className="text-muted-foreground max-w-2xl text-xs">
            Uses only the selected Reel Brief projection and bounded canonical
            Company context. No memory, competitor media, external research, or
            tools are accessed.
          </p>
          {editable ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={pending || !briefId} type="submit">
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Scale className="size-4" />
                )}
                {pending ? "Running strategic review…" : "Run strategic review"}
              </Button>
              <p
                aria-live="polite"
                className={
                  state.status === "error"
                    ? "text-destructive text-sm"
                    : "text-muted-foreground text-sm"
                }
                role={state.status === "error" ? "alert" : undefined}
              >
                {state.message}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4" />
              VIEWER access is read-only. Strategic review history remains
              available.
            </p>
          )}
        </form>
      ) : (
        <div className="border-y py-8 text-center">
          <FileSearch className="text-muted-foreground mx-auto size-5" />
          <p className="mt-2 font-medium">Generate a Reel Brief first</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Strategic Review starts from one completed immutable brief version.
          </p>
        </div>
      )}

      <StrategicReviewHistory
        briefs={briefs}
        reviews={reviews}
        runs={runs}
        stages={stages}
      />
    </section>
  );
}

function StrategicReviewHistory({
  briefs,
  reviews,
  runs,
  stages,
}: {
  briefs: MarketingReelBriefVersionRow[];
  reviews: MarketingStrategicCouncilReviewVersionRow[];
  runs: MarketingStrategicReviewRunRow[];
  stages: MarketingStrategicReviewStageRow[];
}) {
  const briefById = useMemo(
    () => new Map(briefs.map((brief) => [brief.id, brief])),
    [briefs],
  );
  const stagesByRun = groupBy(stages, (stage) => stage.strategic_review_run_id);
  const reviewsByRun = new Map(
    reviews.map((review) => [review.strategic_review_run_id, review]),
  );
  return runs.length ? (
    <div className="divide-y border-y">
      {runs.map((run) => {
        const brief = briefById.get(run.source_reel_brief_version_id);
        return (
          <article className="py-5" key={run.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">
                  {brief?.title ?? "Reel Brief"} · Source version{" "}
                  {brief?.version_number ?? "—"}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatDate(run.created_at)} · Workflow {run.workflow_version}
                </p>
              </div>
              <ReviewStatus status={run.status} />
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-5">
              {reviewStages.map((stage) => (
                <ReviewStage
                  currentStage={run.current_stage}
                  key={stage}
                  runStatus={run.status}
                  stage={stage}
                  value={(stagesByRun.get(run.id) ?? []).find(
                    (item) => item.stage === stage,
                  )}
                />
              ))}
            </div>
            {reviewsByRun.get(run.id) ? (
              <FinalReview review={reviewsByRun.get(run.id)!} />
            ) : null}
            {run.status === "FAILED" ? (
              <p className="text-destructive mt-4 flex items-center gap-2 text-sm">
                <TriangleAlert className="size-4" />
                Stopped at {label(run.failed_stage ?? run.current_stage)} ·{" "}
                {label(run.failure_category ?? "unknown")}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  ) : (
    <p className="text-muted-foreground border-y py-8 text-center text-sm">
      No strategic reviews yet.
    </p>
  );
}

function ReviewStage({
  currentStage,
  runStatus,
  stage,
  value,
}: {
  currentStage: MarketingStrategicReviewStage;
  runStatus: string;
  stage: (typeof reviewStages)[number];
  value?: MarketingStrategicReviewStageRow;
}) {
  const running = runStatus === "RUNNING" && currentStage === stage;
  return (
    <details className="rounded-md border p-3" open={Boolean(value)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
        {value?.status === "SUCCEEDED" ? (
          <CheckCircle2 className="text-primary size-4" />
        ) : running ? (
          <LoaderCircle className="text-primary size-4 animate-spin" />
        ) : (
          <Circle className="text-muted-foreground size-4" />
        )}
        {stageName(stage)}
      </summary>
      {value?.structured_output ? (
        <ReviewStageOutput stage={stage} value={value.structured_output} />
      ) : (
        <p className="text-muted-foreground mt-2 text-xs">
          {value?.status === "FAILED"
            ? `Failed safely: ${label(value.failure_category ?? "unknown")}`
            : running
              ? "In progress"
              : "Not started"}
        </p>
      )}
    </details>
  );
}

function ReviewStageOutput({
  stage,
  value,
}: {
  stage: (typeof reviewStages)[number];
  value: unknown;
}) {
  const parsed =
    stage === "AUDIENCE"
      ? audienceResearchSchema.safeParse(value)
      : stage === "BRAND"
        ? brandReviewSchema.safeParse(value)
        : stage === "STRATEGY"
          ? contentStrategySchema.safeParse(value)
          : stage === "CHALLENGE"
            ? challengeReviewSchema.safeParse(value)
            : strategicCouncilReviewSchema.safeParse(value);
  if (!parsed.success) return null;
  if (stage === "AUDIENCE") {
    const output = audienceResearchSchema.parse(parsed.data);
    return (
      <Summary
        confidence={output.confidence}
        text={`${label(output.evidenceStatus)} · ${output.summary}`}
      />
    );
  }
  if (stage === "BRAND") {
    const output = brandReviewSchema.parse(parsed.data);
    return (
      <Summary
        confidence={output.confidence}
        text={`${label(output.evidenceStatus)} · ${output.summary}`}
      />
    );
  }
  if (stage === "STRATEGY") {
    const output = contentStrategySchema.parse(parsed.data);
    return (
      <Summary
        confidence={output.confidence}
        text={`${label(output.priorityChanges[0]?.evidenceStatus ?? "UNSUPPORTED_BY_SUPPLIED_EVIDENCE")} · ${output.overallRecommendation}`}
      />
    );
  }
  if (stage === "CHALLENGE") {
    const output = challengeReviewSchema.parse(parsed.data);
    return (
      <Summary
        confidence={output.confidence}
        text={`${label(output.overallSeverity)} · ${label(output.challenges[0]?.evidenceStatus ?? "SUPPORTED")} · ${output.summary}`}
      />
    );
  }
  const output = strategicCouncilReviewSchema.parse(parsed.data);
  return (
    <Summary confidence={output.confidence} text={output.finalAssessment} />
  );
}

function Summary({ confidence, text }: { confidence: string; text: string }) {
  return (
    <div className="text-muted-foreground mt-3 space-y-2 text-xs">
      <p className="text-foreground line-clamp-5">{text}</p>
      <p>Confidence: {label(confidence)}</p>
    </div>
  );
}

function FinalReview({
  review,
}: {
  review: MarketingStrategicCouncilReviewVersionRow;
}) {
  const parsed = strategicCouncilReviewSchema.safeParse(
    review.structured_review,
  );
  if (!parsed.success) return null;
  return (
    <div className="bg-muted/30 mt-5 border-y p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">Strategic Council Review</h4>
        <span className="text-muted-foreground text-xs">
          Review version {review.version_number}
        </span>
      </div>
      <p className="mt-3 text-sm">{parsed.data.finalAssessment}</p>
      <ReviewList
        label="Prioritized recommendations"
        values={parsed.data.approvedRecommendations.map(
          (item) =>
            `${item.recommendationId} · ${label(item.evidenceStatus)}: ${item.recommendation}`,
        )}
      />
      <ReviewList
        label="Challenge dispositions"
        values={parsed.data.challengeDispositions.map(
          (item) =>
            `${item.challengeReferenceId} · ${label(item.disposition)}: ${item.rationale}`,
        )}
      />
      <ReviewList
        label="Rejected or revised"
        values={parsed.data.rejectedOrRevisedRecommendations.map(
          (item) =>
            `${item.recommendationId} · ${label(item.action)}: ${item.rationale}`,
        )}
      />
      <ReviewList label="Risks" values={parsed.data.risks} />
      <ReviewList
        label="Unresolved unknowns"
        values={parsed.data.unresolvedUnknowns}
      />
      <ReviewList
        label="Verification needs"
        values={parsed.data.verificationNeeds}
      />
      <p className="text-muted-foreground mt-3 text-xs">
        Confidence: {label(parsed.data.confidence)} ·{" "}
        {parsed.data.challengeDispositions.length} challenge disposition(s)
      </p>
    </div>
  );
}

function ReviewList({
  label: name,
  values,
}: {
  label: string;
  values: string[];
}) {
  if (!values.length) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-medium tracking-wide uppercase">{name}</p>
      <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

function ReviewStatus({ status }: { status: string }) {
  const Icon =
    status === "SUCCEEDED"
      ? CheckCircle2
      : status === "FAILED"
        ? TriangleAlert
        : LoaderCircle;
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <Icon
        className={status === "RUNNING" ? "size-4 animate-spin" : "size-4"}
      />
      {label(status)}
    </span>
  );
}

function stageName(stage: (typeof reviewStages)[number]) {
  return stage === "AUDIENCE"
    ? "Audience"
    : stage === "BRAND"
      ? "Brand"
      : stage === "STRATEGY"
        ? "Strategy"
        : stage === "CHALLENGE"
          ? "Challenge"
          : "Judge";
}

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function groupBy<T, K>(items: T[], key: (item: T) => K) {
  const grouped = new Map<K, T[]>();
  for (const item of items) {
    const value = key(item);
    grouped.set(value, [...(grouped.get(value) ?? []), item]);
  }
  return grouped;
}
