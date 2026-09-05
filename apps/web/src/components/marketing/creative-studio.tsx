"use client";

import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  FileText,
  Lightbulb,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { SpecialistIdentity } from "@/components/marketing/specialist-visuals";
import { StrategicReviewPanel } from "@/components/marketing/strategic-review-panel";
import type {
  MarketingCreativeCouncilEvidenceRow,
  MarketingCreativeCouncilRunRow,
  MarketingCreativeCouncilStageRow,
  MarketingReelBriefVersionRow,
  MarketingReelIdeaRow,
  MarketingStrategicCouncilReviewVersionRow,
  MarketingStrategicReviewRunRow,
  MarketingStrategicReviewStageRow,
  OrganizationRole,
} from "@/lib/supabase/database.types";
import { canMutateMarketing } from "@/modules/marketing/authorization";
import {
  creativeCritiqueSchema,
  hookStrategySchema,
  initialCreativeCouncilActionState,
  reelScriptSchema,
  type CreativeCouncilActionState,
  type CompanyCreativeContext,
} from "@/modules/marketing/creative-council";
import { runCreativeCouncilAction } from "@/modules/marketing/creative-council-actions";

interface EvidenceOption {
  analysisId: string;
  analysisVersion: number;
  competitorName: string;
}

export function CreativeStudio({
  briefs,
  companyContext,
  eligibleEvidence,
  evidence,
  ideas,
  initialIdempotencyKey,
  initialStrategicReviewIdempotencyKey,
  role,
  runs,
  stages,
  strategicReviewRuns,
  strategicReviewStages,
  strategicReviews,
}: {
  briefs: MarketingReelBriefVersionRow[];
  companyContext: CompanyCreativeContext;
  eligibleEvidence: EvidenceOption[];
  evidence: MarketingCreativeCouncilEvidenceRow[];
  ideas: MarketingReelIdeaRow[];
  initialIdempotencyKey: string;
  initialStrategicReviewIdempotencyKey: string;
  role: OrganizationRole;
  runs: MarketingCreativeCouncilRunRow[];
  stages: MarketingCreativeCouncilStageRow[];
  strategicReviewRuns: MarketingStrategicReviewRunRow[];
  strategicReviewStages: MarketingStrategicReviewStageRow[];
  strategicReviews: MarketingStrategicCouncilReviewVersionRow[];
}) {
  const router = useRouter();
  const editable = canMutateMarketing(role);
  const [idempotencyKey, setIdempotencyKey] = useState(initialIdempotencyKey);
  const execute = useCallback(
    async (previous: CreativeCouncilActionState, formData: FormData) => {
      const result = await runCreativeCouncilAction(previous, formData);
      if (result.status === "success") {
        setIdempotencyKey(crypto.randomUUID());
      }
      return result;
    },
    [],
  );
  const [state, action, pending] = useActionState(
    execute,
    initialCreativeCouncilActionState,
  );
  const [ideaId, setIdeaId] = useState(ideas[0]?.id ?? "");
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const idea = ideas.find((item) => item.id === ideaId) ?? null;

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.runId, state.status]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => router.refresh(), 2_500);
    return () => window.clearInterval(timer);
  }, [pending, router]);

  return (
    <div className="space-y-8">
      <section aria-labelledby="council-run-heading" className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold" id="council-run-heading">
            Create a Reel Brief
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            One selected Reel Idea moves through Hook Strategist, Script Writer,
            and Creative Critic. Each stage uses the organization&apos;s current
            AI policy.
          </p>
        </div>

        {ideas.length ? (
          <form action={action} className="space-y-5 border-y py-5">
            <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
            <label className="block max-w-xl">
              <span className="mb-1 block text-sm font-medium">Reel Idea</span>
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                disabled={!editable || pending}
                name="sourceReelIdeaId"
                onChange={(event) => setIdeaId(event.target.value)}
                required
                value={ideaId}
              >
                {ideas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · {item.status}
                  </option>
                ))}
              </select>
            </label>

            <ContextSummary companyContext={companyContext} idea={idea} />

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Competitor evidence (optional, up to 3)
              </legend>
              <p className="text-muted-foreground text-xs">
                Only allowlisted structured observations are shared. Media,
                transcripts, URLs, and extraction artifacts are excluded.
              </p>
              {eligibleEvidence.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {eligibleEvidence.map((option) => {
                    const selected = selectedEvidence.includes(
                      option.analysisId,
                    );
                    return (
                      <label
                        className="flex items-start gap-3 rounded-md border p-3 text-sm"
                        key={option.analysisId}
                      >
                        <input
                          checked={selected}
                          className="mt-0.5 size-4"
                          disabled={
                            !editable ||
                            pending ||
                            (!selected && selectedEvidence.length >= 3)
                          }
                          name="selectedAnalysisId"
                          onChange={(event) =>
                            setSelectedEvidence((current) =>
                              event.target.checked
                                ? [...current, option.analysisId].slice(0, 3)
                                : current.filter(
                                    (id) => id !== option.analysisId,
                                  ),
                            )
                          }
                          type="checkbox"
                          value={option.analysisId}
                        />
                        <span>
                          <span className="block font-medium">
                            {option.competitorName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Completed analysis version {option.analysisVersion}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No eligible completed competitor analyses are available.
                </p>
              )}
            </fieldset>

            {editable ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={pending || !ideaId} type="submit">
                  {pending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {pending
                    ? "Running Creative Council…"
                    : "Run Creative Council"}
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
                VIEWER access is read-only. Existing briefs and history remain
                available below.
              </p>
            )}
          </form>
        ) : (
          <div className="border-y py-10 text-center">
            <Lightbulb className="text-muted-foreground mx-auto size-5" />
            <p className="mt-2 font-medium">Create an active Reel Idea first</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Creative Council V1 always starts from one explicitly selected
              Reel Idea.
            </p>
          </div>
        )}
      </section>

      <StrategicReviewPanel
        briefs={briefs}
        initialIdempotencyKey={initialStrategicReviewIdempotencyKey}
        reviews={strategicReviews}
        role={role}
        runs={strategicReviewRuns}
        stages={strategicReviewStages}
      />

      <CouncilHistory
        briefs={briefs}
        evidence={evidence}
        ideas={ideas}
        runs={runs}
        stages={stages}
      />
    </div>
  );
}

function ContextSummary({
  companyContext,
  idea,
}: {
  companyContext: CompanyCreativeContext;
  idea: MarketingReelIdeaRow | null;
}) {
  const availableCompanySections = Object.entries(companyContext)
    .filter(([, value]) => value !== null)
    .map(([key]) => label(key));
  return (
    <div className="bg-muted/30 grid gap-4 rounded-md border p-4 md:grid-cols-2">
      <div>
        <p className="text-sm font-medium">Selected source</p>
        <p className="mt-1 text-sm">{idea?.title ?? "No Reel Idea selected"}</p>
        <p className="text-muted-foreground mt-1 line-clamp-3 text-xs">
          {idea?.concept || idea?.hook || "No concept or hook recorded."}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium">Bounded Company context</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {availableCompanySections.length
            ? availableCompanySections.join(", ")
            : "No canonical sections are available yet."}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Durable Marketing memory is not retrieved.
        </p>
      </div>
    </div>
  );
}

function CouncilHistory({
  briefs,
  evidence,
  ideas,
  runs,
  stages,
}: {
  briefs: MarketingReelBriefVersionRow[];
  evidence: MarketingCreativeCouncilEvidenceRow[];
  ideas: MarketingReelIdeaRow[];
  runs: MarketingCreativeCouncilRunRow[];
  stages: MarketingCreativeCouncilStageRow[];
}) {
  const ideaTitles = useMemo(
    () => new Map(ideas.map((idea) => [idea.id, idea.title])),
    [ideas],
  );
  const stagesByRun = groupBy(stages, (stage) => stage.council_run_id);
  const briefsByRun = new Map(
    briefs.map((brief) => [brief.council_run_id, brief]),
  );
  const evidenceByRun = groupBy(evidence, (item) => item.council_run_id);

  return (
    <section aria-labelledby="reasoning-history-heading" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" id="reasoning-history-heading">
          Reasoning History
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Safe structured stage outputs and provenance only—never hidden
          prompts, chain-of-thought, or raw provider responses.
        </p>
      </div>
      {runs.length ? (
        <div className="divide-y border-y">
          {runs.map((run) => (
            <RunHistory
              brief={briefsByRun.get(run.id)}
              evidenceCount={evidenceByRun.get(run.id)?.length ?? 0}
              ideaTitle={ideaTitles.get(run.source_reel_idea_id) ?? "Reel Idea"}
              key={run.id}
              run={run}
              stages={stagesByRun.get(run.id) ?? []}
            />
          ))}
        </div>
      ) : (
        <div className="border-y py-10 text-center">
          <FileText className="text-muted-foreground mx-auto size-5" />
          <p className="mt-2 font-medium">No Creative Council runs yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Generated Reel Brief versions will remain available here.
          </p>
        </div>
      )}
    </section>
  );
}

function RunHistory({
  brief,
  evidenceCount,
  ideaTitle,
  run,
  stages,
}: {
  brief?: MarketingReelBriefVersionRow;
  evidenceCount: number;
  ideaTitle: string;
  run: MarketingCreativeCouncilRunRow;
  stages: MarketingCreativeCouncilStageRow[];
}) {
  const stageMap = new Map(stages.map((stage) => [stage.stage, stage]));
  return (
    <article className="py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{ideaTitle}</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {formatDate(run.created_at)} · {evidenceCount} selected competitor
            {evidenceCount === 1 ? " analysis" : " analyses"}
          </p>
        </div>
        <RunStatus status={run.status} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(["HOOK", "SCRIPT", "CRITIQUE"] as const).map((stage) => (
          <StageSummary
            currentStage={run.current_stage}
            key={stage}
            runStatus={run.status}
            stage={stage}
            value={stageMap.get(stage)}
          />
        ))}
      </div>
      {brief ? <ReelBrief brief={brief} /> : null}
      {run.status === "FAILED" ? (
        <p className="text-destructive mt-4 flex items-center gap-2 text-sm">
          <TriangleAlert className="size-4" />
          Stopped at {label(run.failed_stage ?? run.current_stage)} ·{" "}
          {label(run.failure_category ?? "unknown")}
        </p>
      ) : null}
    </article>
  );
}

function StageSummary({
  currentStage,
  runStatus,
  stage,
  value,
}: {
  currentStage: string;
  runStatus: string;
  stage: "HOOK" | "SCRIPT" | "CRITIQUE";
  value?: MarketingCreativeCouncilStageRow;
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
        <SpecialistIdentity
          id={
            stage === "HOOK"
              ? "marketing.hook-strategist"
              : stage === "SCRIPT"
                ? "marketing.script-writer"
                : "marketing.creative-critic"
          }
        />
      </summary>
      {value?.structured_output ? (
        <StageOutput stage={stage} value={value.structured_output} />
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

function StageOutput({
  stage,
  value,
}: {
  stage: "HOOK" | "SCRIPT" | "CRITIQUE";
  value: unknown;
}) {
  if (stage === "HOOK") {
    const parsed = hookStrategySchema.safeParse(value);
    if (!parsed.success) return null;
    return (
      <div className="text-muted-foreground mt-3 space-y-2 text-sm leading-6">
        <p className="text-foreground font-medium">{parsed.data.primaryHook}</p>
        <p>{parsed.data.rationale}</p>
        <p>Confidence: {label(parsed.data.confidence)}</p>
      </div>
    );
  }
  if (stage === "SCRIPT") {
    const parsed = reelScriptSchema.safeParse(value);
    if (!parsed.success) return null;
    return (
      <div className="text-muted-foreground mt-3 space-y-2 text-sm leading-6">
        <p className="text-foreground line-clamp-4 whitespace-pre-wrap">
          {parsed.data.spokenScript}
        </p>
        <p>CTA: {parsed.data.callToAction}</p>
        <p>{parsed.data.sections.length} timed section(s)</p>
      </div>
    );
  }
  const parsed = creativeCritiqueSchema.safeParse(value);
  if (!parsed.success) return null;
  return (
    <div className="text-muted-foreground mt-3 space-y-2 text-sm leading-6">
      <p className="text-foreground font-medium">
        Verdict: {label(parsed.data.verdict)}
      </p>
      <p>{parsed.data.recommendations[0] ?? "No recommendation recorded."}</p>
      <p>Confidence: {label(parsed.data.confidence)}</p>
    </div>
  );
}

function ReelBrief({ brief }: { brief: MarketingReelBriefVersionRow }) {
  const sections = reelScriptSchema.shape.sections.safeParse(
    brief.script_sections,
  );
  const directions = reelScriptSchema.shape.visualDirections.safeParse(
    brief.visual_directions,
  );
  const critique = creativeCritiqueSchema.safeParse(brief.critique);
  return (
    <div className="mt-5 border-t pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">{brief.title}</h4>
        <span className="text-muted-foreground text-xs">
          Version {brief.version_number}
        </span>
      </div>
      <dl className="mt-4 grid gap-4 md:grid-cols-2">
        <BriefField label="Primary hook" value={brief.primary_hook} />
        <BriefField label="Call to action" value={brief.call_to_action} />
        <BriefField label="Spoken script" value={brief.spoken_script} />
        <BriefField label="Caption" value={brief.caption} />
      </dl>
      {sections.success ? (
        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide uppercase">
            Timeline
          </p>
          <ol className="mt-2 space-y-2">
            {sections.data.map((section, index) => (
              <li className="text-sm" key={`${section.startSecond}-${index}`}>
                <span className="text-muted-foreground mr-2 text-xs">
                  {section.startSecond}–{section.endSecond}s
                </span>
                <strong>{section.purpose}:</strong> {section.script}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {directions.success && directions.data.length ? (
        <BriefList label="Visual direction" values={directions.data} />
      ) : null}
      {critique.success ? (
        <div className="bg-muted/30 mt-4 rounded-md border p-4">
          <p className="text-sm font-medium">
            Critic verdict: {label(critique.data.verdict)}
          </p>
          <BriefList
            label="Recommendations"
            values={critique.data.recommendations}
          />
          <BriefList label="Risks" values={critique.data.risks} />
        </div>
      ) : null}
    </div>
  );
}

function BriefField({ label: name, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide uppercase">{name}</dt>
      <dd className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
        {value}
      </dd>
    </div>
  );
}

function BriefList({
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

function RunStatus({ status }: { status: string }) {
  const Icon =
    status === "SUCCEEDED"
      ? CheckCircle2
      : status === "FAILED"
        ? TriangleAlert
        : LoaderCircle;
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
      <Icon
        className={`size-4 ${status === "RUNNING" ? "animate-spin" : ""}`}
      />
      {label(status)}
    </span>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const value = key(item);
    grouped.set(value, [...(grouped.get(value) ?? []), item]);
  }
  return grouped;
}

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}
